require('dotenv').config();
require('ts-node/register');

const { SimplePDFExtractor } = require('./offer-sheet-app/simple-pdf-extractor.ts');

async function test() {
  console.log('Testing simple PDF extraction...\n');
  
  const extractor = new SimplePDFExtractor();
  
  // Test with the 890 Clark PDF
  const pdfPath = '890 Clark.pdf';
  
  console.log('Extracting from:', pdfPath);
  const result = await extractor.extractFromPDF(pdfPath);
  
  console.log('\n📊 Extraction Results:');
  console.log(JSON.stringify(result, null, 2));
}

test().catch(console.error);