/**
 * Test uploading PDF and CSV files to Google Drive
 */

import GoogleDriveIntegration from './google-drive-integration';
import PDFGenerator from './pdf-generator';
import CSVExporter from './csv-exporter';
import * as dotenv from 'dotenv';

dotenv.config();

async function testDriveUpload() {
  console.log('🧪 Testing Google Drive File Upload');
  console.log('====================================\n');
  
  try {
    // Initialize services
    const googleDrive = new GoogleDriveIntegration();
    await googleDrive.initialize();
    console.log('✅ Google Drive initialized\n');
    
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
    
    const testPropertyAddress = '5806 W Walsh Lane Rogers, AR 72758';
    const testContractData = {
      buyers: 'Brian Curtis, Lisa Brown',
      closing_date: '2025-09-15',
      purchase_price: 300000
    };
    
    console.log('📑 Generating PDF...');
    const pdfPath = await pdfGenerator.generateNetSheetPDF(
      testNetSheetData,
      testPropertyAddress,
      testContractData
    );
    console.log(`   Created: ${pdfPath}\n`);
    
    console.log('📄 Generating CSV...');
    const csvPath = await csvExporter.exportNetSheet(
      testNetSheetData,
      testPropertyAddress,
      testContractData
    );
    console.log(`   Created: ${csvPath}\n`);
    
    console.log('☁️  Uploading files to Google Drive...');
    const uploadResults = await googleDrive.uploadNetSheetFiles(pdfPath, csvPath);
    
    console.log('\n✅ SUCCESS! Files uploaded to Google Drive!');
    
    if (uploadResults.pdfLink) {
      console.log('\n📑 PDF in Google Drive:');
      console.log(`   ${uploadResults.pdfLink}`);
    }
    
    if (uploadResults.csvLink) {
      console.log('\n📄 CSV in Google Drive:');
      console.log(`   ${uploadResults.csvLink}`);
    }
    
    console.log('\n🎉 The files are now available in your Google Drive folder!');
    console.log('   Folder: Arkansas Net Sheets');
    console.log('   Owner: brian@searchnwa.com');
    console.log('   Files are owned by you and count against your storage quota');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message?.includes('quota')) {
      console.log('\n⚠️  Storage quota issue detected');
      console.log('   Regular files (PDF/CSV) should upload fine');
      console.log('   Unlike Google Sheets, these don\'t require special quota');
    }
  }
}

// Run the test
testDriveUpload().catch(console.error);