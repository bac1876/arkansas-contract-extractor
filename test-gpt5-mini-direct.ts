import { HybridExtractor } from './extraction-hybrid';
import * as fs from 'fs/promises';

async function testGPT5Mini() {
  console.log('🚀 Testing GPT-5-mini Direct Extraction');
  console.log('='.repeat(50));
  
  const extractor = new HybridExtractor();
  const testContract = 'test_contract2.pdf';
  
  try {
    console.log('\n📄 Testing with GPT-5-mini (no fallback)...\n');
    
    const result = await extractor.extractFromPDF(testContract, {
      model: 'gpt-5-mini',
      fallbackToGPT4o: false,  // No fallback - pure GPT-5-mini
      verbose: true
    });
    
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
        const value = result.data[field];
        const status = value !== null && value !== undefined ? '✅' : '❌';
        console.log(`  ${status} ${field}: ${JSON.stringify(value)}`);
      }
      
      // Save results
      const outputFile = `gpt5_mini_extraction_${Date.now()}.json`;
      await fs.writeFile(outputFile, JSON.stringify(result, null, 2));
      console.log(`\n💾 Results saved to: ${outputFile}`);
      
    } else {
      console.log('\n❌ GPT-5-mini Extraction Failed!');
      console.log(`Error: ${result.error}`);
      
      // Try to understand why it failed
      if (result.fieldsExtracted === 0) {
        console.log('⚠️  No fields were extracted - likely empty response issue');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testGPT5Mini().catch(console.error);