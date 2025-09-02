/**
 * PDF Generator using PDFKit - Works without browser
 * Reliable for server environments like Railway
 */

import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

export class PDFGeneratorKit {
  private outputDir: string = 'net_sheets_pdf';
  
  constructor() {
    this.ensureOutputDir();
  }
  
  private ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }
  
  /**
   * Generate a professional PDF net sheet using PDFKit
   */
  async generateNetSheetPDF(netSheetData: any, propertyAddress: string, contractData?: any): Promise<{ path: string; type: 'pdf' }> {
    // Clean address for filename
    const cleanAddress = propertyAddress
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, '_')
      .trim();
    
    const fileName = `netsheet_${cleanAddress}.pdf`;
    const filePath = path.join(this.outputDir, fileName);
    
    return new Promise((resolve, reject) => {
      try {
        console.log('🚀 Generating PDF with PDFKit (no browser needed)...');
        
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
        const stream = fs.createWriteStream(filePath);
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
        
        // Header
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fillColor('#2c3e50')
           .text('SELLER NET SHEET', { align: 'center' });
        
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#7f8c8d')
           .text('PROFESSIONAL ESTIMATE', { align: 'center' });
        
        doc.moveDown(2);
        
        // Property Info Box
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#000000')
           .text('Property Information', { underline: true });
        
        doc.moveDown(0.5);
        
        doc.fontSize(11)
           .font('Helvetica')
           .text(`Address: ${propertyAddress}`);
        doc.text(`Date: ${today}`);
        if (contractData?.buyers) {
          doc.text(`Buyers: ${contractData.buyers}`);
        }
        if (contractData?.closing_date || netSheetData.closing_date) {
          doc.text(`Closing Date: ${contractData?.closing_date || netSheetData.closing_date || 'TBD'}`);
        }
        
        doc.moveDown(2);
        
        // Sales Price
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('Sales Price', 50, doc.y, { continued: true })
           .text(formatCurrency(netSheetData.sales_price || 0), { align: 'right' });
        
        doc.moveDown();
        
        // Seller Costs Section
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#d32f2f')
           .text('LESS SELLER COSTS:', { underline: true });
        
        doc.moveDown(0.5);
        
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
          if (cost.value > 0) {
            const y = doc.y;
            doc.text(cost.label, 70, y);
            if (cost.note) {
              doc.fontSize(9)
                 .fillColor('#666666')
                 .text(`(${cost.note})`, 250, y);
            }
            doc.fontSize(11)
               .fillColor('#000000')
               .text(formatCurrency(cost.value), 450, y, { align: 'right' });
            doc.moveDown(0.7);
          }
        });
        
        doc.moveDown();
        
        // Total line
        doc.moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        
        doc.moveDown(0.5);
        
        // Total Costs
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('TOTAL COSTS', 50, doc.y, { continued: true })
           .fillColor('#d32f2f')
           .text(formatCurrency(netSheetData.total_costs || 0), { align: 'right' });
        
        doc.moveDown(2);
        
        // Double line before net
        doc.moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        doc.moveTo(50, doc.y + 2)
           .lineTo(550, doc.y + 2)
           .stroke();
        
        doc.moveDown();
        
        // Estimated Net to Seller
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .fillColor('#2e7d32')
           .text('ESTIMATED NET TO SELLER', 50, doc.y, { continued: true })
           .text(formatCurrency(netSheetData.cash_to_seller || 0), { align: 'right' });
        
        doc.moveDown(3);
        
        // Disclaimer
        doc.fontSize(9)
           .font('Helvetica-Oblique')
           .fillColor('#666666')
           .text('* This is an estimate only and not a guarantee of actual costs or proceeds.', { align: 'center' });
        doc.text('Actual costs may vary. Please consult with your closing agent for final figures.', { align: 'center' });
        
        // Add footer
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#999999')
           .text(`Generated on ${today}`, 50, 700, { align: 'center' });
        
        // Finalize PDF
        doc.end();
        
        stream.on('finish', () => {
          console.log(`✅ Net sheet PDF generated successfully: ${filePath}`);
          resolve({ path: filePath, type: 'pdf' });
        });
        
        stream.on('error', (err) => {
          console.error('Stream error:', err);
          reject(err);
        });
        
      } catch (error) {
        console.error('❌ Failed to generate PDF with PDFKit:', error);
        reject(error);
      }
    });
  }
}