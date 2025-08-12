/**
 * Extract Paragraphs 20 and 23
 * Para 20: Lead-based paint checkbox
 * Para 23: Possession checkbox
 */

const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';

async function extractParagraphs20And23() {
  console.log('Paragraphs 20 & 23 Extraction');
  console.log('==============================\n');

  const contractPath = './sample_contract.pdf';

  try {
    const dataBuffer = await fs.readFile(contractPath);
    const pdfData = await pdfParse(dataBuffer);
    
    // Search for Paragraph 20
    console.log('PARAGRAPH 20 - Lead-Based Paint:');
    console.log('-'.repeat(40));
    
    const para20Pattern = /20\.\s*LEAD[^]*?(?=21\.|$)/gi;
    const para20Matches = pdfData.text.match(para20Pattern);
    
    if (para20Matches) {
      console.log('Found Paragraph 20 about Lead-Based Paint');
      const para20Text = para20Matches[0];
      
      // Check for checkboxes or options
      const hasYes = /\bYES\b|\bA\.\s*Yes/i.test(para20Text);
      const hasNo = /\bNO\b|\bB\.\s*No/i.test(para20Text);
      const hasNA = /\bN\/A\b|\bC\.\s*N\/A/i.test(para20Text);
      
      console.log(`Has YES option: ${hasYes}`);
      console.log(`Has NO option: ${hasNo}`);
      console.log(`Has N/A option: ${hasNA}`);
      
      // Check for checkbox markers
      const hasChecked = /\[X\]|\(X\)|☑|✓/.test(para20Text);
      console.log(`Has checked box: ${hasChecked}`);
      
      // The text says "improvements on this Property were not constructed prior to 1978"
      // This suggests the lead-based paint disclosure doesn't apply
      if (para20Text.includes('were not constructed prior to 1978')) {
        console.log('\n✓ Property built after 1978 - Lead-based paint N/A');
      }
    } else {
      console.log('Paragraph 20 not found with standard pattern');
    }
    
    // Search for Paragraph 23 - Possession
    console.log('\n\nPARAGRAPH 23 - Possession:');
    console.log('-'.repeat(40));
    
    const para23Pattern = /23\.\s*POSSESSION[^]*?(?=24\.|$)/gi;
    const para23Matches = pdfData.text.match(para23Pattern);
    
    if (para23Matches) {
      console.log('Found Paragraph 23 about Possession');
      const para23Text = para23Matches[0];
      
      console.log('\nFirst 500 chars:');
      console.log(para23Text.substring(0, 500));
      
      // Look for options
      const optionA = para23Text.match(/A\.\s*([^\n]{0,100})/i);
      const optionB = para23Text.match(/B\.\s*([^\n]{0,100})/i);
      const optionC = para23Text.match(/C\.\s*([^\n]{0,100})/i);
      
      console.log('\nOptions found:');
      if (optionA) console.log(`Option A: "${optionA[1]?.trim()}"`);
      if (optionB) console.log(`Option B: "${optionB[1]?.trim()}"`);
      if (optionC) console.log(`Option C: "${optionC[1]?.trim()}"`);
      
      // Check which appears first
      const positions = [];
      if (optionA) positions.push({ option: 'A', pos: para23Text.indexOf('A.') });
      if (optionB) positions.push({ option: 'B', pos: para23Text.indexOf('B.') });
      if (optionC) positions.push({ option: 'C', pos: para23Text.indexOf('C.') });
      
      if (positions.length > 0) {
        positions.sort((a, b) => a.pos - b.pos);
        console.log(`\nFirst option appearing: ${positions[0].option}`);
      }
    } else {
      console.log('Paragraph 23 not found with standard pattern');
      
      // Try broader search
      const possession = pdfData.text.match(/POSSESSION[^]*?(?=24\.|PARAGRAPH 24|$)/gi);
      if (possession) {
        console.log('\nFound POSSESSION section:');
        console.log(possession[0].substring(0, 500));
      }
    }
    
    // Also search for Paragraph 32 while we're here
    console.log('\n\nPARAGRAPH 32 - Custom Text:');
    console.log('-'.repeat(40));
    
    const para32Pattern = /32\.[^]*?(?=33\.|$)/gi;
    const para32Matches = pdfData.text.match(para32Pattern);
    
    if (para32Matches) {
      console.log('Found Paragraph 32');
      console.log(para32Matches[0].substring(0, 500));
      
      // Look for any custom written text
      const lines = para32Matches[0].split('\n');
      const customText = lines.filter(line => 
        line.trim().length > 10 && 
        !line.match(/^32\./) &&
        !line.match(/^[A-Z]\.$/)
      );
      
      if (customText.length > 0) {
        console.log('\nCustom text found:');
        console.log(customText.join('\n'));
      } else {
        console.log('\nNo custom text found in Paragraph 32');
      }
    } else {
      console.log('Paragraph 32 not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run
extractParagraphs20And23().catch(console.error);