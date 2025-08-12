// Test if pre-creating directory helps
const pdfToPng = require('pdf-to-png-converter').pdfToPng;
import * as path from 'path';
import * as fs from 'fs/promises';

async function testFix() {
  const timestamp = Date.now().toString();
  
  // Try different approaches
  const approaches = [
    {
      name: 'Just folder name',
      folder: `temp_${timestamp}`
    },
    {
      name: 'Nested folder',
      folder: `temp_extraction/${timestamp}`
    },
    {
      name: 'With dot slash',
      folder: `./temp_extraction/${timestamp}`
    }
  ];
  
  for (const approach of approaches) {
    console.log('\n---Testing:', approach.name);
    console.log('Folder:', approach.folder);
    
    try {
      // Pre-create the directory
      await fs.mkdir(approach.folder, { recursive: true });
      console.log('Created directory');
      
      // Try conversion
      const result = await pdfToPng('test_contract2.pdf', {
        outputFolder: approach.folder,
        outputFileMask: 'page',
        pagesToProcess: [1]
      });
      
      console.log('SUCCESS! File at:', result[0]?.path);
      
      // Clean up
      await fs.rm(approach.folder, { recursive: true, force: true });
    } catch (error: any) {
      console.error('ERROR:', error.message);
      if (error.path) console.error('Path:', error.path);
      // Try to clean up
      try {
        await fs.rm(approach.folder, { recursive: true, force: true });
      } catch {}
    }
  }
}

testFix().catch(console.error);