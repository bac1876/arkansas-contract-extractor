/**
 * Search for X patterns and checkbox indicators in page1.pdf
 */

const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';

async function findXPatterns() {
  console.log('Searching for X patterns in page1.pdf');
  console.log('=====================================\n');

  try {
    const dataBuffer = await fs.readFile('./page1.pdf');
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;
    
    console.log(`PDF text length: ${text.length} characters\n`);
    
    // Search for various checkbox patterns
    const patterns = [
      '[X]', '[x]', '(X)', '(x)',
      '☑', '☒', '✓', '✔', '✖', '✗', '⊠', '☐', '□',
      'X FHA', 'X CONVENTIONAL', 'X VA', 'X USDA',
      'XFHA', 'XCONVENTIONAL', 'XVA', 'XUSDA'
    ];
    
    console.log('Searching for checkbox patterns...\n');
    const foundPatterns: string[] = [];
    
    patterns.forEach(pattern => {
      if (text.includes(pattern)) {
        foundPatterns.push(pattern);
        console.log(`✓ FOUND: "${pattern}"`);
        
        // Show all occurrences
        let index = text.indexOf(pattern);
        let occurrence = 1;
        while (index !== -1) {
          const start = Math.max(0, index - 30);
          const end = Math.min(text.length, index + pattern.length + 30);
          const context = text.substring(start, end).replace(/\n/g, ' ');
          console.log(`  Occurrence ${occurrence}: ...${context}...`);
          
          index = text.indexOf(pattern, index + 1);
          occurrence++;
        }
        console.log('');
      }
    });
    
    if (foundPatterns.length === 0) {
      console.log('No standard checkbox patterns found.\n');
    }
    
    // Look for loan type section specifically
    console.log('=== LOAN TYPE SECTION ===\n');
    
    const loanTypeIndex = text.search(/loan\s*type/i);
    if (loanTypeIndex !== -1) {
      const loanSection = text.substring(loanTypeIndex, loanTypeIndex + 300);
      console.log('Loan type section text:');
      console.log(loanSection);
      console.log('\n');
      
      // Check what appears before each loan option
      const loanOptions = ['CONVENTIONAL', 'VA', 'FHA', 'USDA'];
      console.log('Checking characters before each loan option:\n');
      
      loanOptions.forEach(option => {
        const optionIndex = text.indexOf(option, loanTypeIndex);
        if (optionIndex !== -1 && optionIndex < loanTypeIndex + 500) {
          // Get 10 characters before the option
          const before = text.substring(optionIndex - 10, optionIndex);
          const after = text.substring(optionIndex, optionIndex + 20);
          console.log(`${option}:`);
          console.log(`  10 chars before: "${before.replace(/\n/g, '\\n')}"`);
          console.log(`  Option + context: "${after}"`);
          
          // Check for any special characters
          const specialChars = before.match(/[^\w\s.,]/g);
          if (specialChars) {
            console.log(`  Special chars found: ${specialChars.join(', ')}`);
          }
          console.log('');
        }
      });
    } else {
      console.log('Could not find "loan type" section in the text.');
    }
    
    // Look for any X characters near loan options
    console.log('=== SEARCHING FOR X MARKS ===\n');
    
    // Find all X characters
    const xPositions: number[] = [];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === 'X' || text[i] === 'x') {
        xPositions.push(i);
      }
    }
    
    console.log(`Found ${xPositions.length} X/x characters in the document\n`);
    
    // Check if any X is near a loan option
    const loanOptions = ['CONVENTIONAL', 'VA', 'FHA', 'USDA'];
    loanOptions.forEach(option => {
      const optionIndex = text.indexOf(option);
      if (optionIndex !== -1) {
        // Check if there's an X within 20 characters before the option
        const nearbyX = xPositions.filter(xPos => 
          xPos > optionIndex - 20 && xPos < optionIndex
        );
        
        if (nearbyX.length > 0) {
          console.log(`⚠️  Found X near ${option}:`);
          nearbyX.forEach(xPos => {
            const context = text.substring(xPos - 5, optionIndex + option.length);
            console.log(`  Position ${xPos}: "${context.replace(/\n/g, ' ')}"`);
          });
          console.log('');
        }
      }
    });
    
    // Save raw text for manual inspection
    await fs.writeFile('./page1_raw_text.txt', text);
    console.log('✓ Raw text saved to page1_raw_text.txt for inspection\n');
    
    // Also save just the loan section if found
    if (loanTypeIndex !== -1) {
      const loanSection = text.substring(
        Math.max(0, loanTypeIndex - 100),
        Math.min(text.length, loanTypeIndex + 500)
      );
      await fs.writeFile('./page1_loan_section.txt', loanSection);
      console.log('✓ Loan section saved to page1_loan_section.txt\n');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the search
findXPatterns().catch(console.error);