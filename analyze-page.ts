/**
 * Analyze a single PDF page to determine what extraction method is needed
 */

const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';

async function analyzePage(pageNum: number) {
  console.log(`\nAnalyzing Page ${pageNum}`);
  console.log('='.repeat(50));

  try {
    const pdfPath = `./pages/page${pageNum}.pdf`;
    const dataBuffer = await fs.readFile(pdfPath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    console.log(`Text length: ${text.length} characters\n`);

    // Look for paragraph numbers
    const paragraphs = text.match(/\d+\.\s+[A-Z]/g) || [];
    if (paragraphs.length > 0) {
      console.log('Paragraphs found:');
      paragraphs.forEach(p => console.log(`  - ${p.trim()}`));
      console.log('');
    }

    // Check for checkboxes or selection indicators
    const checkboxPatterns = [
      { pattern: /\[[\s]*\]/g, name: 'Empty brackets []' },
      { pattern: /\[X\]/gi, name: 'Checked brackets [X]' },
      { pattern: /☐/g, name: 'Empty checkbox ☐' },
      { pattern: /☑/g, name: 'Checked checkbox ☑' },
      { pattern: /✓/g, name: 'Checkmark ✓' },
      { pattern: /✔/g, name: 'Checkmark ✔' },
      { pattern: /✖/g, name: 'X mark ✖' },
      { pattern: /✗/g, name: 'X mark ✗' }
    ];

    let hasCheckboxes = false;
    console.log('Checkbox indicators:');
    checkboxPatterns.forEach(({ pattern, name }) => {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`  ✓ Found ${matches.length} ${name}`);
        hasCheckboxes = true;
      }
    });

    if (!hasCheckboxes) {
      console.log('  No checkbox indicators found');
    }

    // Check for common form patterns that might need Vision
    const formPatterns = [
      /\b[A-D]\.\s+Yes\b/gi,
      /\b[A-D]\.\s+No\b/gi,
      /Option\s+[A-D]/gi,
      /Check\s+one/gi,
      /Select\s+one/gi
    ];

    console.log('\nForm patterns:');
    let hasFormPatterns = false;
    formPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`  ✓ Found: ${matches[0]}`);
        hasFormPatterns = true;
      }
    });

    if (!hasFormPatterns) {
      console.log('  No form selection patterns found');
    }

    // Look for fill-in-the-blank fields
    const blankPatterns = [
      /_+/g,
      /\$_+/g,
      /Date:?\s*_+/gi
    ];

    console.log('\nFill-in-the-blank fields:');
    let hasBlankFields = false;
    blankPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`  ✓ Found ${matches.length} blank lines`);
        hasBlankFields = true;
      }
    });

    // Show sample of actual text
    console.log('\nFirst 500 characters of text:');
    console.log('-'.repeat(40));
    console.log(text.substring(0, 500));
    console.log('-'.repeat(40));

    // Recommendation
    console.log('\n📊 RECOMMENDATION:');
    if (hasCheckboxes || hasFormPatterns) {
      console.log('  🔍 USE VISION API - Page has checkboxes or selection options');
    } else if (hasBlankFields) {
      console.log('  📝 USE TEXT EXTRACTION - Page has fill-in fields, no checkboxes');
    } else if (text.length < 100) {
      console.log('  ⏭️  SKIP - Page appears to have minimal extractable content');
    } else {
      console.log('  📝 USE TEXT EXTRACTION - Standard text content');
    }

    // Save the text for reference
    await fs.writeFile(`./pages/page${pageNum}_text.txt`, text);
    console.log(`\n✓ Text saved to ./pages/page${pageNum}_text.txt for review`);

  } catch (error) {
    console.error(`Error analyzing page ${pageNum}:`, error);
  }
}

// Get page number from command line or default to 3
const pageNum = parseInt(process.argv[2] || '3');
analyzePage(pageNum).catch(console.error);