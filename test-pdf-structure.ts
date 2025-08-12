/**
 * Analyze PDF structure to understand how paragraphs are formatted
 */

const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';

async function analyzePDFStructure() {
  console.log('PDF Structure Analysis');
  console.log('======================\n');

  const contractPath = './sample_contract_flat.pdf';

  try {
    const dataBuffer = await fs.readFile(contractPath);
    const pdfData = await pdfParse(dataBuffer);

    console.log(`Total pages: ${pdfData.numpages}`);
    console.log(`Total text length: ${pdfData.text.length} characters\n`);

    // Look for how paragraphs are numbered in the PDF
    console.log('Searching for paragraph numbering patterns...\n');

    // Find all paragraph numbers from 1-40
    for (let i = 10; i <= 25; i++) {
      console.log(`\nSearching for Paragraph ${i}:`);
      console.log('-'.repeat(40));

      // Try different patterns
      const patterns = [
        new RegExp(`\\b${i}\\.`, 'g'),
        new RegExp(`^${i}\\.`, 'gm'),
        new RegExp(`\\n${i}\\.`, 'g'),
        new RegExp(`PARAGRAPH ${i}`, 'gi'),
        new RegExp(`Para\\.?\\s*${i}`, 'gi')
      ];

      let found = false;
      for (const pattern of patterns) {
        const matches = pdfData.text.match(pattern);
        if (matches && matches.length > 0) {
          console.log(`  ✓ Found with pattern: ${pattern}`);
          
          // Get context around the first match
          const firstMatch = matches[0];
          const index = pdfData.text.indexOf(firstMatch);
          if (index !== -1) {
            const start = Math.max(0, index - 50);
            const end = Math.min(pdfData.text.length, index + 200);
            const context = pdfData.text.substring(start, end);
            console.log(`  Context: "${context.replace(/\n/g, '\\n')}"`);
            found = true;
            break;
          }
        }
      }

      if (!found) {
        console.log('  ❌ Not found');
      }
    }

    // Look specifically for problematic paragraphs
    console.log('\n\nDetailed search for Para 18, 19, 20:');
    console.log('='.repeat(50));

    // Search for any text containing these numbers
    const searchTerms = ['18', '19', '20'];
    for (const term of searchTerms) {
      console.log(`\n\nAll occurrences of "${term}":`);
      console.log('-'.repeat(30));
      
      const regex = new RegExp(`[^\\d]${term}[^\\d]`, 'g');
      let match;
      let count = 0;
      
      while ((match = regex.exec(pdfData.text)) !== null && count < 5) {
        const start = Math.max(0, match.index - 100);
        const end = Math.min(pdfData.text.length, match.index + 200);
        const context = pdfData.text.substring(start, end);
        console.log(`\nOccurrence ${++count}:`);
        console.log(context.replace(/\n/g, '\\n'));
      }
    }

    // Save a sample of the PDF text for manual inspection
    const sample = pdfData.text.substring(15000, 25000);
    await fs.writeFile('./pdf_text_sample.txt', sample);
    console.log('\n✓ Saved text sample to pdf_text_sample.txt for inspection');

    // Look for checkbox patterns anywhere in the document
    console.log('\n\nSearching for checkbox patterns:');
    console.log('='.repeat(50));
    
    const checkboxPatterns = [
      { pattern: /\[X\]/gi, name: '[X] markers' },
      { pattern: /\(X\)/gi, name: '(X) markers' },
      { pattern: /☑/g, name: 'checkmarks' },
      { pattern: /☒/g, name: 'checked boxes' },
      { pattern: /■/g, name: 'filled squares' },
      { pattern: /●/g, name: 'filled circles' },
      { pattern: /✓/g, name: 'check symbols' }
    ];

    for (const { pattern, name } of checkboxPatterns) {
      const matches = pdfData.text.match(pattern);
      if (matches) {
        console.log(`Found ${matches.length} ${name}`);
      } else {
        console.log(`No ${name} found`);
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Error:', errorMessage);
  }
}

// Run the analysis
console.log('Starting PDF structure analysis...\n');
analyzePDFStructure().catch(console.error);