import { GPT5Extractor } from './extraction-gpt5';
import * as fs from 'fs/promises';

async function testGPT5MiniSimple() {
  console.log('🚀 Testing GPT-5-mini Simple Extraction');
  console.log('='.repeat(50));
  
  const extractor = new GPT5Extractor();
  const testContract = 'test_contract2.pdf';
  
  try {
    console.log('\n📄 Extracting with GPT-5-mini...\n');
    
    const result = await extractor.extractFromPDF(testContract);
    
    if (result.success) {
      console.log('\n✅ GPT-5-mini Extraction Successful!');
      console.log(`📊 Fields Extracted: ${result.fieldsExtracted}/${result.totalFields}`);
      console.log(`💯 Extraction Rate: ${result.extractionRate}`);
      
      // Check critical fields
      console.log('\n🔑 Critical Fields Check:');
      const criticalFields = [
        'buyers',
        'property_address', 
        'purchase_price',
        'cash_amount',
        'para13_items_included',
        'para13_items_excluded',
        'para14_contingencies'
      ];
      
      for (const field of criticalFields) {
        const value = result.data![field];
        const status = value !== null && value !== undefined ? '✅' : '❌';
        console.log(`  ${status} ${field}: ${JSON.stringify(value)}`);
      }
      
      // Save results
      const outputFile = `gpt5_mini_simple_extraction_${Date.now()}.json`;
      await fs.writeFile(outputFile, JSON.stringify(result, null, 2));
      console.log(`\n💾 Results saved to: ${outputFile}`);
      
    } else {
      console.log('\n❌ GPT-5-mini Extraction Failed!');
      console.log(`Error: ${result.error}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testGPT5MiniSimple().catch(console.error);