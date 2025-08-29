import { GPT5Extractor } from './extraction-gpt5';
import * as fs from 'fs/promises';

async function testExtraction() {
  const extractor = new GPT5Extractor();
  const pdfPath = './processed_contracts/pdfs/1756334636560_306 College.pdf';
  
  console.log('🔍 Testing extraction on 306 College contract...');
  console.log('📄 PDF Path:', pdfPath);
  
  const result = await extractor.extractFromPDF(pdfPath);
  
  if (result.success) {
    console.log('\n✅ Extraction succeeded');
    console.log(`📊 Extracted: ${result.fieldsExtracted}/${result.totalFields} fields`);
    
    // Show which fields are missing (null/empty)
    console.log('\n🔴 Missing/Empty fields:');
    const missingFields = [];
    for (const [key, value] of Object.entries(result.data)) {
      if (value === null || value === undefined || value === '') {
        missingFields.push(key);
        console.log(`  - ${key}: ${value === '' ? '(empty string)' : value}`);
      }
    }
    
    console.log(`\n📝 Total missing: ${missingFields.length} fields`);
    
    // Save detailed results
    await fs.writeFile(
      'test_extraction_debug.json', 
      JSON.stringify(result, null, 2)
    );
    console.log('💾 Full results saved to test_extraction_debug.json');
    
  } else {
    console.log('❌ Extraction failed:', result.error);
  }
}

testExtraction().catch(console.error);