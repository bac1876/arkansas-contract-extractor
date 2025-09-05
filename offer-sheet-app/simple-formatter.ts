/**
 * Simple Offer Sheet Formatter
 * Creates HTML email from simple extracted data
 */

import { OfferSheetData } from './offer-sheet-imagemagick-extractor';

export class SimpleFormatter {
  
  formatOfferSheet(data: OfferSheetData): string {
    const sections: string[] = [];
    
    // Add buyer fields - handle multiple buyers
    if (data.buyerNames) {
      const buyers = data.buyerNames.split(' and ');
      if (buyers.length > 1) {
        buyers.forEach((buyer, index) => {
          sections.push(this.formatField(`Buyer ${index + 1}`, buyer.trim()));
        });
      } else {
        sections.push(this.formatField('Buyer', data.buyerNames));
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
    
    // Add agent info at the bottom if available
    if (data.sellingAgentName || data.sellingAgentPhone) {
      const agentInfo = [
        data.sellingAgentName,
        data.sellingAgentPhone
      ].filter(Boolean).join(' - ');
      
      if (agentInfo) {
        sections.push(`
          <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
            <div class="field">
              <span class="label" style="font-weight: 600;">Selling Agent: </span>
              <span class="value">${agentInfo}</span>
            </div>
          </div>
        `);
      }
    }
    
    // Build HTML email
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .header p {
            font-size: 18px;
            font-weight: bold;
            margin: 10px 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
            border-top: none;
          }
          .field {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .field:last-child {
            border-bottom: none;
          }
          .label {
            font-weight: 600;
            color: #555;
          }
          .value {
            color: #333;
            text-align: right;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          
          /* Mobile Responsive Styles */
          @media screen and (max-width: 600px) {
            body {
              padding: 10px;
            }
            .header {
              padding: 20px;
            }
            .header h1 {
              font-size: 24px;
            }
            .header p {
              font-size: 14px;
              word-break: break-word;
            }
            .content {
              padding: 20px;
            }
            .field {
              flex-direction: column;
              align-items: flex-start;
              padding: 10px 0;
            }
            .label {
              margin-bottom: 5px;
              font-size: 14px;
            }
            .value {
              text-align: left;
              font-size: 14px;
              word-break: break-word;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Offer Summary</h1>
          <p>${data.propertyAddress || 'Property Address Not Available'}</p>
        </div>
        
        <div class="content">
          ${sections.join('')}
        </div>
        
        <div class="footer">
          <p>Generated by Arkansas Contract Agent</p>
          <p>${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
    
    return html;
  }
  
  formatPlainText(data: OfferSheetData): string {
    const lines: string[] = ['OFFER SUMMARY'];
    
    if (data.propertyAddress) {
      lines.push(`Property: ${data.propertyAddress}`);
    }
    lines.push(''); // blank line after header
    
    // Handle multiple buyers
    if (data.buyerNames) {
      const buyers = data.buyerNames.split(' and ');
      if (buyers.length > 1) {
        buyers.forEach((buyer, index) => {
          lines.push(`Buyer ${index + 1}: ${buyer.trim()}`);
        });
      } else {
        lines.push(`Buyer: ${data.buyerNames}`);
      }
    }
    
    if (data.purchasePrice !== null) lines.push(`Purchase Price: ${this.formatCurrency(data.purchasePrice)}`);
    if (data.sellerConcessions !== null && data.sellerConcessions > 0) {
      lines.push(`Seller Concessions: ${this.formatCurrency(data.sellerConcessions)}`);
    }
    if (data.closeDate) lines.push(`Close Date: ${data.closeDate}`);
    if (data.loanType) lines.push(`Loan Type: ${data.loanType}`);
    if (data.contingency) lines.push(`Contingency: ${data.contingency}`);
    if (data.earnestMoney) lines.push(`Earnest Money: ${data.earnestMoney}`);
    if (data.nonRefundableDeposit) lines.push(`Non-Refundable Deposit: ${data.nonRefundableDeposit}`);
    if (data.itemsToConvey) lines.push(`Items to Convey: ${data.itemsToConvey}`);
    if (data.homeWarranty) lines.push(`Home Warranty: ${data.homeWarranty}`);
    if (data.survey) lines.push(`Survey: ${data.survey}`);
    
    // Add agent info at the bottom
    if (data.sellingAgentName || data.sellingAgentPhone) {
      lines.push(''); // blank line
      lines.push('---');
      const agentInfo = [
        data.sellingAgentName,
        data.sellingAgentPhone
      ].filter(Boolean).join(' - ');
      if (agentInfo) {
        lines.push(`Selling Agent: ${agentInfo}`);
      }
    }
    
    return lines.join('\n');
  }
  
  private formatField(label: string, value: string): string {
    return `
      <div class="field">
        <span class="label">${label}: </span>
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