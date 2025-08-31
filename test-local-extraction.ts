/**
 * Test extraction locally to verify it's working
 */

import { RobustExtractor } from './extraction-robust';
import * as path from 'path';

async function testLocalExtraction() {
  console.log('🧪 Testing local extraction...\n');
  
  const pdfPath = path.join(__dirname, 'Test Contracts', 'test_contract.pdf');
  console.log(`PDF: ${pdfPath}\n`);
  
  const extractor = new RobustExtractor();
  
  try {
    const result = await extractor.extractFromPDF(pdfPath);
    
    console.log('✅ Extraction Result:');
    console.log('====================');
    console.log(`Success: ${result.success}`);
    console.log(`Method: ${result.method}`);
    console.log(`Extraction Rate: ${result.extractionRate}%\n`);
    
    console.log('Key Fields:');
    console.log(`Property Address: ${result.data.property_address || 'EMPTY'}`);
    console.log(`Purchase Price: ${result.data.purchase_price || 'EMPTY'}`);
    console.log(`Buyer Name: ${result.data.buyer_name || 'EMPTY'}`);
    console.log(`Closing Date: ${result.data.closing_date || 'EMPTY'}`);
    
    console.log('\nAll Data:');
    console.log(JSON.stringify(result.data, null, 2));
    
  } catch (error: any) {
    console.error('❌ Extraction failed:', error.message);
  }
}

testLocalExtraction().catch(console.error);