/**
 * Offer Sheet Formatter
 * Creates a professional HTML email from extracted contract data
 */

import { OfferSheetData } from './offer-sheet-extractor';

export class OfferSheetFormatter {
  
  /**
   * Format offer sheet data into a professional HTML email
   */
  formatOfferSheet(data: OfferSheetData): string {
    const sections: string[] = [];
    
    // Always include these core fields
    if (data.buyerNames) {
      sections.push(this.formatField('Buyer Name', data.buyerNames));
    }
    
    if (data.purchasePrice !== null) {
      sections.push(this.formatField('Purchase Price', this.formatCurrency(data.purchasePrice)));
    }
    
    // Seller Concessions - always show, N/A if null or 0
    if (data.sellerConcessions && data.sellerConcessions > 0) {
      sections.push(this.formatField('Seller Concessions', this.formatCurrency(data.sellerConcessions)));
    } else {
      sections.push(this.formatField('Seller Concessions', 'N/A'));
    }
    
    if (data.closeDate) {
      sections.push(this.formatField('Close Date', data.closeDate));
    }
    
    // Contingency - only if exists
    if (data.contingency) {
      sections.push(this.formatField('Contingency', data.contingency));
    }
    
    // Earnest Money - always show, N/A if null
    if (data.earnestMoney === null || data.earnestMoney === undefined) {
      sections.push(this.formatField('Earnest Money', 'N/A'));
    } else {
      sections.push(this.formatField('Earnest Money', data.earnestMoney ? 'Yes' : 'No'));
    }
    
    // Non-Refundable Deposit - always show, N/A if null
    if (data.nonRefundableDeposit === null || data.nonRefundableDeposit === undefined) {
      sections.push(this.formatField('Non-Refundable Deposit', 'N/A'));
    } else if (data.nonRefundableDeposit.exists) {
      const nrdText = data.nonRefundableDeposit.amount 
        ? `Yes - ${this.formatCurrency(data.nonRefundableDeposit.amount)}`
        : 'Yes';
      sections.push(this.formatField('Non-Refundable Deposit', nrdText));
    } else {
      sections.push(this.formatField('Non-Refundable Deposit', 'No'));
    }
    
    // Items to Convey - only if exists
    if (data.itemsToConvey) {
      sections.push(this.formatField('Items to Convey', data.itemsToConvey));
    }
    
    // Home Warranty - always show, N/A if null
    if (data.homeWarranty === null || data.homeWarranty === undefined) {
      sections.push(this.formatField('Home Warranty', 'N/A'));
    } else if (data.homeWarranty.included) {
      const warrantyText = data.homeWarranty.amount 
        ? `Yes - ${this.formatCurrency(data.homeWarranty.amount)}`
        : 'Yes';
      sections.push(this.formatField('Home Warranty', warrantyText));
    } else {
      sections.push(this.formatField('Home Warranty', 'No'));
    }
    
    // Survey - only if required
    if (data.survey.required) {
      const surveyText = data.survey.details || 'Yes';
      sections.push(this.formatField('Survey', surveyText));
    }
    
    return this.wrapInTemplate(sections);
  }
  
  private formatField(label: string, value: string): string {
    return `
      <div style="margin-bottom: 15px; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
        <span style="font-weight: 600; color: #333; display: inline-block; width: 180px;">
          ${label}:
        </span>
        <span style="color: #555; font-size: 16px;">
          ${value}
        </span>
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
  
  private wrapInTemplate(sections: string[]): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offer Summary</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px; font-weight: 600;">
      Offer Summary
    </h1>
    <p style="margin: 10px 0 0 0; opacity: 0.95; font-size: 14px;">
      Arkansas Real Estate Contract
    </p>
  </div>
  
  <!-- Content -->
  <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    
    <!-- Offer Details -->
    <div style="margin-bottom: 30px;">
      ${sections.join('')}
    </div>
    
    <!-- Footer Note -->
    <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #f0f0f0;">
      <p style="color: #666; font-size: 14px; margin: 0;">
        <strong>Note:</strong> This offer summary has been automatically generated from the attached contract. 
        Please review the original contract for complete details and terms.
      </p>
    </div>
    
    <!-- Attachment Reminder -->
    <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
      <p style="margin: 0; color: #555; font-size: 14px;">
        <strong>📎 Attachment:</strong> The original contract PDF is attached to this email for your review and forwarding.
      </p>
    </div>
    
  </div>
  
  <!-- Signature -->
  <div style="margin-top: 20px; padding: 20px; text-align: center; color: #999; font-size: 12px;">
    <p style="margin: 5px 0;">
      Generated by Arkansas Contract Agent
    </p>
    <p style="margin: 5px 0;">
      ${new Date().toLocaleString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}
    </p>
  </div>
  
</body>
</html>
    `;
  }
  
  /**
   * Create a plain text version of the offer sheet
   */
  formatPlainText(data: OfferSheetData): string {
    const lines: string[] = [
      'OFFER SUMMARY',
      '=' .repeat(40),
      ''
    ];
    
    if (data.buyerNames) {
      lines.push(`Buyer Name: ${data.buyerNames}`);
      lines.push('');
    }
    
    if (data.purchasePrice !== null) {
      lines.push(`Purchase Price: ${this.formatCurrency(data.purchasePrice)}`);
      lines.push('');
    }
    
    // Seller Concessions - always show, N/A if null or 0
    if (data.sellerConcessions && data.sellerConcessions > 0) {
      lines.push(`Seller Concessions: ${this.formatCurrency(data.sellerConcessions)}`);
    } else {
      lines.push('Seller Concessions: N/A');
    }
    lines.push('');
    
    if (data.closeDate) {
      lines.push(`Close Date: ${data.closeDate}`);
      lines.push('');
    }
    
    if (data.contingency) {
      lines.push(`Contingency: ${data.contingency}`);
      lines.push('');
    }
    
    // Earnest Money - always show, N/A if null
    if (data.earnestMoney === null || data.earnestMoney === undefined) {
      lines.push('Earnest Money: N/A');
    } else {
      lines.push(`Earnest Money: ${data.earnestMoney ? 'Yes' : 'No'}`);
    }
    lines.push('');
    
    // Non-Refundable Deposit - always show, N/A if null
    if (data.nonRefundableDeposit === null || data.nonRefundableDeposit === undefined) {
      lines.push('Non-Refundable Deposit: N/A');
    } else if (data.nonRefundableDeposit.exists) {
      const nrdText = data.nonRefundableDeposit.amount 
        ? `Yes - ${this.formatCurrency(data.nonRefundableDeposit.amount)}`
        : 'Yes';
      lines.push(`Non-Refundable Deposit: ${nrdText}`);
    } else {
      lines.push('Non-Refundable Deposit: No');
    }
    lines.push('');
    
    if (data.itemsToConvey) {
      lines.push(`Items to Convey: ${data.itemsToConvey}`);
      lines.push('');
    }
    
    // Home Warranty - always show, N/A if null
    if (data.homeWarranty === null || data.homeWarranty === undefined) {
      lines.push('Home Warranty: N/A');
    } else if (data.homeWarranty.included) {
      const warrantyText = data.homeWarranty.amount 
        ? `Yes - ${this.formatCurrency(data.homeWarranty.amount)}`
        : 'Yes';
      lines.push(`Home Warranty: ${warrantyText}`);
    } else {
      lines.push('Home Warranty: No');
    }
    lines.push('');
    
    if (data.survey.required) {
      const surveyText = data.survey.details || 'Yes';
      lines.push(`Survey: ${surveyText}`);
      lines.push('');
    }
    
    lines.push('-'.repeat(40));
    lines.push('');
    lines.push('Note: Please review the attached original contract for complete details.');
    
    return lines.join('\n');
  }
}