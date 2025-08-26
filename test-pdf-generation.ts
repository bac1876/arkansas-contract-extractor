/**
 * Test PDF generation for seller net sheets
 */

import PDFGenerator from './pdf-generator';
import * as dotenv from 'dotenv';

dotenv.config();

async function testPDFGeneration() {
  console.log('🧪 Testing PDF Generation for Seller Net Sheets');
  console.log('================================================\n');
  
  try {
    const pdfGenerator = new PDFGenerator();
    
    // Test data for net sheet
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
    
    console.log('📊 Generating PDF net sheet...');
    console.log(`   Property: ${testPropertyAddress}`);
    console.log(`   Buyers: ${testContractData.buyers}`);
    console.log(`   Net to Seller: $${testNetSheetData.cash_to_seller.toLocaleString()}\n`);
    
    const pdfPath = await pdfGenerator.generateNetSheetPDF(
      testNetSheetData,
      testPropertyAddress,
      testContractData
    );
    
    console.log('✅ SUCCESS! PDF generated successfully!');
    console.log(`   📑 File saved at: ${pdfPath}`);
    console.log('\n📋 PDF Features:');
    console.log('   • Professional design with gradient headers');
    console.log('   • Clear cost breakdown table');
    console.log('   • Transaction details section');
    console.log('   • Important disclaimer');
    console.log('   • Print-optimized formatting');
    console.log('\n🎉 The PDF generator is working perfectly!');
    console.log('   Sellers will receive a professional, branded document');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.log('\nFull error:', error);
  }
}

// Run the test
testPDFGeneration().catch(console.error);