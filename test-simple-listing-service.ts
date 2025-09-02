import { ListingInfoService } from './listing-info-service-simple';

async function testSimpleListingService() {
  console.log('Testing simplified ListingInfoService...\n');
  
  const service = new ListingInfoService();
  await service.initialize();
  
  // Test addresses
  const testAddresses = [
    '890 Clark Cir Bentonville, AR 72713',  // Should match "890 Clark"
    '15 Dunbarton Ave, Rogers AR',          // Should match "15 Dunbarton"
    '306 College St',                       // Should match "306 College"
    '123 Unknown Street'                    // Should not match
  ];
  
  console.log('\n📋 Testing address lookups:\n');
  
  for (const address of testAddresses) {
    console.log(`\nTesting: "${address}"`);
    const result = service.getPropertyData(address, { taxes: 3650, commission: 3 });
    
    if (result.source === 'listing') {
      console.log(`✅ MATCHED! Using listing data:`);
      console.log(`   Taxes: $${result.annualTaxes}`);
      console.log(`   Commission: ${(result.commissionPercent * 100).toFixed(1)}%`);
    } else {
      console.log(`❌ NOT MATCHED - Using defaults`);
      console.log(`   Taxes: $${result.annualTaxes} (default)`);
      console.log(`   Commission: ${(result.commissionPercent * 100).toFixed(1)}%`);
      console.log(`   Tax Warning: ${result.taxWarning}`);
    }
  }
}

testSimpleListingService();