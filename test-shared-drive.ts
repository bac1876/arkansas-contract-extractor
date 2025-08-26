/**
 * Test Shared Drive Integration
 * Verifies the service account can create files in the Shared Drive
 */

import GoogleDriveShared from './google-drive-shared';
import * as dotenv from 'dotenv';

dotenv.config();

async function testSharedDrive() {
  console.log('🧪 Testing Shared Drive Integration\n');
  console.log(`📁 Shared Drive ID: ${process.env.GOOGLE_SHARED_DRIVE_ID}\n`);
  
  try {
    // Initialize the Shared Drive integration
    const driveIntegration = new GoogleDriveShared();
    await driveIntegration.initialize();
    
    console.log('\n📝 Creating test net sheet...');
    
    // Test data
    const testNetSheetData = {
      sales_price: 300000,
      seller_concessions: 5000,
      days_of_tax: 180,
      tax_per_day: 10,
      taxes_prorated: 1800,
      commission_seller: 9000,
      buyer_agency_fees: 0,
      closing_fee: 500,
      title_search: 350,
      title_insurance: 1200,
      title_recording_fees: 175,
      pest_transfer: 50,
      tax_stamps: 495,
      home_warranty: 500,
      total_costs: 19070,
      cash_to_seller: 280930
    };
    
    const result = await driveIntegration.createSellerNetSheet(
      testNetSheetData,
      '5806 W Walsh Lane Rogers, AR 72758'
    );
    
    console.log('\n✅ SUCCESS! Shared Drive integration is working!');
    console.log('\n📊 Test spreadsheet created:');
    console.log(`   Name: ${result.spreadsheetName}`);
    console.log(`   ID: ${result.spreadsheetId}`);
    console.log(`   🔗 View at: ${result.shareableLink}`);
    
    console.log('\n🎉 The system can now save to Google Drive!');
    console.log('   Files will be created in the Arkansas Contract Data Shared Drive');
    console.log('   No storage quota issues!');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.code === 404) {
      console.log('\n⚠️  Shared Drive not found');
      console.log('   Please verify the Shared Drive ID in .env');
    } else if (error.code === 403) {
      console.log('\n⚠️  Permission denied');
      console.log('   Make sure the service account is added as Content Manager');
      console.log('   Service account email: arkansas-contract-agent@arkansas-contract-agent.iam.gserviceaccount.com');
    }
  }
}

// Run test
testSharedDrive().catch(console.error);