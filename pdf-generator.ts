/**
 * PDF Generator for Seller Net Sheets
 * Creates professional, branded PDF documents for sellers
 * Uses PDFKit for reliable PDF generation without browser dependencies
 */

import PDFDocument from 'pdfkit';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
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
   * Generate a professional PDF net sheet using PDFKit
   */
  async generateNetSheetPDF(netSheetData: any, propertyAddress: string, contractData?: any): Promise<{ path: string; type: 'pdf' | 'html' }> {
    // Clean address for filename
    const cleanAddress = propertyAddress
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, '_')
      .trim();
    
    const fileName = `netsheet_${cleanAddress}.pdf`;
    const filePath = path.join(this.outputDir, fileName);
    
    try {
      console.log('🚀 Generating PDF with PDFKit (browser-free)...');
      
      await new Promise<void>((resolve, reject) => {
        // Create PDF document
        const doc = new PDFDocument({
          size: 'LETTER',
          margin: 50,
          info: {
            Title: `Seller Net Sheet - ${propertyAddress}`,
            Author: 'Arkansas Contract System',
            Subject: 'Seller Net Sheet'
          }
        });
        
        // Pipe to file
        const stream = fsSync.createWriteStream(filePath);
        doc.pipe(stream);
        
        // Helper function for currency formatting
        const formatCurrency = (value: number) => {
          return `$${(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        };
        
        const today = new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        
        const buyerNames = contractData?.buyers || 'N/A';
        const closingDate = contractData?.closing_date || netSheetData.closing_date || 'TBD';
        
        // Header with gradient effect (simulated)
        doc.rect(0, 0, 612, 100)
           .fill('#667eea');
        
        doc.fontSize(28)
           .font('Helvetica-Bold')
           .fillColor('#ffffff')
           .text('SELLER NET SHEET', 0, 30, { align: 'center', width: 612 });
        
        doc.fontSize(12)
           .font('Helvetica')
           .text('PROFESSIONAL ESTIMATE', 0, 65, { align: 'center', width: 612 });
        
        // Reset color for body
        doc.fillColor('#000000');
        
        // Property Info Section
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Property Information', 50, 130);
        
        doc.fontSize(11)
           .font('Helvetica');
        
        // Property details
        doc.text(`Address: ${propertyAddress}`, 50, 160);
        doc.text(`Date: ${today}`, 50, 180);
        doc.text(`Buyers: ${buyerNames}`, 50, 200);
        doc.text(`Closing Date: ${closingDate}`, 50, 220);
        
        // Sales Price Section
        doc.rect(50, 250, 512, 40)
           .fillAndStroke('#f5f5f5', '#cccccc');
        
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#000000')
           .text('Sales Price', 60, 265, { continued: true, width: 400 })
           .text(formatCurrency(netSheetData.sales_price || 0), { align: 'right', width: 440 });
        
        // Seller Costs Section
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#d32f2f')
           .text('LESS SELLER COSTS:', 50, 310);
        
        let yPosition = 340;
        
        // Cost items
        const costs = [
          { label: 'Seller Concessions', value: netSheetData.seller_concessions || 0 },
          { label: 'Taxes Prorated', value: netSheetData.taxes_prorated || 0, note: netSheetData.taxDaysNote },
          { label: 'Commission - Seller', value: netSheetData.commission_seller || 0, note: netSheetData.commission_percent ? `${netSheetData.commission_percent}% of sales price` : null },
          { label: 'Buyer Agency Fees', value: netSheetData.buyer_agency_fees || 0 },
          { label: 'Closing Fee', value: netSheetData.closing_fee || 0 },
          { label: 'Title Search', value: netSheetData.title_search || 0 },
          { label: 'Title Insurance', value: netSheetData.title_insurance || 0 },
          { label: 'Title & Recording Fees', value: netSheetData.title_recording_fees || 0 },
          { label: 'Pest Transfer', value: netSheetData.pest_transfer || 0 },
          { label: 'Tax Stamps', value: netSheetData.tax_stamps || 0, note: 'Purchase price × 0.0033 ÷ 2' },
          { label: 'Home Warranty', value: netSheetData.home_warranty || 0 }
        ];
        
        doc.fontSize(11)
           .font('Helvetica')
           .fillColor('#000000');
        
        costs.forEach(cost => {
          if (cost.value > 0 || cost.label === 'Seller Concessions') {
            doc.text(cost.label, 70, yPosition);
            if (cost.note) {
              doc.fontSize(9)
                 .fillColor('#666666')
                 .text(`(${cost.note})`, 250, yPosition);
              doc.fontSize(11)
                 .fillColor('#000000');
            }
            doc.text(formatCurrency(cost.value), 450, yPosition, { align: 'right', width: 100 });
            yPosition += 22;
          }
        });
        
        // Total line
        yPosition += 10;
        doc.moveTo(50, yPosition)
           .lineTo(562, yPosition)
           .stroke();
        
        yPosition += 15;
        
        // Total Costs
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('TOTAL COSTS', 70, yPosition)
           .fillColor('#d32f2f')
           .text(formatCurrency(netSheetData.total_costs || 0), 450, yPosition, { align: 'right', width: 100 });
        
        yPosition += 40;
        
        // Net to Seller Box
        doc.rect(50, yPosition, 512, 50)
           .fillAndStroke('#e8f5e9', '#4caf50');
        
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .fillColor('#2e7d32')
           .text('ESTIMATED NET TO SELLER', 60, yPosition + 15, { continued: true, width: 350 })
           .text(formatCurrency(netSheetData.cash_to_seller || 0), { align: 'right', width: 440 });
        
        // Tax Warning if applicable
        if (netSheetData.taxWarning) {
          yPosition += 70;
          doc.rect(50, yPosition, 512, 40)
             .fillAndStroke('#fff3e0', '#ff9800');
          
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor('#e65100')
             .text('⚠️ TAX ESTIMATE WARNING', 60, yPosition + 8);
          
          doc.fontSize(9)
             .font('Helvetica')
             .fillColor('#000000')
             .text('Using default $10/day. Actual tax amount may vary significantly.', 60, yPosition + 22);
        }
        
        // Disclaimer at bottom
        doc.fontSize(9)
           .font('Helvetica-Oblique')
           .fillColor('#666666')
           .text('* This is an estimate only and not a guarantee of actual costs or proceeds.', 50, 680, { align: 'center', width: 512 });
        doc.text('Actual costs may vary. Please consult with your closing agent for final figures.', 50, 695, { align: 'center', width: 512 });
        
        // Footer
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#999999')
           .text(`Generated on ${today} by Arkansas Contract System`, 50, 720, { align: 'center', width: 512 });
        
        // Finalize PDF
        doc.end();
        
        stream.on('finish', () => {
          console.log(`✅ Net sheet PDF generated successfully: ${filePath}`);
          resolve();
        });
        
        stream.on('error', (err) => {
          console.error('Stream error:', err);
          reject(err);
        });
      });
      
      return { path: filePath, type: 'pdf' };
      
    } catch (error: any) {
      console.error('⚠️ Failed to generate PDF:', error.message);
      
      // Fallback to HTML only if PDF generation completely fails
      const htmlContent = this.generateHTML(netSheetData, propertyAddress, contractData);
      const htmlPath = filePath.replace('.pdf', '.html');
      await fs.writeFile(htmlPath, htmlContent);
      console.log(`📄 Net sheet saved as HTML (PDF generation failed): ${htmlPath}`);
      return { path: htmlPath, type: 'html' };
    }
  }
  
  /**
   * Generate HTML content as fallback
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
      font-size: 28px;
      margin-bottom: 5px;
      font-weight: 500;
      letter-spacing: 1px;
    }
    
    .header .subtitle {
      color: #7f8c8d;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
    
    .section {
      margin-bottom: 30px;
    }
    
    .section-title {
      font-size: 18px;
      color: #2c3e50;
      margin-bottom: 15px;
      padding-bottom: 5px;
      border-bottom: 2px solid #ecf0f1;
    }
    
    .line-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #ecf0f1;
    }
    
    .line-item .label {
      color: #555;
    }
    
    .line-item .value {
      font-weight: 500;
      color: #2c3e50;
    }
    
    .total-line {
      display: flex;
      justify-content: space-between;
      padding: 15px 0;
      border-top: 2px solid #e74c3c;
      border-bottom: 2px solid #e74c3c;
      margin: 20px 0;
      font-size: 18px;
      font-weight: bold;
    }
    
    .total-line .label {
      color: #e74c3c;
    }
    
    .total-line .value {
      color: #e74c3c;
    }
    
    .net-amount {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      color: white;
      padding: 25px;
      border-radius: 10px;
      text-align: center;
      margin: 30px 0;
      box-shadow: 0 10px 20px rgba(0,0,0,0.15);
    }
    
    .net-amount .label {
      font-size: 16px;
      margin-bottom: 10px;
      opacity: 0.9;
    }
    
    .net-amount .amount {
      font-size: 36px;
      font-weight: bold;
    }
    
    .warning {
      background: #fff3e0;
      border-left: 4px solid #ff9800;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
    }
    
    .warning .title {
      color: #e65100;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .disclaimer {
      text-align: center;
      color: #7f8c8d;
      font-size: 12px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ecf0f1;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SELLER NET SHEET</h1>
      <div class="subtitle">Professional Estimate</div>
    </div>
    
    <div class="property-info">
      <h2>${propertyAddress}</h2>
      <div class="date">Prepared: ${today}</div>
      <div>Buyers: ${buyerNames}</div>
      <div>Closing Date: ${closingDate}</div>
    </div>
    
    <div class="section">
      <div class="section-title">Transaction Details</div>
      <div class="line-item">
        <span class="label">Sales Price</span>
        <span class="value">${formatCurrency(netSheetData.sales_price || 0)}</span>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title" style="color: #e74c3c;">Less Seller Costs</div>
      ${netSheetData.seller_concessions > 0 ? `
      <div class="line-item">
        <span class="label">Seller Concessions</span>
        <span class="value">${formatCurrency(netSheetData.seller_concessions)}</span>
      </div>` : ''}
      ${netSheetData.taxes_prorated > 0 ? `
      <div class="line-item">
        <span class="label">Taxes Prorated ${netSheetData.taxDaysNote ? `(${netSheetData.taxDaysNote})` : ''}</span>
        <span class="value">${formatCurrency(netSheetData.taxes_prorated)}</span>
      </div>` : ''}
      ${netSheetData.commission_seller > 0 ? `
      <div class="line-item">
        <span class="label">Commission - Seller ${netSheetData.commission_percent ? `(${netSheetData.commission_percent}%)` : ''}</span>
        <span class="value">${formatCurrency(netSheetData.commission_seller)}</span>
      </div>` : ''}
      ${netSheetData.buyer_agency_fees > 0 ? `
      <div class="line-item">
        <span class="label">Buyer Agency Fees</span>
        <span class="value">${formatCurrency(netSheetData.buyer_agency_fees)}</span>
      </div>` : ''}
      <div class="line-item">
        <span class="label">Closing Fee</span>
        <span class="value">${formatCurrency(netSheetData.closing_fee || 0)}</span>
      </div>
      <div class="line-item">
        <span class="label">Title Search</span>
        <span class="value">${formatCurrency(netSheetData.title_search || 0)}</span>
      </div>
      <div class="line-item">
        <span class="label">Title Insurance</span>
        <span class="value">${formatCurrency(netSheetData.title_insurance || 0)}</span>
      </div>
      <div class="line-item">
        <span class="label">Title & Recording Fees</span>
        <span class="value">${formatCurrency(netSheetData.title_recording_fees || 0)}</span>
      </div>
      <div class="line-item">
        <span class="label">Pest Transfer</span>
        <span class="value">${formatCurrency(netSheetData.pest_transfer || 0)}</span>
      </div>
      <div class="line-item">
        <span class="label">Tax Stamps</span>
        <span class="value">${formatCurrency(netSheetData.tax_stamps || 0)}</span>
      </div>
      ${netSheetData.home_warranty > 0 ? `
      <div class="line-item">
        <span class="label">Home Warranty</span>
        <span class="value">${formatCurrency(netSheetData.home_warranty)}</span>
      </div>` : ''}
    </div>
    
    <div class="total-line">
      <span class="label">TOTAL COSTS</span>
      <span class="value">${formatCurrency(netSheetData.total_costs || 0)}</span>
    </div>
    
    <div class="net-amount">
      <div class="label">ESTIMATED NET TO SELLER</div>
      <div class="amount">${formatCurrency(netSheetData.cash_to_seller || 0)}</div>
    </div>
    
    ${hasTaxWarning ? `
    <div class="warning">
      <div class="title">⚠️ Tax Estimate Warning</div>
      <div>Using default estimate of $10/day for property taxes. Actual tax amount may vary significantly based on property assessment.</div>
    </div>` : ''}
    
    <div class="disclaimer">
      <p>* This is an estimate only and not a guarantee of actual costs or proceeds.</p>
      <p>Actual costs may vary. Please consult with your closing agent for final figures.</p>
      <p style="margin-top: 20px;">Generated on ${today}</p>
    </div>
  </div>
</body>
</html>`;
  }
}

// Export for use in other modules
export default PDFGenerator;