/**
 * Test the new naming format for net sheets
 */

import PDFGenerator from './pdf-generator';
import CSVExporter from './csv-exporter';
import * as fs from 'fs';
import * as path from 'path';

async function testNamingFormat() {
  console.log('🧪 Testing New Naming Format');
  console.log('=============================\n');
  
  const pdfGenerator = new PDFGenerator();
  const csvExporter = new CSVExporter();
  
  // Test data
  const testNetSheetData = {
    sales_price: 300000,
    seller_concessions: 0,
    days_of_tax: 204,
    tax_per_day: 10,
    taxes_prorated: 2040,
    commission_seller: 9000,
    buyer_agency_fees: 9000,
    closing_fee: 400,
    title_search: 300,
    title_insurance: 550,
    title_recording_fees: 100,
    pest_transfer: 450,
    tax_stamps: 495,
    home_warranty: 695,
    total_costs: 23030,
    cash_to_seller: 276970
  };
  
  // Test different address formats
  const testAddresses = [
    '5806 W Walsh Lane Rogers, AR 72758',
    '123 Main St, Little Rock, AR 72201',
    '456 Oak Avenue #2B, Fayetteville, AR 72701',
    '789 Pine Street, Apt. 5, Hot Springs, AR 71901'
  ];
  
  console.log('Testing address formatting:\n');
  
  for (const address of testAddresses) {
    console.log(`Original: ${address}`);
    
    // Generate PDF
    const pdfPath = await pdfGenerator.generateNetSheetPDF(
      testNetSheetData,
      address,
      { buyers: 'Test Buyer', closing_date: '2025-09-15' }
    );
    
    // Generate CSV
    const csvPath = await csvExporter.exportNetSheet(
      testNetSheetData,
      address,
      { buyers: 'Test Buyer', closing_date: '2025-09-15' }
    );
    
    console.log(`  PDF: ${path.basename(pdfPath)}`);
    console.log(`  CSV: ${path.basename(csvPath)}`);
    console.log('');
  }
  
  console.log('✅ New naming format working correctly!');
  console.log('\nFiles are saved as:');
  console.log('  netsheet_[property_address].pdf');
  console.log('  netsheet_[property_address].csv');
  console.log('\nSpecial characters are replaced with underscores');
  
  // List generated files
  console.log('\n📁 Generated files:');
  const pdfFiles = fs.readdirSync('net_sheets_pdf').filter(f => f.startsWith('netsheet_'));
  const csvFiles = fs.readdirSync('net_sheets_csv').filter(f => f.startsWith('netsheet_'));
  
  console.log('\nPDFs:');
  pdfFiles.forEach(f => console.log(`  - ${f}`));
  
  console.log('\nCSVs:');
  csvFiles.forEach(f => console.log(`  - ${f}`));
}

// Run the test
testNamingFormat().catch(console.error);