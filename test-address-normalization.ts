/**
 * Test the improved address normalization
 * Tests the exact case: "16801 S HWY 71" vs "16801 S Highway 71 Winslow AR 72759 Washington County 2 acres M/L"
 */

import { ListingInfoService } from './listing-info-service';

async function testAddressNormalization() {
  console.log('🧪 Testing Address Normalization Fix\n');
  console.log('=' .repeat(80));

  // Create the service
  const service = new ListingInfoService();

  // Mock the listing data directly (simulating what would come from Google Sheets)
  (service as any).listingData = [
    {
      address: '16801 s hwy 71',  // What's in the Google Sheet
      annualTaxes: 732,
      commissionPercent: 0.03  // 3%
    }
  ];
  (service as any).initialized = true;

  console.log('📋 Listing in Google Sheet:');
  console.log('   Address: "16801 s hwy 71"');
  console.log('   Taxes: $732');
  console.log('   Commission: 3.0%\n');

  console.log('=' .repeat(80));
  console.log('📄 Address from PDF extraction:');
  const pdfAddress = '16801 S Highway 71 Winslow AR 72759 Washington County 2 acres M/L';
  console.log(`   "${pdfAddress}"\n`);

  console.log('=' .repeat(80));
  console.log('🔍 Testing lookup...\n');

  // Test the lookup
  const result = service.lookupProperty(pdfAddress);

  console.log('=' .repeat(80));
  if (result) {
    console.log('✅ SUCCESS! Address matched correctly!');
    console.log(`   Taxes: $${result.annualTaxes}`);
    console.log(`   Commission: ${(result.commissionPercent * 100).toFixed(1)}%`);
  } else {
    console.log('❌ FAILED! Address did not match.');
    console.log('   This means the normalization needs more work.');
  }
  console.log('=' .repeat(80));

  // Show what the normalization produces
  console.log('\n📊 Normalization Details:');
  const normalized1 = (service as any).normalizeAddress(pdfAddress);
  const normalized2 = (service as any).normalizeAddress('16801 s hwy 71');

  console.log(`   PDF normalized:   "${normalized1.full}"`);
  console.log(`   Sheet normalized: "${normalized2.full}"`);
  console.log(`   Number match: ${normalized1.number} === ${normalized2.number} ? ${normalized1.number === normalized2.number}`);
  console.log(`   Street match: ${normalized1.street} === ${normalized2.street} ? ${normalized1.street === normalized2.street}`);
}

testAddressNormalization().catch(console.error);
