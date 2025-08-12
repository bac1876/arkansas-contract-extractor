/**
 * Convert page1.pdf to image for Vision API
 */

import { pdfToPng } from 'pdf-to-png-converter';
import * as fs from 'fs/promises';

async function convertPage1() {
  console.log('Converting page1.pdf to PNG...');
  
  try {
    const pdfBuffer = await fs.readFile('./page1.pdf');
    
    const pngPages = await pdfToPng(pdfBuffer, {
      disableFontFace: true,
      useSystemFonts: false,
      viewportScale: 2.0, // Higher quality
      pagesToProcess: [1], // Only first page
    });
    
    if (pngPages.length > 0) {
      await fs.writeFile('./page1.png', pngPages[0].content);
      console.log('✓ Successfully converted to page1.png');
      console.log(`  Image size: ${pngPages[0].content.length} bytes`);
    }
    
  } catch (error) {
    console.error('Error converting PDF:', error);
  }
}

convertPage1().catch(console.error);