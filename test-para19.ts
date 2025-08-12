/**
 * Targeted extraction for Paragraph 19
 * Look for checkbox selection
 */

const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';

async function extractParagraph19() {
  console.log('Paragraph 19 - Checkbox Extraction');
  console.log('===================================\n');

  const contractPath = './sample_contract.pdf';

  try {
    const dataBuffer = await fs.readFile(contractPath);
    const pdfData = await pdfParse(dataBuffer);
    
    // Search for "19." followed by content
    const para19Pattern = /19\.\s*[\s\S]{0,500}?(?=20\.|$)/gi;
    const matches = pdfData.text.match(para19Pattern);
    
    if (matches) {
      console.log(`Found ${matches.length} matches for "19."\n`);
      
      matches.forEach((match, index) => {
        console.log(`\nMatch ${index + 1}:`);
        console.log('='.repeat(50));
        console.log(match);
        console.log('='.repeat(50));
        
        // Check for options
        const optionA = match.match(/A\.\s*([^\n]*)/i);
        const optionB = match.match(/B\.\s*([^\n]*)/i);
        const optionC = match.match(/C\.\s*([^\n]*)/i);
        
        console.log('\nOptions found:');
        if (optionA) console.log(`Option A: "${optionA[1]?.trim() || 'exists'}"`);
        if (optionB) console.log(`Option B: "${optionB[1]?.trim() || 'exists'}"`);
        if (optionC) console.log(`Option C: "${optionC[1]?.trim() || 'exists'}"`);
        
        // Check which appears first
        const positions = [];
        if (optionA) positions.push({ option: 'A', pos: match.indexOf('A.') });
        if (optionB) positions.push({ option: 'B', pos: match.indexOf('B.') });
        if (optionC) positions.push({ option: 'C', pos: match.indexOf('C.') });
        
        if (positions.length > 0) {
          positions.sort((a, b) => a.pos - b.pos);
          console.log(`\nFirst option appearing: ${positions[0].option}`);
        }
      });
    } else {
      console.log('No matches found for paragraph 19');
    }
    
    // Look for content between 18 and 20
    console.log('\n\nSearching between paragraphs 18 and 20...');
    console.log('='.repeat(50));
    
    const betweenPattern = /18\.\s*[\s\S]*?20\./gi;
    const betweenMatches = pdfData.text.match(betweenPattern);
    
    if (betweenMatches) {
      betweenMatches.forEach(match => {
        const lines = match.split('\n');
        let foundNineteen = false;
        let para19Content = [];
        
        for (const line of lines) {
          if (/^19\./.test(line.trim())) {
            foundNineteen = true;
          }
          if (foundNineteen && /^20\./.test(line.trim())) {
            break;
          }
          if (foundNineteen) {
            para19Content.push(line);
          }
        }
        
        if (para19Content.length > 0) {
          console.log('\nExtracted Para 19 content:');
          console.log(para19Content.join('\n'));
        }
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run
extractParagraph19().catch(console.error);