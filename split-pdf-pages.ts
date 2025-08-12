/**
 * Split a PDF into individual page files
 */

import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';

async function splitPdfIntoPages(inputPdf: string, outputDir: string = './pages') {
  console.log(`Splitting ${inputPdf} into individual pages...`);
  console.log('='.repeat(50) + '\n');

  try {
    // Read the PDF
    const existingPdfBytes = await fs.readFile(inputPdf);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    const totalPages = pdfDoc.getPageCount();
    console.log(`Total pages in PDF: ${totalPages}\n`);

    // Create output directory if it doesn't exist
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (e) {
      // Directory might already exist
    }

    // Extract each page
    for (let i = 0; i < totalPages; i++) {
      const pageNum = i + 1;
      console.log(`Extracting page ${pageNum}...`);
      
      // Create a new PDF with just this page
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(copiedPage);
      
      // Save the page
      const pdfBytes = await newPdf.save();
      const outputPath = path.join(outputDir, `page${pageNum}.pdf`);
      await fs.writeFile(outputPath, pdfBytes);
      
      console.log(`  ✓ Saved as ${outputPath}`);
    }

    console.log(`\n✅ Successfully split ${totalPages} pages`);
    console.log(`📁 Pages saved in: ${outputDir}/`);
    
    // List what was created
    console.log('\nCreated files:');
    for (let i = 1; i <= totalPages; i++) {
      console.log(`  - page${i}.pdf`);
    }

  } catch (error) {
    console.error('Error splitting PDF:', error);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const inputFile = args[0] || './test_contract1.pdf';
const outputDir = args[1] || './pages';

// Run the splitter
console.log('PDF Page Splitter');
console.log('=================\n');
console.log(`Input: ${inputFile}`);
console.log(`Output directory: ${outputDir}\n`);

splitPdfIntoPages(inputFile, outputDir).catch(console.error);