/**
 * Convert test_contract2.pdf to PNG images for Vision API processing
 */

import { pdfToPng } from 'pdf-to-png-converter';
import * as fs from 'fs/promises';

async function convertContract2ToImages() {
  console.log('Converting test_contract2.pdf to PNG images...');
  console.log('='.repeat(50));
  
  try {
    // Read the PDF
    const pdfBuffer = await fs.readFile('./test_contract2.pdf');
    
    // Convert all pages to PNG
    console.log('\nConverting pages...');
    const pngPages = await pdfToPng(pdfBuffer, {
      disableFontFace: true, 
      useSystemFonts: false,
      viewportScale: 2.0,
    });
    
    // Create directory for contract2 pages
    const outputDir = './contract2_pages';
    await fs.mkdir(outputDir, { recursive: true });
    
    // Save each page
    for (let i = 0; i < pngPages.length; i++) {
      const pageNum = i + 1;
      const outputPath = `${outputDir}/page${pageNum}.png`;
      await fs.writeFile(outputPath, pngPages[i].content);
      console.log(`  ✓ Page ${pageNum} saved (${pngPages[i].content.length} bytes)`);
    }
    
    console.log(`\n✅ Successfully converted ${pngPages.length} pages`);
    console.log(`📁 Images saved in: ${outputDir}/`);
    
    return pngPages.length;
    
  } catch (error) {
    console.error('Error converting PDF:', error);
    throw error;
  }
}

// Run conversion
convertContract2ToImages().catch(console.error);