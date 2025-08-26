/**
 * Test Google Sheets Integration
 * Tests saving contract and net sheet data to Google Sheets
 */

import GoogleSheetsIntegration from './google-sheets-integration';
import SellerNetSheetCalculator from './seller-net-sheet-calculator';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function testGoogleSheets() {
  try {
    console.log('🧪 Testing Google Sheets Integration...\n');
    
    // Get spreadsheet ID from environment or use the provided one
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '1-MsjpEJGBxEu3yw_7_ZigYFEpJOSIX21t8vl5QjqCMI';
    
    // Initialize Google Sheets
    const sheets = new GoogleSheetsIntegration(spreadsheetId);
    
    // Check if service account key exists
    const keyPath = path.join(process.cwd(), 'service-account-key.json');
    try {
      await fs.access(keyPath);
      console.log('✅ Service account key found');
    } catch {
      console.log('⚠️  Service account key not found');
      console.log('   Using existing extraction data for test...\n');
      
      // Use existing extraction data
      const resultPath = 'processed_contracts/results/1755102694353_Offer (EXE)-3315 Alliance Dr_result.json';
      const netSheetPath = 'processed_contracts/seller_net_sheets/1755102694353_Offer (EXE)-3315 Alliance Dr_result_net_sheet.json';
      
      try {
        // Read existing data
        const contractResult = JSON.parse(await fs.readFile(resultPath, 'utf-8'));
        const netSheetData = JSON.parse(await fs.readFile(netSheetPath, 'utf-8'));
        
        // Display sample data
        console.log('📄 Sample Contract Data:');
        console.log(`   Property: ${contractResult.data.property_address}`);
        console.log(`   Buyer: ${contractResult.data.buyer_name}`);
        console.log(`   Price: $${contractResult.data.purchase_price?.toLocaleString() || contractResult.data.cash_amount?.toLocaleString()}`);
        console.log(`   Extraction Rate: ${contractResult.extractionRate}`);
        
        console.log('\n💰 Sample Net Sheet Data:');
        console.log(`   Sales Price: $${netSheetData.sales_price?.toLocaleString()}`);
        console.log(`   Total Costs: $${netSheetData.total_costs?.toLocaleString()}`);
        console.log(`   Net to Seller: $${netSheetData.cash_to_seller?.toLocaleString()}`);
        
        console.log('\n📊 This data would be saved to Google Sheets with proper authentication');
        console.log(`   Spreadsheet URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
        
        // Show what the data structure looks like
        console.log('\n📋 Data structure for Google Sheets:');
        console.log('   Contracts Sheet columns:', [
          'Timestamp',
          'Contract ID',
          'Property Address',
          'Buyer Name',
          'Purchase Price',
          'Closing Date',
          'Extraction Rate',
          '...and more'
        ].join(', '));
        
        console.log('\n   NetSheets Sheet columns:', [
          'Timestamp',
          'Contract ID',
          'Property Address',
          'Sales Price',
          'Total Costs',
          'Net to Seller',
          '...and more'
        ].join(', '));
        
      } catch (error) {
        console.log('❌ Could not read existing extraction data');
        console.log('   Run extraction first to generate test data');
      }
      
      return;
    }
    
    // If service account key exists, proceed with actual test
    await sheets.initialize();
    await sheets.initializeSheets();
    
    // Test with sample data
    const sampleContract = {
      property_address: '3315 Alliance Drive, Springdale, AR 72764',
      buyer_name: 'Test Buyer',
      purchase_price: 265000,
      cash_amount: 265000,
      financing_type: 'CASH',
      closing_date: '2025-08-25',
      home_warranty: 'YES',
      warranty_amount: 750,
      title_option: 'B',
      para13_items_included: null,
      para13_items_excluded: null,
      para32_other_terms: 'Buyer agency fee 3%',
      extractionRate: '90.24%'
    };
    
    // Calculate net sheet
    const calculator = new SellerNetSheetCalculator();
    const netSheetData = calculator.calculate({
      purchase_price: sampleContract.purchase_price,
      seller_concessions: '8000',
      closing_date: sampleContract.closing_date,
      home_warranty: sampleContract.home_warranty,
      warranty_amount: sampleContract.warranty_amount,
      title_option: sampleContract.title_option,
      para32_other_terms: sampleContract.para32_other_terms,
      annual_taxes: 3650
    });
    
    // Save to Google Sheets
    const contractId = await sheets.saveCompleteExtraction(
      sampleContract,
      netSheetData,
      'Test'
    );
    
    console.log('\n✅ Test completed successfully!');
    console.log(`   View results at: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
    
    // Get recent extractions
    const recent = await sheets.getRecentExtractions(5);
    console.log('\n📊 Recent extractions:');
    recent.forEach((extraction: any) => {
      console.log(`   ${extraction.timestamp} - ${extraction.propertyAddress} - ${extraction.buyerName}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test
if (require.main === module) {
  testGoogleSheets();
}

export { testGoogleSheets };