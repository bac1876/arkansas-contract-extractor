/**
 * Other Information About Offer Generator
 * Creates a PDF with key contract information for the listing agent
 */

import { chromium } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface AgentInfoSheetData {
  // Property info
  property_address: string;
  purchase_price: number;
  buyers: string | string[];
  closing_date?: string;
  
  // Contract details
  contract_expiration_date?: string;
  contract_expiration_time?: string;
  
  // Commissions
  listing_agent_commission?: number; // percentage
  selling_agent_commission?: number; // percentage
  
  // Selling agent/firm info
  selling_firm_name?: string;
  selling_agent_name?: string;
  selling_agent_phone?: string;
  selling_agent_email?: string;
  selling_agent_arec?: string; // license number
  selling_agent_mls?: string;
  
  // Home warranty details
  para15_other_details?: string; // Note if option D selected
  
  // Additional contract details for notes
  earnest_money?: number;
  non_refundable?: string;
  non_refundable_amount?: number;
  para14_contingency?: string;
  para13_items_included?: string;
  para13_items_excluded?: string;
}

export class AgentInfoSheetGenerator {
  private outputDir: string = '.';
  
  constructor() {
    this.ensureOutputDir();
  }
  
  private async ensureOutputDir() {
    await fs.mkdir(this.outputDir, { recursive: true });
  }
  
  /**
   * Generate agent information sheet PDF
   * Returns object with type and path for email monitor compatibility
   */
  async generateAgentInfoSheet(data: AgentInfoSheetData): Promise<{ type: string; path: string }> {
    // Clean address for filename
    const cleanAddress = data.property_address
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, '_')
      .trim();
    
    const fileName = `offer_info_${cleanAddress}.pdf`;
    const filePath = path.join(this.outputDir, fileName);
    
    // Generate HTML content
    const htmlContent = this.generateHTML(data);
    
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
      
      console.log(`📄 Agent info sheet PDF generated: ${filePath}`);
      return { type: 'pdf', path: filePath };
    } catch (error: any) {
      console.error('⚠️ Failed to generate agent info PDF:', error.message);
      
      // Fallback to HTML if PDF generation fails
      const htmlPath = filePath.replace('.pdf', '.html');
      await fs.writeFile(htmlPath, htmlContent);
      console.log(`📄 Agent info sheet saved as HTML (PDF failed): ${htmlPath}`);
      console.log('   ⚠️ This will be uploaded as HTML, not PDF');
      return { type: 'html', path: htmlPath };
    }
  }
  
  /**
   * Generate HTML content for the agent info sheet
   */
  private generateHTML(data: AgentInfoSheetData): string {
    const formatCurrency = (value: number) => {
      return `$${(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };
    
    const formatPercent = (value?: number) => {
      return value ? `${value}%` : 'TBD';
    };
    
    const formatBuyerNames = (buyers: string | string[] | undefined): string => {
      if (!buyers) return 'TBD';
      
      // If it's an array, join with ' & '
      if (Array.isArray(buyers)) {
        return buyers.join(' & ');
      }
      
      // If it's a string, replace comma with ampersand
      return buyers.replace(/,\s*/g, ' & ');
    };
    
    const today = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
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
      border-bottom: 3px solid #1a5490;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    
    .header h1 {
      color: #1a5490;
      font-size: 26px;
      margin-bottom: 5px;
      font-weight: 500;
      letter-spacing: 1px;
    }
    
    .header .subtitle {
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .property-section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 25px;
    }
    
    .property-address {
      font-size: 18px;
      font-weight: 600;
      color: #1a5490;
      margin-bottom: 15px;
    }
    
    .property-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    
    .detail-item {
      display: flex;
      justify-content: space-between;
    }
    
    .detail-label {
      color: #666;
      font-size: 14px;
    }
    
    .detail-value {
      font-weight: 600;
      color: #333;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      background: #1a5490;
      color: white;
      padding: 8px 15px;
      font-size: 16px;
      font-weight: 500;
      border-radius: 5px 5px 0 0;
      letter-spacing: 0.5px;
    }
    
    .section-content {
      background: white;
      border: 1px solid #dee2e6;
      border-top: none;
      border-radius: 0 0 5px 5px;
      padding: 20px;
    }
    
    .info-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .info-table td {
      padding: 10px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
    }
    
    .info-table tr:last-child td {
      border-bottom: none;
    }
    
    .info-table .label {
      color: #666;
      width: 40%;
    }
    
    .info-table .value {
      color: #333;
      font-weight: 500;
    }
    
    .commission-box {
      background: #e8f4fd;
      padding: 15px;
      border-radius: 8px;
      margin-top: 15px;
    }
    
    .commission-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 15px;
    }
    
    .commission-label {
      color: #1a5490;
      font-weight: 500;
    }
    
    .commission-value {
      font-weight: 600;
      color: #333;
    }
    
    .warning-box {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 12px 15px;
      margin-top: 15px;
      border-radius: 4px;
    }
    
    .warning-box p {
      color: #856404;
      font-size: 13px;
      margin: 0;
    }
    
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #888;
      font-size: 11px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
    }
    
    .highlight {
      background: #ffeaa7;
      padding: 2px 4px;
      border-radius: 3px;
    }
    
    @media print {
      .container {
        max-width: 100%;
      }
      
      .property-section,
      .commission-box,
      .warning-box {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Property Information -->
    <div class="property-section">
      <div class="property-address">${data.property_address}</div>
      <div class="property-details">
        <div class="detail-item">
          <span class="detail-label">Purchase Price:</span>
          <span class="detail-value">${formatCurrency(data.purchase_price)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Closing Date:</span>
          <span class="detail-value">${data.closing_date || 'TBD'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Buyers:</span>
          <span class="detail-value">${formatBuyerNames(data.buyers)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Contract Expires:</span>
          <span class="detail-value ${!data.contract_expiration_date ? 'highlight' : ''}">
            ${data.contract_expiration_date || 'CHECK CONTRACT'} ${data.contract_expiration_time || ''}
          </span>
        </div>
      </div>
    </div>
    
    <!-- Selling Agent Information -->
    <div class="section">
      <div class="section-title">SELLING AGENT INFORMATION</div>
      <div class="section-content">
        <table class="info-table">
          <tr>
            <td class="label">Selling Firm:</td>
            <td class="value">${data.selling_firm_name || 'Not Provided'}</td>
          </tr>
          <tr>
            <td class="label">Agent Name:</td>
            <td class="value">${data.selling_agent_name || 'Not Provided'}</td>
          </tr>
          <tr>
            <td class="label">Phone:</td>
            <td class="value">${data.selling_agent_phone || 'Not Provided'}</td>
          </tr>
          <tr>
            <td class="label">Email:</td>
            <td class="value">${data.selling_agent_email || 'Not Provided'}</td>
          </tr>
          <tr>
            <td class="label">AREC License #:</td>
            <td class="value">${data.selling_agent_arec || 'Not Provided'}</td>
          </tr>
          ${data.selling_agent_mls ? `
          <tr>
            <td class="label">MLS #:</td>
            <td class="value">${data.selling_agent_mls}</td>
          </tr>` : ''}
        </table>
      </div>
    </div>
    
    <!-- Contract Details Section -->
    ${this.generateContractDetailsSection(data)}
    
    ${data.para15_other_details ? `
    <!-- Home Warranty Note -->
    <div class="warning-box">
      <p><strong>Home Warranty Note:</strong> ${data.para15_other_details}</p>
    </div>` : ''}
    
  </div>
</body>
</html>`;
  }
  
  /**
   * Generate the Contract Details section with important contract information
   */
  private generateContractDetailsSection(data: AgentInfoSheetData): string {
    const details: string[] = [];
    
    // Check for earnest money
    if (data.earnest_money && data.earnest_money > 0) {
      const amount = `$${(data.earnest_money || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      details.push(`<tr><td class="label">Earnest Money:</td><td class="value">${amount}</td></tr>`);
    }
    
    // Check for non-refundable deposit
    if (data.non_refundable === 'YES' && data.non_refundable_amount && data.non_refundable_amount > 0) {
      const amount = `$${(data.non_refundable_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      details.push(`<tr><td class="label">Non-Refundable Deposit:</td><td class="value">${amount}</td></tr>`);
    }
    
    // Check for contingency - IMPORTANT for listing agent
    if (data.para14_contingency === 'B') {
      details.push(`<tr style="background-color: #fff3cd;"><td class="label"><strong>⚠️ CONTINGENCY:</strong></td><td class="value"><strong>Buyer has a home to sell</strong></td></tr>`);
    } else if (data.para14_contingency === 'A') {
      details.push(`<tr><td class="label">Contingency:</td><td class="value">None - Not contingent on sale</td></tr>`);
    }
    
    // Check for included fixtures
    if (data.para13_items_included && data.para13_items_included.trim() !== '') {
      details.push(`<tr><td class="label">Items Requested to Stay:</td><td class="value">${data.para13_items_included}</td></tr>`);
    }
    
    // Check for excluded fixtures
    if (data.para13_items_excluded && data.para13_items_excluded.trim() !== '') {
      details.push(`<tr style="background-color: #ffebee;"><td class="label"><strong>Items That Do NOT Convey:</strong></td><td class="value"><strong>${data.para13_items_excluded}</strong></td></tr>`);
    }
    
    // Only return the section if there are details
    if (details.length === 0) {
      return '';
    }
    
    return `
    <div class="section">
      <div class="section-title">CONTRACT DETAILS</div>
      <div class="section-content">
        <table class="info-table">
          ${details.join('')}
        </table>
      </div>
    </div>`;
  }
}

export default AgentInfoSheetGenerator;