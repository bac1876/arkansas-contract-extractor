/**
 * Seller Net Sheet Calculator
 * Calculates the net proceeds for a seller based on contract data
 */

export interface SellerNetSheetInput {
  // From contract extraction
  purchase_price: number;
  cash_amount?: number; // For cash transactions (3C)
  seller_concessions?: string | number; // From para5_custom_text or seller_pays_buyer_costs
  closing_date?: string;
  home_warranty?: string; // YES/NO
  warranty_amount?: number;
  title_option?: string; // A or B
  para32_other_terms?: string; // Contains buyer agency fee info
  buyer_agency_fee?: string; // Extracted buyer agency fee (e.g., "3.0%" or "10000")
  para11_survey_option?: string; // A, B, or C
  para11_survey_paid_by?: string; // Seller, Buyer, or Equally
  
  // Additional inputs (may need to be provided)
  annual_taxes?: number; // Annual property tax amount
  seller_commission_percent?: number; // Default 3%
}

export interface SellerNetSheetOutput {
  sales_price: number;
  seller_concessions: number;
  taxes_prorated: number;
  commission_seller: number;
  buyer_agency_fees: number;
  closing_fee: number;
  title_search: number;
  title_insurance: number;
  title_recording_fees: number;
  pest_transfer: number;
  tax_stamps: number;
  home_warranty: number;
  survey_cost: number;
  survey_note?: string; // Note about estimate
  total_costs: number;
  cash_to_seller: number;
  
  // Calculation details
  calculation_date: string;
  days_of_tax: number;
  tax_per_day: number;
}

export class SellerNetSheetCalculator {
  
  // Standard fees
  private readonly CLOSING_FEE = 400;
  private readonly TITLE_SEARCH = 300;
  private readonly TITLE_RECORDING_FEES = 100;
  private readonly PEST_TRANSFER = 450;
  private readonly TAX_STAMP_RATE = 0.0033; // 0.33% divided by 2
  private readonly DEFAULT_WARRANTY = 695;
  private readonly DEFAULT_SELLER_COMMISSION = 0.03; // 3%
  
  // Title insurance rates from the Google Sheet
  private getTitleInsurance(purchasePrice: number, option: string): number {
    // Title insurance rate table (updated from spreadsheet)
    const rateTable = [
      { min: 0, max: 50000, ownerPolicy: 100, lenderPolicy: 200 },
      { min: 50001, max: 99999, ownerPolicy: 200, lenderPolicy: 325 },
      { min: 100000, max: 149999, ownerPolicy: 250, lenderPolicy: 425 },
      { min: 150000, max: 199999, ownerPolicy: 350, lenderPolicy: 525 },
      { min: 200000, max: 249999, ownerPolicy: 450, lenderPolicy: 625 },
      { min: 250000, max: 299999, ownerPolicy: 500, lenderPolicy: 725 },
      { min: 300000, max: 349999, ownerPolicy: 550, lenderPolicy: 825 },
      { min: 350000, max: 399999, ownerPolicy: 600, lenderPolicy: 925 },
      { min: 400000, max: 449999, ownerPolicy: 700, lenderPolicy: 1025 },
      { min: 450000, max: 499999, ownerPolicy: 800, lenderPolicy: 1125 },
      { min: 500000, max: 549000, ownerPolicy: 900, lenderPolicy: 1125 },
      { min: 549001, max: 599999, ownerPolicy: 1000, lenderPolicy: 1325 },
      { min: 600000, max: 649999, ownerPolicy: 1100, lenderPolicy: 1425 },
      { min: 650000, max: 699999, ownerPolicy: 1200, lenderPolicy: 1525 },
      { min: 700000, max: 749999, ownerPolicy: 1300, lenderPolicy: 1625 },
      { min: 750000, max: 799999, ownerPolicy: 1400, lenderPolicy: 1725 },
      { min: 800000, max: 849999, ownerPolicy: 1500, lenderPolicy: 1825 },
      { min: 850000, max: 899999, ownerPolicy: 1600, lenderPolicy: 1925 },
      { min: 900000, max: 949000, ownerPolicy: 1700, lenderPolicy: 2025 },
      { min: 949001, max: 999999, ownerPolicy: 1800, lenderPolicy: 2125 }
    ];
    
    // Find the appropriate rate based on purchase price
    const rate = rateTable.find(r => purchasePrice >= r.min && purchasePrice <= r.max);
    
    if (!rate) {
      // For prices above $1M, use a percentage calculation
      if (purchasePrice >= 1000000) {
        const baseRate = 1800 + ((purchasePrice - 999999) * 0.001);
        // Option A gets the higher amount (lender), B gets the base amount (owner)
        return option === 'A' ? Math.round(baseRate * 1.18) : Math.round(baseRate);
      }
      // Default fallback - Option A = Lender (higher), Option B = Owner (lower)
      return option === 'A' ? 725 : 500;
    }
    
    // Return based on option selected in Para 10
    // Option A = Lender's Policy (Column D in Title Fees doc)
    // Option B = Owner's Policy (Column C in Title Fees doc)
    // Option A uses lenderPolicy, Option B uses ownerPolicy
    return option === 'A' ? rate.lenderPolicy : rate.ownerPolicy;
  }
  
  private extractSellerConcessions(para5Text?: string | number): number {
    if (!para5Text) return 0;
    
    // If it's already a number, return it directly
    if (typeof para5Text === 'number') {
      return para5Text;
    }
    
    // If it's just a number string like "5000", parse it directly
    if (/^\d+(\.\d+)?$/.test(para5Text.trim())) {
      return parseFloat(para5Text);
    }
    
    // Look for dollar amounts in the text
    const matches = para5Text.match(/\$([0-9,]+(?:\.\d{2})?)/g);
    if (matches && matches.length > 0) {
      // Find the buyer's closing cost amount
      for (const match of matches) {
        const amount = parseFloat(match.replace(/[$,]/g, ''));
        // Check for common phrases indicating seller concessions
        if (para5Text.toLowerCase().includes('buyer') && 
            (para5Text.toLowerCase().includes('closing cost') || 
             para5Text.toLowerCase().includes('concession') ||
             para5Text.toLowerCase().includes('prepaid'))) {
          return amount;
        }
      }
      // If no specific buyer mention, return the first amount found
      return parseFloat(matches[0].replace(/[$,]/g, ''));
    }
    
    return 0;
  }
  
  private extractBuyerAgencyFees(para32Text?: string, purchasePrice?: number): number {
    if (!para32Text || !purchasePrice) {
      return 0;
    }
    
    // Check if it mentions buyer agency fees
    const lowerText = para32Text.toLowerCase();
    const hasBuyerAgency = lowerText.includes('buyer agency') || lowerText.includes('buyer\'s agency') || 
        lowerText.includes('buyer agent') || lowerText.includes('buyer\'s agent');
    
    if (hasBuyerAgency) {
      // Look for percentage - handle both "3%" and "3 %"
      const percentMatch = para32Text.match(/(\d+(?:\.\d+)?)\s*%/i);
      
      if (percentMatch) {
        const percent = parseFloat(percentMatch[1]) / 100;
        const amount = Math.round(purchasePrice * percent);
        return amount;
      }
      
      // Look for dollar amount
      const dollarMatch = para32Text.match(/\$([0-9,]+(?:\.\d{2})?)/);
      
      if (dollarMatch) {
        const amount = parseFloat(dollarMatch[1].replace(/,/g, ''));
        return amount;
      }
    }
    
    return 0;
  }
  
  private calculateProratedTaxes(
    annualTaxes: number, 
    closingDate: string
  ): { amount: number; days: number; perDay: number } {
    if (!annualTaxes || !closingDate) {
      return { amount: 0, days: 0, perDay: 0 };
    }
    
    const closeDate = new Date(closingDate);
    const yearStart = new Date(closeDate.getFullYear(), 0, 1);
    
    // Calculate days from start of year to closing
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysSinceYearStart = Math.floor((closeDate.getTime() - yearStart.getTime()) / msPerDay) + 1;
    
    const taxPerDay = annualTaxes / 365;
    const proratedAmount = taxPerDay * daysSinceYearStart;
    
    return {
      amount: Math.round(proratedAmount * 100) / 100,
      days: daysSinceYearStart,
      perDay: Math.round(taxPerDay * 100) / 100
    };
  }
  
  calculate(input: SellerNetSheetInput): SellerNetSheetOutput {
    // Extract values from contract data
    // Use purchase_price for financed deals (3A) or cash_amount for cash deals (3C)
    const salesPrice = input.purchase_price || input.cash_amount || 0;
    const sellerConcessions = this.extractSellerConcessions(input.seller_concessions);
    
    // Calculate prorated taxes
    const taxCalc = this.calculateProratedTaxes(
      input.annual_taxes || 0,
      input.closing_date || new Date().toISOString()
    );
    
    // Calculate commissions
    const commissionPercent = input.seller_commission_percent || this.DEFAULT_SELLER_COMMISSION;
    const commissionSeller = Math.round(salesPrice * commissionPercent);
    
    // Calculate buyer agency fees
    let buyerAgencyFees = 0;
    
    // First, check if buyer_agency_fee was directly extracted
    if (input.buyer_agency_fee) {
      const feeString = input.buyer_agency_fee.toString();
      
      // Check if it's a percentage
      if (feeString.includes('%')) {
        const percent = parseFloat(feeString.replace('%', '')) / 100;
        buyerAgencyFees = Math.round(salesPrice * percent);
      } 
      // Check if it's a dollar amount
      else {
        const amount = parseFloat(feeString.replace(/[$,]/g, ''));
        if (!isNaN(amount)) {
          buyerAgencyFees = Math.round(amount);
        }
      }
    }
    
    // If no direct buyer_agency_fee, try to extract from para32_other_terms
    if (buyerAgencyFees === 0) {
      buyerAgencyFees = this.extractBuyerAgencyFees(input.para32_other_terms, salesPrice);
    }
    
    // Standard fees
    const closingFee = this.CLOSING_FEE;
    const titleSearch = this.TITLE_SEARCH;
    const titleInsurance = this.getTitleInsurance(salesPrice, input.title_option || 'B');
    const titleRecordingFees = this.TITLE_RECORDING_FEES;
    const pestTransfer = this.PEST_TRANSFER;
    
    // Tax stamps calculation
    const taxStamps = Math.round((salesPrice * this.TAX_STAMP_RATE / 2) * 100) / 100;
    
    // Home warranty
    let homeWarranty = 0;
    // Check if home warranty is provided (options B or C) and seller pays
    if ((input.para15_home_warranty === 'B' || input.para15_home_warranty === 'C') && 
        input.para15_warranty_paid_by === 'Seller') {
      homeWarranty = input.para15_warranty_cost || input.warranty_amount || this.DEFAULT_WARRANTY;
    }
    // Legacy support for old format
    else if (input.home_warranty === 'YES') {
      homeWarranty = input.warranty_amount || this.DEFAULT_WARRANTY;
    }
    
    // Survey cost calculation
    let surveyCost = 0;
    let surveyNote: string | undefined;
    if (input.para11_survey_option === 'A' && input.para11_survey_paid_by) {
      if (input.para11_survey_paid_by === 'Seller') {
        surveyCost = 1000; // Estimate
        surveyNote = '* Survey cost is an estimate';
      } else if (input.para11_survey_paid_by === 'Equally') {
        surveyCost = 500; // Half of estimate
        surveyNote = '* Survey cost is an estimate (50% split)';
      }
      // If Buyer pays, surveyCost remains 0
    }
    
    // Calculate totals
    const totalCosts = 
      sellerConcessions +
      taxCalc.amount +
      commissionSeller +
      buyerAgencyFees +
      closingFee +
      titleSearch +
      titleInsurance +
      titleRecordingFees +
      pestTransfer +
      taxStamps +
      homeWarranty +
      surveyCost;
    
    const cashToSeller = salesPrice - totalCosts;
    
    return {
      sales_price: salesPrice,
      seller_concessions: sellerConcessions,
      taxes_prorated: taxCalc.amount,
      commission_seller: commissionSeller,
      buyer_agency_fees: buyerAgencyFees,
      closing_fee: closingFee,
      title_search: titleSearch,
      title_insurance: titleInsurance,
      title_recording_fees: titleRecordingFees,
      pest_transfer: pestTransfer,
      tax_stamps: taxStamps,
      home_warranty: homeWarranty,
      survey_cost: surveyCost,
      survey_note: surveyNote,
      total_costs: Math.round(totalCosts * 100) / 100,
      cash_to_seller: Math.round(cashToSeller * 100) / 100,
      
      // Additional details
      calculation_date: new Date().toISOString(),
      days_of_tax: taxCalc.days,
      tax_per_day: taxCalc.perDay
    };
  }
  
  /**
   * Generate a formatted HTML report
   */
  generateHTMLReport(result: SellerNetSheetOutput, propertyAddress?: string): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    });
    
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Seller Net Sheet</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .header { margin-bottom: 30px; }
    .property { font-size: 16px; color: #666; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f5f5f5; font-weight: bold; }
    .amount { text-align: right; font-family: monospace; }
    .subtotal { font-weight: bold; background-color: #f9f9f9; }
    .total { font-weight: bold; font-size: 18px; background-color: #e8f4f8; }
    .net { font-weight: bold; font-size: 20px; background-color: #d4edda; color: #155724; }
    .details { margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Seller Net Sheet</h1>
    ${propertyAddress ? `<div class="property">Property: ${propertyAddress}</div>` : ''}
    <div class="property">Calculation Date: ${new Date(result.calculation_date).toLocaleDateString()}</div>
  </div>
  
  <table>
    <tr>
      <th>Description</th>
      <th class="amount">Amount</th>
    </tr>
    
    <tr>
      <td><strong>Sales Price</strong></td>
      <td class="amount"><strong>${formatter.format(result.sales_price)}</strong></td>
    </tr>
    
    <tr>
      <td colspan="2" style="padding-top: 20px;"><strong>Less Seller's Costs:</strong></td>
    </tr>
    
    <tr>
      <td>Seller Concessions</td>
      <td class="amount">${formatter.format(result.seller_concessions)}</td>
    </tr>
    
    <tr>
      <td>Prorated Taxes (${result.days_of_tax} days @ ${formatter.format(result.tax_per_day)}/day)</td>
      <td class="amount">${formatter.format(result.taxes_prorated)}</td>
    </tr>
    
    <tr>
      <td>Seller's Commission</td>
      <td class="amount">${formatter.format(result.commission_seller)}</td>
    </tr>
    
    <tr>
      <td>Buyer Agency Fees</td>
      <td class="amount">${formatter.format(result.buyer_agency_fees)}</td>
    </tr>
    
    <tr>
      <td>Closing Fee</td>
      <td class="amount">${formatter.format(result.closing_fee)}</td>
    </tr>
    
    <tr>
      <td>Title Search</td>
      <td class="amount">${formatter.format(result.title_search)}</td>
    </tr>
    
    <tr>
      <td>Title Insurance</td>
      <td class="amount">${formatter.format(result.title_insurance)}</td>
    </tr>
    
    <tr>
      <td>Title & Recording Fees</td>
      <td class="amount">${formatter.format(result.title_recording_fees)}</td>
    </tr>
    
    <tr>
      <td>Pest Transfer</td>
      <td class="amount">${formatter.format(result.pest_transfer)}</td>
    </tr>
    
    <tr>
      <td>Tax Stamps</td>
      <td class="amount">${formatter.format(result.tax_stamps)}</td>
    </tr>
    
    <tr>
      <td>Home Warranty</td>
      <td class="amount">${formatter.format(result.home_warranty)}</td>
    </tr>
    
    <tr class="subtotal">
      <td><strong>Total Costs</strong></td>
      <td class="amount"><strong>${formatter.format(result.total_costs)}</strong></td>
    </tr>
    
    <tr class="net">
      <td><strong>ESTIMATED NET TO SELLER</strong></td>
      <td class="amount"><strong>${formatter.format(result.cash_to_seller)}</strong></td>
    </tr>
  </table>
  
  <div class="details">
    <h3>Calculation Details</h3>
    <ul>
      <li>Sales Price: ${formatter.format(result.sales_price)}</li>
      <li>Total Deductions: ${formatter.format(result.total_costs)}</li>
      <li>Net Proceeds: ${formatter.format(result.cash_to_seller)}</li>
      <li>Net Percentage: ${((result.cash_to_seller / result.sales_price) * 100).toFixed(2)}%</li>
    </ul>
  </div>
  
  <div class="footer">
    <p>* This is an estimate only. Actual costs may vary. Please consult with your real estate professional and closing attorney for exact figures.</p>
    <p>Generated by Arkansas Contract Agent - ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
    `;
  }
}

// Export for use in other modules
export default SellerNetSheetCalculator;