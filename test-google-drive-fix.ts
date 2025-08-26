/**
 * Test script for Google Drive API fix
 * Tests creating Google Sheets using Drive API instead of Sheets API
 */

import GoogleDriveIntegration from './google-drive-integration';
import * as dotenv from 'dotenv';

dotenv.config();

async function testGoogleDriveFix() {
  console.log('🧪 Testing Google Drive API Fix for Sheet Creation');
  console.log('================================================\n');
  
  try {
    // Initialize Google Drive
    const googleDrive = new GoogleDriveIntegration();
    await googleDrive.initialize();
    console.log('✅ Google Drive initialized successfully\n');
    
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
    
    console.log('📊 Creating test seller net sheet in Google Drive...');
    console.log(`   Property: ${testPropertyAddress}`);
    console.log(`   Net to Seller: $${testNetSheetData.cash_to_seller.toLocaleString()}\n`);
    
    // Attempt to create the sheet
    const result = await googleDrive.createSellerNetSheet(
      testNetSheetData,
      testPropertyAddress,
      {
        buyers: 'Brian Curtis, Lisa Brown',
        purchase_price: 300000,
        closing_date: '2025-09-15'
      }
    );
    
    console.log('✅ SUCCESS! Google Sheet created using Drive API!');
    console.log(`   📎 Sheet Name: ${result.spreadsheetName}`);
    console.log(`   📎 Sheet ID: ${result.spreadsheetId}`);
    console.log(`   📎 View Link: ${result.shareableLink}`);
    console.log(`   📁 Folder ID: ${result.folderId || 'root'}`);
    console.log('\n🎉 The Drive API fix works! Service account can now create sheets!');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message?.includes('403') || error.message?.includes('permission')) {
      console.log('\n⚠️  Still getting permission error. Possible causes:');
      console.log('   1. Service account doesn\'t have Editor role on shared folder');
      console.log('   2. Drive API not enabled in Google Cloud Console');
      console.log('   3. Service account key file missing or invalid');
    }
    
    console.log('\nFull error:', error);
  }
}

// Run the test
testGoogleDriveFix().catch(console.error);