import { ListingInfoService } from './listing-info-service';

async function test890Clark() {
  const service = new ListingInfoService();
  await service.initialize();
  
  const testAddress = '890 Clark Cir Bentonville, AR 72713';
  console.log(`\nTesting: "${testAddress}"`);
  
  const result = service.lookupProperty(testAddress);
  console.log('Result:', result);
  
  const data = service.getPropertyData(testAddress, { taxes: 3650, commission: 3 });
  console.log('Property Data:', data);
}

test890Clark();