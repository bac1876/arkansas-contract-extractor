/**
 * Offer Sheet PDF Generator
 * Generates PDF version of the offer sheet for email attachment
 */

import { chromium } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';
import { OfferSheetData } from './offer-sheet-imagemagick-extractor';

export class OfferSheetPDFGenerator {
  private outputDir: string = 'offer-sheet-app/generated-pdfs';
  
  constructor() {
    this.ensureOutputDir();
  }
  
  private async ensureOutputDir() {
    await fs.mkdir(this.outputDir, { recursive: true });
  }
  
  /**
   * Generate offer sheet PDF from extracted data
   * Returns the path to the generated PDF file
   */
  async generateOfferSheetPDF(data: OfferSheetData): Promise<string> {
    // Clean address for filename
    const cleanAddress = (data.propertyAddress || 'unknown_property')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, '_')
      .trim();
    
    // Create filename: "Offer Sheet [address].pdf" without timestamp
    const fileName = `Offer Sheet ${cleanAddress.replace(/_/g, ' ')}.pdf`;
    const filePath = path.join(this.outputDir, fileName);
    
    // Generate HTML content with enhanced styling for PDF
    const htmlContent = this.generatePDFHTML(data);
    
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
      
      console.log(`📄 Offer sheet PDF generated: ${filePath}`);
      return filePath;
      
    } catch (error) {
      console.error('Error generating offer sheet PDF:', error);
      throw error;
    }
  }
  
  private generatePDFHTML(data: OfferSheetData): string {
    const sections: string[] = [];
    
    // Add buyer fields - handle multiple buyers and shared last names
    if (data.buyerNames) {
      let buyerNames = data.buyerNames;
      
      // Check for shared last name pattern: "FirstName and FirstName LastName"
      const sharedLastNamePattern = /^([A-Za-z]+)\s+and\s+([A-Za-z]+)\s+([A-Za-z]+)$/;
      const match = buyerNames.match(sharedLastNamePattern);
      
      if (match) {
        // Expand to "FirstName1 LastName and FirstName2 LastName"
        buyerNames = `${match[1]} ${match[3]} and ${match[2]} ${match[3]}`;
      }
      
      const buyers = buyerNames.split(' and ');
      if (buyers.length > 1) {
        buyers.forEach((buyer, index) => {
          sections.push(this.formatField(`Buyer ${index + 1}`, buyer.trim()));
        });
      } else {
        sections.push(this.formatField('Buyer', buyerNames));
      }
    }
    
    if (data.purchasePrice !== null) {
      sections.push(this.formatField('Purchase Price', this.formatCurrency(data.purchasePrice)));
    }
    
    if (data.sellerConcessions !== null && data.sellerConcessions > 0) {
      sections.push(this.formatField('Seller Concessions', this.formatCurrency(data.sellerConcessions)));
    }
    
    if (data.closeDate) {
      sections.push(this.formatField('Close Date', data.closeDate));
    }
    
    if (data.loanType) {
      sections.push(this.formatField('Loan Type', data.loanType));
    }
    
    if (data.contingency) {
      sections.push(this.formatField('Contingency', data.contingency));
    }
    
    if (data.earnestMoney) {
      sections.push(this.formatField('Earnest Money', data.earnestMoney));
    }
    
    if (data.nonRefundableDeposit) {
      sections.push(this.formatField('Non-Refundable Deposit', data.nonRefundableDeposit));
    }
    
    if (data.itemsToConvey) {
      sections.push(this.formatField('Items to Convey', data.itemsToConvey));
    }
    
    if (data.homeWarranty) {
      sections.push(this.formatField('Home Warranty', data.homeWarranty));
    }
    
    if (data.survey) {
      sections.push(this.formatField('Survey', data.survey));
    }
    
    if (data.otherTerms) {
      sections.push(this.formatField('Other', data.otherTerms));
    }
    
    // Add agent info at the bottom if available
    if (data.sellingAgentName || data.sellingAgentPhone) {
      const agentInfo = [
        data.sellingAgentName,
        data.sellingAgentPhone
      ].filter(Boolean).join(' - ');
      
      if (agentInfo) {
        sections.push(`
          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
            <div class="field">
              <span class="label">Selling Agent:</span>
              <span class="value">${agentInfo}</span>
            </div>
          </div>
        `);
      }
    }
    
    // Build HTML for PDF with print-optimized styles
    const html = `
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
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            padding: 20px;
          }
          
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            text-align: center;
            border-radius: 10px;
            margin-bottom: 20px;
          }
          
          .header h1 {
            font-size: 32px;
            margin-bottom: 10px;
            font-weight: 600;
          }
          
          .header .property-address {
            font-size: 20px;
            font-weight: 500;
            margin-top: 10px;
          }
          
          .content {
            background: #ffffff;
            padding: 25px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
          }
          
          .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #555;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
          }
          
          .field {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #f0f0f0;
          }
          
          .field:last-child {
            border-bottom: none;
          }
          
          .label {
            font-weight: 500;
            color: #666;
            flex: 0 0 40%;
          }
          
          .value {
            color: #333;
            font-weight: 400;
            flex: 0 0 60%;
            text-align: right;
          }
          
          @media print {
            body {
              padding: 0;
            }
            
            .header {
              break-inside: avoid;
            }
            
            .content {
              break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>OFFER SUMMARY</h1>
          <div class="property-address">${data.propertyAddress || 'Property Address Not Available'}</div>
        </div>
        
        <div class="content">
          <div class="section-title">Contract Details</div>
          ${sections.join('')}
        </div>
      </body>
      </html>
    `;
    
    return html;
  }
  
  private formatField(label: string, value: string): string {
    return `
      <div class="field">
        <span class="label">${label}</span>
        <span class="value">${value}</span>
      </div>
    `;
  }
  
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}