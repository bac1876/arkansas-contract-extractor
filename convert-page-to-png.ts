/**
 * Convert a specific page PDF to PNG
 */

import { pdfToPng } from 'pdf-to-png-converter';
import * as fs from 'fs/promises';

async function convertPageToPng(pageNum: number) {
  const inputFile = `./pages/page${pageNum}.pdf`;
  const outputFile = `./pages/page${pageNum}.png`;
  
  console.log(`Converting page${pageNum}.pdf to PNG...`);
  
  try {
    const pdfBuffer = await fs.readFile(inputFile);
    
    const pngPages = await pdfToPng(pdfBuffer, {
      disableFontFace: true,
      useSystemFonts: false,
      viewportScale: 2.0,
      pagesToProcess: [1],
    });
    
    if (pngPages.length > 0) {
      await fs.writeFile(outputFile, pngPages[0].content);
      console.log(`✓ Successfully converted to ${outputFile}`);
      console.log(`  Image size: ${pngPages[0].content.length} bytes`);
    }
    
  } catch (error) {
    console.error('Error converting PDF:', error);
  }
}

const pageNum = parseInt(process.argv[2] || '3');
convertPageToPng(pageNum).catch(console.error);