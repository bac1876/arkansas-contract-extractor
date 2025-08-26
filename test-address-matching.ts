/**
 * Test the improved address matching logic
 */

import { ListingInfoService } from './listing-info-service';

async function testAddressMatching() {
  const service = new ListingInfoService();
  
  console.log('🧪 Testing improved address matching...\n');
  
  try {
    await service.initialize();
    console.log('\n📋 Testing address lookups:\n');
    
    // Test addresses that should now match
    const testAddresses = [
      "1199 S Splash Dr, Fayetteville, AR 72701",
      "3312 Alliance Dr, Springdale, AR 72764",
      "3418 Justice Dr, Rogers, AR 72758"
    ];
    
    for (const address of testAddresses) {
      console.log(`\nTesting: "${address}"`);
      const result = service.getPropertyData(address, { taxes: 3650, commission: 3 });
      
      if (result.source === 'listing') {
        console.log(`✅ MATCHED! Using listing data:`);
        console.log(`   Taxes: $${result.annualTaxes}`);
        console.log(`   Commission: ${(result.commissionPercent * 100).toFixed(1)}%`);
      } else {
        console.log(`❌ NOT MATCHED - Using defaults`);
        console.log(`   Tax Warning: ${result.taxWarning}`);
      }
    }
    
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

testAddressMatching();