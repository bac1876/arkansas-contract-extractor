/**
 * PDF Generator for Seller Net Sheets
 * Creates professional, branded PDF documents for sellers
 */

import { chromium } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';

export class PDFGenerator {
  private outputDir: string = 'net_sheets_pdf';
  
  constructor() {
    this.ensureOutputDir();
  }
  
  private async ensureOutputDir() {
    await fs.mkdir(this.outputDir, { recursive: true });
  }
  
  /**
   * Generate a professional PDF net sheet
   */
  async generateNetSheetPDF(netSheetData: any, propertyAddress: string, contractData?: any): Promise<string> {
    // Clean address for filename - replace special chars with spaces, then collapse multiple spaces
    const cleanAddress = propertyAddress
      .replace(/[^a-zA-Z0-9\s]/g, ' ')  // Replace special chars with spaces
      .replace(/\s+/g, '_')              // Replace spaces with underscores
      .trim();                           // Remove leading/trailing spaces
    
    // Use the format: netsheet_address.pdf
    const fileName = `netsheet_${cleanAddress}.pdf`;
    const filePath = path.join(this.outputDir, fileName);
    
    // Generate HTML content
    const htmlContent = this.generateHTML(netSheetData, propertyAddress, contractData);
    
    // Generate PDF using Playwright
    try {
      // Launch browser with Railway-compatible options
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle' });
      
      // Generate PDF with professional settings
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
      
      console.log(`📄 Net sheet PDF generated: ${filePath}`);
      return filePath;
      
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      // Fallback to HTML if PDF generation fails
      const htmlPath = filePath.replace('.pdf', '.html');
      await fs.writeFile(htmlPath, htmlContent);
      console.log(`📄 Net sheet saved as HTML (PDF failed): ${htmlPath}`);
      return htmlPath;
    }
  }
  
  /**
   * Generate professional HTML content for the PDF
   */
  private generateHTML(netSheetData: any, propertyAddress: string, contractData?: any): string {
    const formatCurrency = (value: number) => {
      return `$${(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    
    const today = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const buyerNames = contractData?.buyers || 'N/A';
    // Try to get closing date from either location
    const closingDate = contractData?.closing_date || netSheetData.closing_date || 'TBD';
    const hasTaxWarning = netSheetData.taxWarning === true;
    
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
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #333;
      line-height: 1.6;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 10px;
    }
    
    
    .property-info {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 10px;
      border-radius: 10px;
      margin-bottom: 15px;
      box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }
    
    .property-info h2 {
      font-size: 14px;
      margin-bottom: 5px;
      font-weight: 400;
    }
    
    .property-info .date {
      font-size: 14px;
      opacity: 0.9;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 15px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 10px;
    }
    
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .info-label {
      color: #666;
      font-size: 14px;
    }
    
    .info-value {
      font-weight: 600;
      color: #2c3e50;
    }
    
    .section {
      margin-bottom: 15px;
    }
    
    
    .section-content {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 5px;
      padding: 10px;
    }
    
    .cost-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .cost-table tr {
      border-bottom: 1px solid #f0f0f0;
    }
    
    .cost-table tr:last-child {
      border-bottom: none;
    }
    
    .cost-table td {
      padding: 8px 0;
      font-size: 12px;
    }
    
    .cost-table .item-name {
      color: #555;
    }
    
    .cost-table .item-calculation {
      color: #888;
      font-size: 12px;
      font-style: italic;
      text-align: center;
    }
    
    .cost-table .item-amount {
      text-align: right;
      font-weight: 600;
      color: #2c3e50;
      white-space: nowrap;
    }
    
    .total-section {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 10px;
      margin-top: 10px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-top: 2px solid #dee2e6;
      margin-top: 10px;
      font-size: 16px;
      font-weight: 600;
      color: #495057;
    }
    
    /* Removed net-seller styles - no longer needed */
    
    .disclaimer {
      margin-top: 25px;
      padding: 15px;
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      border-radius: 5px;
    }
    
    .disclaimer h3 {
      color: #856404;
      font-size: 13px;
      margin-bottom: 8px;
    }
    
    .disclaimer p {
      color: #856404;
      font-size: 11px;
      line-height: 1.5;
    }
    
    
    .tax-warning {
      background-color: #ffebee !important;
    }
    
    .tax-warning .item-name {
      color: #d32f2f !important;
      font-weight: bold;
    }
    
    .tax-warning .item-amount {
      color: #d32f2f !important;
      font-weight: bold;
    }
    
    .tax-warning-notice {
      color: #d32f2f;
      font-size: 10px;
      font-style: italic;
      padding-left: 10px;
    }
    
    @media print {
      .container {
        max-width: 100%;
      }
      
      .property-info,
      .net-seller,
      .tax-warning {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Property Information -->
    <div class="property-info">
      <h2>${propertyAddress}</h2>
    </div>
    
    <!-- Transaction Details -->
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Closing Date:</span>
        <span class="info-value">${closingDate}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Sales Price:</span>
        <span class="info-value">${formatCurrency(netSheetData.sales_price)}</span>
      </div>
    </div>
    
    <!-- Seller Costs -->
    <div class="section">
      <div class="section-content">
        <table class="cost-table">
          <tr>
            <td class="item-name">Seller Concessions</td>
            <td class="item-calculation"></td>
            <td class="item-amount">${formatCurrency(netSheetData.seller_concessions)}</td>
          </tr>
          <tr class="${hasTaxWarning ? 'tax-warning' : ''}">
            <td class="item-name">
              Taxes Prorated
              ${hasTaxWarning ? '<span class="tax-warning-notice">*NEEDS VERIFICATION</span>' : ''}
            </td>
            <td class="item-calculation">${netSheetData.days_of_tax} days @ ${formatCurrency(netSheetData.tax_per_day)}/day</td>
            <td class="item-amount">${formatCurrency(netSheetData.taxes_prorated)}</td>
          </tr>
          <tr>
            <td class="item-name">Commission - Seller</td>
            <td class="item-calculation"></td>
            <td class="item-amount">${formatCurrency(netSheetData.commission_seller)}</td>
          </tr>
          <tr>
            <td class="item-name">Buyer Agency Fees</td>
            <td class="item-calculation"></td>
            <td class="item-amount">${formatCurrency(netSheetData.buyer_agency_fees)}</td>
          </tr>
          <tr>
            <td class="item-name">Closing Fee</td>
            <td class="item-calculation"></td>
            <td class="item-amount">${formatCurrency(netSheetData.closing_fee)}</td>
          </tr>
          <tr>
            <td class="item-name">Title Search</td>
            <td class="item-calculation"></td>
            <td class="item-amount">${formatCurrency(netSheetData.title_search)}</td>
          </tr>
          <tr>
            <td class="item-name">Title Insurance</td>
            <td class="item-calculation"></td>
            <td class="item-amount">${formatCurrency(netSheetData.title_insurance)}</td>
          </tr>
          <tr>
            <td class="item-name">Title & Recording Fees</td>
            <td class="item-calculation"></td>
            <td class="item-amount">${formatCurrency(netSheetData.title_recording_fees)}</td>
          </tr>
          <tr>
            <td class="item-name">Pest Transfer*</td>
            <td class="item-calculation">*Estimate</td>
            <td class="item-amount">${formatCurrency(netSheetData.pest_transfer)}</td>
          </tr>
          <tr>
            <td class="item-name">Tax Stamps</td>
            <td class="item-calculation">Purchase price × 0.0033 ÷ 2</td>
            <td class="item-amount">${formatCurrency(netSheetData.tax_stamps)}</td>
          </tr>
          <tr>
            <td class="item-name">Home Warranty</td>
            <td class="item-calculation"></td>
            <td class="item-amount">${formatCurrency(netSheetData.home_warranty)}</td>
          </tr>
          ${netSheetData.survey_cost > 0 ? `
          <tr>
            <td class="item-name">Survey${netSheetData.survey_note ? ' *' : ''}</td>
            <td class="item-calculation">${netSheetData.survey_note || ''}</td>
            <td class="item-amount">${formatCurrency(netSheetData.survey_cost)}</td>
          </tr>` : ''}
        </table>
        
        <div class="total-section">
          <div class="total-row">
            <span>TOTAL ESTIMATED COSTS</span>
            <span>${formatCurrency(netSheetData.total_costs)}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Net to Seller Summary -->
    <div class="section">
      <div class="section-content">
        <table class="cost-table">
          <tr style="font-size: 16px; font-weight: bold;">
            <td class="item-name">Sales Price</td>
            <td></td>
            <td class="item-amount">${formatCurrency(netSheetData.sales_price)}</td>
          </tr>
          <tr style="font-size: 16px; font-weight: bold;">
            <td class="item-name">Less: Total Costs</td>
            <td></td>
            <td class="item-amount">(${formatCurrency(netSheetData.total_costs)})</td>
          </tr>
          <tr style="font-size: 18px; font-weight: bold; background: #f0f0f0;">
            <td class="item-name">Estimated Net to Seller</td>
            <td></td>
            <td class="item-amount">${formatCurrency(netSheetData.cash_to_seller)}</td>
          </tr>
        </table>
      </div>
    </div>
    
    <!-- Notes Section -->
    ${this.generateNotesSection(contractData)}
    
  </div>
</body>
</html>`;
  }

  /**
   * Generate the Notes section with contract-specific information
   */
  private generateNotesSection(contractData: any): string {
    const notes: string[] = [];
    
    // Check for earnest money
    if (contractData?.earnest_money && contractData.earnest_money > 0) {
      notes.push(`<strong>Earnest Money:</strong> The buyer is offering earnest money`);
    }
    
    // Check for non-refundable deposit
    if (contractData?.non_refundable === 'YES' && contractData?.non_refundable_amount > 0) {
      const amount = `$${(contractData.non_refundable_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      notes.push(`<strong>Non-Refundable Deposit:</strong> Buyer is offering non-refundable deposit in the amount of ${amount}`);
    }
    
    // Check for contingency
    if (contractData?.para14_contingency === 'B') {
      notes.push(`<strong>Contingency:</strong> Buyer has a contingency to sell a home`);
    }
    
    // Check for included fixtures
    if (contractData?.para13_items_included && contractData.para13_items_included.trim() !== '') {
      notes.push(`<strong>Fixtures:</strong> The buyer is requesting the following items stay with the house: ${contractData.para13_items_included}`);
    }
    
    // Only return the section if there are notes
    if (notes.length === 0) {
      return '';
    }
    
    return `
    <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
      <h3 style="color: #2c3e50; font-size: 18px; margin-bottom: 15px; font-weight: 600;">NOTES</h3>
      <div style="color: #555; font-size: 14px; line-height: 1.8;">
        ${notes.join('<br>')}
      </div>
    </div>`;
  }
}

export default PDFGenerator;