// Test the exact extraction approach
const pdfToPng = require('pdf-to-png-converter').pdfToPng;
import * as path from 'path';
import * as fs from 'fs/promises';

async function testExtraction() {
  const pdfPath = 'test_contract2.pdf';
  
  // Use the exact same approach as extraction-api
  const timestamp = Date.now().toString();
  const tempDirRelative = `temp_extraction/${timestamp}`;
  const tempDirAbsolute = path.resolve(tempDirRelative);
  
  console.log('Creating directory:', tempDirAbsolute);
  await fs.mkdir(tempDirAbsolute, { recursive: true });
  
  console.log('Converting PDF with relative path:', tempDirRelative);
  
  try {
    const pngPages = await pdfToPng(pdfPath, {
      outputFolder: tempDirRelative,
      outputFileMask: 'page',
      viewportScale: 2.0
    });
    
    console.log('SUCCESS! Converted', pngPages.length, 'pages');
    console.log('First page at:', pngPages[0]?.path);
    
    // Test reading the file
    const img = await fs.readFile(pngPages[0].path);
    console.log('Successfully read image, size:', img.length, 'bytes');
    
    // Clean up
    await fs.rm(tempDirAbsolute, { recursive: true, force: true });
    console.log('Cleaned up temp directory');
    
  } catch (error: any) {
    console.error('ERROR:', error.message);
    if (error.path) console.error('Path that failed:', error.path);
  }
}

testExtraction().catch(console.error);