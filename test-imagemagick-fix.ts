import { ImageMagickExtractor } from './extraction-imagemagick';
import * as path from 'path';

async function testExtraction() {
  const extractor = new ImageMagickExtractor();
  const testFile = path.join(process.cwd(), 'uploads', '1755019379300-test_contract2.pdf');
  
  console.log('Testing extraction with:', testFile);
  console.log('Current directory:', process.cwd());
  
  const result = await extractor.extractFromPDF(testFile);
  
  if (result.success) {
    console.log('✅ SUCCESS!');
    console.log('Extraction Rate:', result.extractionRate);
    console.log('Fields:', result.fieldsExtracted + '/' + result.totalFields);
  } else {
    console.log('❌ FAILED:', result.error);
  }
}

testExtraction().catch(console.error);