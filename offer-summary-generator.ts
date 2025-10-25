/**
 * Offer Summary Generator
 * Creates a professional offer summary PDF for contractextraction@gmail.com
 * Matches the purple gradient header style with clean two-column layout
 */

import { chromium } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface OfferSummaryData {
  // Property info
  property_address: string;
  purchase_price: number | null;
  buyers: string | string[];
  closing_date?: string;

  // Financial details
  seller_concessions?: string | number; // From para 5
  loan_type?: string | null;
  earnest_money?: string; // "A" or "B"
  non_refundable?: string; // "YES" or "NO"
  non_refundable_amount?: number | null;

  // Survey details
  para11_survey_option?: string; // "A", "B", or "C"
  para11_survey_paid_by?: string; // "Seller", "Buyer", "Equally"

  // Fixtures (Para 13)
  para13_items_included?: string;
  para13_items_excluded?: string;

  // Contingency (Para 14)
  para14_contingency?: string; // "A" or "B"

  // Home Warranty (Para 15)
  para15_home_warranty?: string; // "A", "B", "C", or "D"
  para15_warranty_cost?: number;

  // Other terms (Para 32)
  buyer_agency_fee?: string;

  // Selling agent info
  selling_agent_name?: string;
  selling_agent_phone?: string;
}

export class OfferSummaryGenerator {
  private outputDir: string = '.';

  constructor() {
    this.ensureOutputDir();
  }

  private async ensureOutputDir() {
    await fs.mkdir(this.outputDir, { recursive: true });
  }

  /**
   * Normalize property address - remove legal descriptions
   */
  private normalizeAddress(address: string): string {
    if (!address) return address;

    // Remove common legal description patterns
    let normalized = address
      // Remove lot/block/subdivision info: "Lot 56 Breckenridge Sub-Div"
      .replace(/\s+Lot\s+\d+[A-Z]?\s+.*/i, '')
      // Remove "Benton County Arkansas" type suffixes
      .replace(/\s+(Benton|Washington|Madison|Carroll)\s+County\s+Arkansas/i, '')
      // Remove standalone "Arkansas"
      .replace(/\s+Arkansas$/i, '')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim();

    return normalized;
  }

  /**
   * Generate offer summary PDF
   * Returns object with type and path for email monitor compatibility
   */
  async generateOfferSummary(data: OfferSummaryData): Promise<{ type: string; path: string }> {
    // Debug logging for buyer_agency_fee
    console.log(`🔍 DEBUG - buyer_agency_fee value: "${data.buyer_agency_fee}"`);

    // Clean address for filename
    const cleanAddress = data.property_address
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, '_')
      .trim();

    const fileName = `offer_summary_${cleanAddress}.pdf`;
    const filePath = path.join(this.outputDir, fileName);

    // Generate HTML content
    const htmlContent = this.generateHTML(data);

    // Generate PDF using Playwright
    try {
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle' });

      await page.pdf({
        path: filePath,
        format: 'Letter',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        }
      });

      await browser.close();

      console.log(`📄 Offer summary PDF generated: ${filePath}`);
      return { type: 'pdf', path: filePath };
    } catch (error: any) {
      console.error('⚠️ Failed to generate offer summary PDF:', error.message);

      // Fallback to HTML
      const htmlPath = filePath.replace('.pdf', '.html');
      await fs.writeFile(htmlPath, htmlContent);
      console.log(`📄 Offer summary saved as HTML (PDF failed): ${htmlPath}`);
      return { type: 'html', path: htmlPath };
    }
  }

  /**
   * Generate HTML content for the offer summary
   */
  private generateHTML(data: OfferSummaryData): string {
    const formatCurrency = (value: number | null | undefined) => {
      if (value === null || value === undefined) return 'N/A';
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    // Split buyers into buyer1 and buyer2
    const buyers = Array.isArray(data.buyers) ? data.buyers : (data.buyers ? data.buyers.split(/,\s*/) : []);
    const buyer1 = buyers[0] || 'N/A';
    const buyer2 = buyers[1] || null;

    // Format seller concessions
    const sellerConcessions = this.formatSellerConcessions(data.seller_concessions);

    // Build rows array with conditional inclusion
    const rows: string[] = [];

    // Always shown fields
    rows.push(this.createRow('Buyer 1', buyer1));

    // Conditionally shown fields
    if (buyer2) {
      rows.push(this.createRow('Buyer 2', buyer2));
    }

    rows.push(this.createRow('Purchase Price', formatCurrency(data.purchase_price)));
    rows.push(this.createRow('Seller Concessions', sellerConcessions));
    rows.push(this.createRow('Close Date', data.closing_date || 'N/A'));
    rows.push(this.createRow('Loan Type', this.formatLoanType(data.loan_type)));
    rows.push(this.createRow('Earnest Money', this.formatEarnestMoney(data.earnest_money)));
    rows.push(this.createRow('Non-Refundable Deposit', this.formatNonRefundable(data.non_refundable)));

    // Survey - only if specified
    const surveyInfo = this.formatSurvey(data.para11_survey_option, data.para11_survey_paid_by);
    if (surveyInfo) {
      rows.push(this.createRow('Survey', surveyInfo));
    }

    // Fixtures - only if any items listed
    const fixtures = this.formatFixtures(data.para13_items_included, data.para13_items_excluded);
    if (fixtures) {
      rows.push(this.createRow('Fixtures', fixtures));
    }

    // Contingency - only if there is one
    const contingency = this.formatContingency(data.para14_contingency);
    if (contingency) {
      rows.push(this.createRow('Contingency', contingency));
    }

    rows.push(this.createRow('Home Warranty', this.formatHomeWarranty(data.para15_home_warranty, data.para15_warranty_cost)));
    rows.push(this.createRow('Other', this.formatOther(data.buyer_agency_fee)));

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      color: #333;
      line-height: 1.6;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 25px 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
      margin-bottom: 0;
    }

    .header h1 {
      color: white;
      font-size: 28px;
      font-weight: 300;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    .header .property-address {
      color: white;
      font-size: 16px;
      font-weight: 400;
    }

    .contract-details {
      background: white;
      border: 1px solid #e0e0e0;
      border-top: none;
      border-radius: 0 0 8px 8px;
      padding: 20px;
    }

    .section-title {
      color: #4a5568;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #667eea;
    }

    .details-table {
      width: 100%;
      border-collapse: collapse;
    }

    .details-table tr {
      border-bottom: 1px solid #f0f0f0;
    }

    .details-table tr:last-child {
      border-bottom: none;
    }

    .details-table td {
      padding: 7px 0;
      font-size: 13px;
    }

    .details-table td:first-child {
      color: #666;
      width: 200px;
      font-weight: 400;
    }

    .details-table td:last-child {
      color: #333;
      font-weight: 500;
      text-align: right;
    }

    .selling-agent {
      margin-top: 15px;
      padding-top: 12px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 12px;
    }

    @media print {
      .container {
        max-width: 100%;
      }

      .header {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Purple Gradient Header -->
    <div class="header">
      <h1>OFFER SUMMARY</h1>
      <div class="property-address">${this.normalizeAddress(data.property_address)}</div>
    </div>

    <!-- Contract Details -->
    <div class="contract-details">
      <div class="section-title">Contract Details</div>
      <table class="details-table">
        <tbody>
          ${rows.join('\n          ')}
        </tbody>
      </table>

      ${this.generateSellingAgent(data.selling_agent_name, data.selling_agent_phone)}
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Create a table row
   */
  private createRow(label: string, value: string): string {
    return `<tr>
            <td>${label}</td>
            <td>${value}</td>
          </tr>`;
  }

  /**
   * Format seller concessions
   */
  private formatSellerConcessions(value: string | number | undefined): string {
    if (value === undefined || value === null || value === '' || value === 0) {
      return '$0';
    }
    if (typeof value === 'number') {
      return `$${value.toLocaleString()}`;
    }
    // If it's a string, try to extract a number
    const match = value.toString().match(/\$?([\d,]+)/);
    if (match) {
      const num = parseInt(match[1].replace(/,/g, ''));
      return `$${num.toLocaleString()}`;
    }
    return value.toString();
  }

  /**
   * Format loan type
   */
  private formatLoanType(loanType: string | null | undefined): string {
    if (!loanType || loanType === 'null') return 'CASH';
    return loanType.toUpperCase();
  }

  /**
   * Format earnest money
   */
  private formatEarnestMoney(value: string | undefined): string {
    if (!value) return 'No';
    return value === 'A' ? 'Yes' : 'No';
  }

  /**
   * Format non-refundable deposit
   */
  private formatNonRefundable(value: string | undefined): string {
    if (!value || value === 'NO') return 'No';
    return 'Yes';
  }

  /**
   * Format survey - only returns value if survey is specified
   */
  private formatSurvey(option: string | undefined, paidBy: string | undefined): string | null {
    if (!option || option === 'C') return null; // C means no survey

    if (option === 'A' && paidBy) {
      return `Yes - ${paidBy} pays`;
    }
    if (option === 'B') {
      return 'Buyer pays for new survey';
    }
    return null;
  }

  /**
   * Format fixtures - only returns value if items exist
   */
  private formatFixtures(included: string | undefined, excluded: string | undefined): string | null {
    const items: string[] = [];

    if (included && included.trim()) {
      items.push(included.trim());
    }
    if (excluded && excluded.trim()) {
      items.push(`NOT: ${excluded.trim()}`);
    }

    return items.length > 0 ? items.join('; ') : null;
  }

  /**
   * Format contingency - only returns value if there IS a contingency
   */
  private formatContingency(value: string | undefined): string | null {
    if (!value || value === 'A') return null; // A means not contingent
    if (value === 'B') return 'Buyer has home to sell';
    return null;
  }

  /**
   * Format home warranty
   */
  private formatHomeWarranty(option: string | undefined, cost: number | undefined): string {
    if (!option || option === 'A') return 'No';

    if (option === 'B' && cost) {
      return `Yes - $${cost.toLocaleString()}`;
    }
    if (option === 'C') {
      return 'Buyer pays';
    }
    if (option === 'D') {
      return 'Other arrangement';
    }

    return 'No';
  }

  /**
   * Format other terms (buyer agency fee from para 32)
   */
  private formatOther(buyerAgencyFee: string | undefined): string {
    if (!buyerAgencyFee || buyerAgencyFee.trim() === '') {
      return 'None specified';
    }

    // Check if it's a percentage or dollar amount
    if (buyerAgencyFee.includes('%')) {
      return `Seller to pay buyer agent fee in the amount of ${buyerAgencyFee} of the purchase price to Coldwell Banker Harris McHaney & Faucette, at closing.`;
    }

    return buyerAgencyFee;
  }

  /**
   * Generate selling agent section
   */
  private generateSellingAgent(name: string | undefined, phone: string | undefined): string {
    if (!name && !phone) return '';

    const agentInfo = [];
    if (name) agentInfo.push(name);
    if (phone) agentInfo.push(phone);

    return `
      <div class="selling-agent">
        Selling Agent: ${agentInfo.join(' - ')}
      </div>`;
  }
}

export default OfferSummaryGenerator;
