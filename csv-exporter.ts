/**
 * CSV Exporter for Seller Net Sheets
 * Creates CSV files that can be easily imported to Google Sheets
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export class CSVExporter {
  private outputDir: string = 'net_sheets_csv';
  
  constructor() {
    this.ensureOutputDir();
  }
  
  private async ensureOutputDir() {
    await fs.mkdir(this.outputDir, { recursive: true });
  }
  
  /**
   * Export net sheet data to CSV format
   */
  async exportNetSheet(netSheetData: any, propertyAddress: string, contractData?: any): Promise<string> {
    // Clean address for filename - same format as PDF
    const cleanAddress = propertyAddress
      .replace(/[^a-zA-Z0-9\s]/g, ' ')  // Replace special chars with spaces
      .replace(/\s+/g, '_')              // Replace spaces with underscores
      .trim();                           // Remove leading/trailing spaces
    
    // Use the format: netsheet_address.csv
    const fileName = `netsheet_${cleanAddress}.csv`;
    const filePath = path.join(this.outputDir, fileName);
    
    // Create CSV content
    const csvLines: string[] = [];
    
    // Header
    csvLines.push('SELLER NET SHEET');
    csvLines.push('');
    csvLines.push(`Property Address:,${propertyAddress}`);
    csvLines.push(`Date:,${new Date().toLocaleDateString()}`);
    csvLines.push('');
    
    // Financial Details
    csvLines.push('Item,Calculation,Amount');
    csvLines.push(`Sales Price,,${this.formatCurrency(netSheetData.sales_price)}`);
    csvLines.push('');
    csvLines.push('LESS SELLER COSTS:');
    csvLines.push(`Seller Concessions,,${this.formatCurrency(netSheetData.seller_concessions)}`);
    csvLines.push(`Taxes Prorated,"${netSheetData.days_of_tax} days @ ${this.formatCurrency(netSheetData.tax_per_day)}/day",${this.formatCurrency(netSheetData.taxes_prorated)}`);
    csvLines.push(`Commission - Seller,3% of sales price,${this.formatCurrency(netSheetData.commission_seller)}`);
    csvLines.push(`Buyer Agency Fees,,${this.formatCurrency(netSheetData.buyer_agency_fees)}`);
    csvLines.push(`Closing Fee,,${this.formatCurrency(netSheetData.closing_fee)}`);
    csvLines.push(`Title Search,,${this.formatCurrency(netSheetData.title_search)}`);
    csvLines.push(`Title Insurance,,${this.formatCurrency(netSheetData.title_insurance)}`);
    csvLines.push(`Title & Recording Fees,,${this.formatCurrency(netSheetData.title_recording_fees)}`);
    csvLines.push(`Pest Transfer,,${this.formatCurrency(netSheetData.pest_transfer)}`);
    csvLines.push(`Tax Stamps,Purchase price × 0.0033 ÷ 2,${this.formatCurrency(netSheetData.tax_stamps)}`);
    csvLines.push(`Home Warranty,,${this.formatCurrency(netSheetData.home_warranty)}`);
    csvLines.push('');
    csvLines.push(`TOTAL COSTS,,${this.formatCurrency(netSheetData.total_costs)}`);
    csvLines.push('');
    csvLines.push(`ESTIMATED NET TO SELLER,,${this.formatCurrency(netSheetData.cash_to_seller)}`);
    
    // Write to file
    await fs.writeFile(filePath, csvLines.join('\n'), 'utf8');
    
    console.log(`📄 CSV net sheet saved: ${filePath}`);
    return filePath;
  }
  
  private formatCurrency(value: number): string {
    return `$${(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export default CSVExporter;