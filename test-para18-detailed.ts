/**
 * More detailed extraction for Paragraph 18
 * Look for checkbox patterns and marked options
 */

const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';

async function detailedPara18Search() {
  console.log('Detailed Paragraph 18 Search');
  console.log('============================\n');

  const contractPath = './sample_contract.pdf';

  try {
    const dataBuffer = await fs.readFile(contractPath);
    const pdfData = await pdfParse(dataBuffer);
    
    // Search for "18." followed by any content
    const para18Pattern = /18\.\s*[\s\S]{0,500}?(?=19\.|$)/gi;
    const matches = pdfData.text.match(para18Pattern);
    
    if (matches) {
      console.log(`Found ${matches.length} matches for "18."\n`);
      
      matches.forEach((match, index) => {
        console.log(`\nMatch ${index + 1}:`);
        console.log('='.repeat(50));
        console.log(match);
        console.log('='.repeat(50));
        
        // Analyze this match
        console.log('\nAnalysis:');
        
        // Check for checkbox markers
        const hasCheckedBox = /\[X\]|\(X\)|☑|✓|✔|⊠/.test(match);
        const hasEmptyBox = /\[\s*\]|\(\s*\)|☐|□/.test(match);
        
        console.log(`Has checked box: ${hasCheckedBox}`);
        console.log(`Has empty box: ${hasEmptyBox}`);
        
        // Check for options
        const optionA = match.match(/A\.\s*([^\n]*)/i);
        const optionB = match.match(/B\.\s*([^\n]*)/i);
        const optionC = match.match(/C\.\s*([^\n]*)/i);
        const optionD = match.match(/D\.\s*([^\n]*)/i);
        
        if (optionA) console.log(`Option A: "${optionA[1]?.trim() || 'exists'}"`);
        if (optionB) console.log(`Option B: "${optionB[1]?.trim() || 'exists'}"`);
        if (optionC) console.log(`Option C: "${optionC[1]?.trim() || 'exists'}"`);
        if (optionD) console.log(`Option D: "${optionD[1]?.trim() || 'exists'}"`);
        
        // Check which appears first (often the selected one)
        const positions = [];
        if (optionA) positions.push({ option: 'A', pos: match.indexOf('A.') });
        if (optionB) positions.push({ option: 'B', pos: match.indexOf('B.') });
        if (optionC) positions.push({ option: 'C', pos: match.indexOf('C.') });
        if (optionD) positions.push({ option: 'D', pos: match.indexOf('D.') });
        
        if (positions.length > 0) {
          positions.sort((a, b) => a.pos - b.pos);
          console.log(`\nFirst option appearing: ${positions[0].option}`);
        }
      });
    } else {
      console.log('No matches found for paragraph 18');
    }
    
    // Also search more broadly in case paragraph numbering is different
    console.log('\n\nBroader search for paragraph 18 context...');
    console.log('='.repeat(50));
    
    // Search for content between para 17 and 19
    const betweenPattern = /17\.\s*[\s\S]*?19\./gi;
    const betweenMatches = pdfData.text.match(betweenPattern);
    
    if (betweenMatches) {
      console.log('Content between paragraphs 17 and 19:');
      betweenMatches.forEach(match => {
        // Extract just the part that would be para 18
        const lines = match.split('\n');
        let foundEighteen = false;
        let para18Content = [];
        
        for (const line of lines) {
          if (/^18\./.test(line.trim())) {
            foundEighteen = true;
          }
          if (foundEighteen && /^19\./.test(line.trim())) {
            break;
          }
          if (foundEighteen) {
            para18Content.push(line);
          }
        }
        
        if (para18Content.length > 0) {
          console.log('\nExtracted Para 18 content:');
          console.log(para18Content.join('\n'));
        }
      });
    }
    
    // Search for typical paragraph 18 keywords
    console.log('\n\nKeyword-based search...');
    console.log('='.repeat(50));
    
    const keywords = [
      'mineral rights',
      'oil and gas',
      'surface rights',
      'subsurface rights',
      'royalty interest',
      'extraction rights'
    ];
    
    for (const keyword of keywords) {
      const keywordPattern = new RegExp(`18\\..*?${keyword}`, 'gi');
      const keywordMatch = pdfData.text.match(keywordPattern);
      
      if (keywordMatch) {
        console.log(`\nFound paragraph 18 with keyword "${keyword}":`);
        console.log(keywordMatch[0]);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the search
detailedPara18Search().catch(console.error);