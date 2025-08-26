/**
 * PDF Generator for Seller Net Sheets
 * Creates professional, branded PDF documents for sellers
 */

import puppeteer from 'puppeteer';
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
    
    // Launch puppeteer and generate PDF
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      // Generate PDF with professional settings
      await page.pdf({
        path: filePath,
        format: 'letter',
        printBackground: true,
        margin: {
          top: '0.75in',
          right: '0.75in',
          bottom: '0.75in',
          left: '0.75in'
        }
      });
      
      console.log(`📄 PDF net sheet saved: ${filePath}`);
      return filePath;
      
    } finally {
      await browser.close();
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
    const closingDate = contractData?.closing_date || 'TBD';
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
      padding: 20px;
    }
    
    .header {
      text-align: center;
      border-bottom: 3px solid #2c3e50;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      color: #2c3e50;
      font-size: 32px;
      margin-bottom: 10px;
      font-weight: 300;
      letter-spacing: 2px;
    }
    
    .header .subtitle {
      color: #7f8c8d;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .property-info {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }
    
    .property-info h2 {
      font-size: 20px;
      margin-bottom: 10px;
      font-weight: 400;
    }
    
    .property-info .date {
      font-size: 14px;
      opacity: 0.9;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 30px;
      padding: 20px;
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
      margin-bottom: 30px;
    }
    
    .section-title {
      background: #2c3e50;
      color: white;
      padding: 10px 20px;
      font-size: 18px;
      font-weight: 500;
      border-radius: 5px 5px 0 0;
      letter-spacing: 1px;
    }
    
    .section-content {
      background: white;
      border: 1px solid #e0e0e0;
      border-top: none;
      border-radius: 0 0 5px 5px;
      padding: 20px;
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
      padding: 12px 0;
      font-size: 14px;
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
      padding: 20px;
      border-radius: 10px;
      margin-top: 20px;
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
    
    .net-seller {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 10px;
      text-align: center;
      margin-top: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    
    .net-seller .label {
      font-size: 18px;
      margin-bottom: 10px;
      opacity: 0.9;
      letter-spacing: 1px;
    }
    
    .net-seller .amount {
      font-size: 42px;
      font-weight: 300;
      letter-spacing: 2px;
    }
    
    .disclaimer {
      margin-top: 40px;
      padding: 20px;
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      border-radius: 5px;
    }
    
    .disclaimer h3 {
      color: #856404;
      font-size: 16px;
      margin-bottom: 10px;
    }
    
    .disclaimer p {
      color: #856404;
      font-size: 13px;
      line-height: 1.6;
    }
    
    .footer {
      margin-top: 50px;
      text-align: center;
      color: #888;
      font-size: 12px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
    }
    
    .footer .company {
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 5px;
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
    <!-- Header -->
    <div class="header">
      <h1>SELLER NET SHEET</h1>
      <div class="subtitle">Estimated Proceeds Statement</div>
    </div>
    
    <!-- Property Information -->
    <div class="property-info">
      <h2>${propertyAddress}</h2>
      <div class="date">Prepared on ${today}</div>
    </div>
    
    <!-- Transaction Details -->
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Buyers:</span>
        <span class="info-value">${buyerNames}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Closing Date:</span>
        <span class="info-value">${closingDate}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Sales Price:</span>
        <span class="info-value">${formatCurrency(netSheetData.sales_price)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Days of Tax:</span>
        <span class="info-value">${netSheetData.days_of_tax || 0} days</span>
      </div>
    </div>
    
    <!-- Seller Costs -->
    <div class="section">
      <div class="section-title">SELLER'S ESTIMATED COSTS</div>
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
            <td class="item-calculation">3% of sales price</td>
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
            <td class="item-name">Pest Transfer</td>
            <td class="item-calculation"></td>
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
        </table>
        
        <div class="total-section">
          <div class="total-row">
            <span>TOTAL ESTIMATED COSTS</span>
            <span>${formatCurrency(netSheetData.total_costs)}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Net to Seller -->
    <div class="net-seller">
      <div class="label">ESTIMATED NET TO SELLER</div>
      <div class="amount">${formatCurrency(netSheetData.cash_to_seller)}</div>
    </div>
    
    <!-- Disclaimer -->
    <div class="disclaimer">
      <h3>Important Notice</h3>
      <p>
        This is an estimate only and is provided for informational purposes. Actual costs may vary at closing. 
        This estimate is based on current information and assumptions that may change. Please consult with your 
        real estate professional and closing attorney for exact figures. Tax calculations are based on annual 
        taxes of $3,650 (configurable). Commission rates are negotiable and may vary.
      </p>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="company">Arkansas Contract Agent</div>
      <div>Generated on ${new Date().toLocaleString()}</div>
      <div>This document is confidential and intended solely for the named recipient</div>
    </div>
  </div>
</body>
</html>`;
  }
}

export default PDFGenerator;