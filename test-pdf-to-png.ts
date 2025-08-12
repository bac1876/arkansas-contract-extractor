// Test script to understand how pdf-to-png-converter handles paths
const pdfToPng = require('pdf-to-png-converter').pdfToPng;
import * as path from 'path';
import * as fs from 'fs/promises';

async function test() {
  console.log('Current directory:', process.cwd());
  
  // Test different path formats
  const testPaths = [
    'temp_test',
    './temp_test',
    path.join('temp_test'),
    path.resolve('temp_test')
  ];
  
  for (const testPath of testPaths) {
    console.log('\n-------------------');
    console.log('Testing with path:', testPath);
    console.log('Path type:', path.isAbsolute(testPath) ? 'absolute' : 'relative');
    
    try {
      // Create directory
      await fs.mkdir(testPath, { recursive: true });
      
      // Try to convert
      const result = await pdfToPng('test_contract2.pdf', {
        outputFolder: testPath,
        outputFileMask: 'test',
        viewportScale: 1.0,
        pagesToProcess: [1] // Just test first page
      });
      
      console.log('Success! Output:', result[0]?.path);
      
      // Clean up
      await fs.rm(testPath, { recursive: true, force: true });
    } catch (error: any) {
      console.log('Error:', error.message);
      if (error.path) console.log('Error path:', error.path);
    }
  }
}

test().catch(console.error);