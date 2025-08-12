import { ImageMagickExtractor } from './extraction-imagemagick';

async function testDirect() {
  const extractor = new ImageMagickExtractor();
  const testFile = 'uploads/1755020338733-test_contract2.pdf';
  
  console.log('Testing direct extraction...');
  
  try {
    const result = await extractor.extractFromPDF(testFile);
    
    if (result.success) {
      console.log('✅ SUCCESS!');
      console.log('Extraction Rate:', result.extractionRate);
      console.log('Fields:', result.fieldsExtracted + '/' + result.totalFields);
    } else {
      console.log('❌ FAILED:', result.error);
    }
  } catch (error: any) {
    console.log('❌ Exception:', error.message);
  }
}

testDirect().catch(console.error);