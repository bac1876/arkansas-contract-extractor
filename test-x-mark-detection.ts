/**
 * Detect checkboxes using ✖ marks found in the PDF
 */

const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';

async function detectXMarkCheckboxes() {
  console.log('X-Mark (✖) Checkbox Detection');
  console.log('==============================\n');

  const contractPath = './sample_contract_flat.pdf';

  try {
    const dataBuffer = await fs.readFile(contractPath);
    const pdfData = await pdfParse(dataBuffer);

    // Function to extract checkbox selection based on ✖ marks
    function extractWithXMarks(paraNum: string, pdfText: string): string | null {
      console.log(`\nAnalyzing Paragraph ${paraNum}:`);
      console.log('-'.repeat(40));

      // Find the paragraph and its context
      const paraPattern = new RegExp(`${paraNum}\\.([\\s\\S]{0,500})(?=${parseInt(paraNum) + 1}\\.|$)`, 'i');
      const match = pdfText.match(paraPattern);

      if (!match) {
        console.log('  Paragraph not found');
        return null;
      }

      const paraText = match[0];
      console.log(`  Found paragraph (${paraText.length} chars)`);

      // Look for ✖ marks and their position relative to options
      const lines = paraText.split('\n');
      let selectedOption = null;
      
      // Track which options we find and if there's an X mark near them
      const options: { letter: string, hasX: boolean, lineIndex: number }[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if this line has an option letter
        const optionMatch = line.match(/^([A-D])\./);
        if (optionMatch) {
          const hasX = line.includes('✖') || 
                       (i > 0 && lines[i-1].includes('✖')) || 
                       (i < lines.length - 1 && lines[i+1].includes('✖'));
          
          options.push({
            letter: optionMatch[1],
            hasX: hasX,
            lineIndex: i
          });
          
          console.log(`  Option ${optionMatch[1]}: ${hasX ? 'HAS ✖ MARK' : 'no mark'}`);
        }
      }

      // Find which option has the X mark
      const selectedOptions = options.filter(opt => opt.hasX);
      if (selectedOptions.length === 1) {
        selectedOption = selectedOptions[0].letter;
        console.log(`  ✓ Selected: ${selectedOption}`);
      } else if (selectedOptions.length > 1) {
        // Multiple X marks - take the first one
        selectedOption = selectedOptions[0].letter;
        console.log(`  ⚠ Multiple marks found, using first: ${selectedOption}`);
      } else {
        console.log('  No ✖ marks found near options');
      }

      return selectedOption;
    }

    // Test on paragraphs 18, 19, 20
    console.log('Testing X-mark detection on key paragraphs:');
    console.log('='.repeat(50));

    const para18 = extractWithXMarks('18', pdfData.text);
    const para19 = extractWithXMarks('19', pdfData.text);
    const para20 = extractWithXMarks('20', pdfData.text);

    // Also look at the specific section where 18 and 19 appear together
    console.log('\n\nAnalyzing the combined 18/19 section:');
    console.log('='.repeat(50));

    // Based on the structure analysis, 18 and 19 appear together
    const combined1819Pattern = /18\.\s*A\.\s*B\.\s*C\.\s*D\.\s*19\.\s*A\.\s*B\.\s*C\.[\s\S]{0,200}/i;
    const combinedMatch = pdfData.text.match(combined1819Pattern);

    if (combinedMatch) {
      console.log('Found combined section:');
      console.log(combinedMatch[0]);
      
      // Count ✖ marks in this section
      const xMarks = combinedMatch[0].match(/✖/g);
      console.log(`\nFound ${xMarks ? xMarks.length : 0} ✖ marks in this section`);
      
      if (xMarks && xMarks.length >= 2) {
        console.log('\nThe two ✖ marks likely correspond to:');
        console.log('1st ✖: Paragraph 18 selection');
        console.log('2nd ✖: Paragraph 19 selection');
        
        // Try to determine which options based on position
        const beforeFirst = combinedMatch[0].substring(0, combinedMatch[0].indexOf('✖'));
        const betweenMarks = combinedMatch[0].substring(
          combinedMatch[0].indexOf('✖') + 1, 
          combinedMatch[0].lastIndexOf('✖')
        );
        
        console.log('\nText before first ✖:', beforeFirst.replace(/\n/g, ' '));
        console.log('Text between ✖ marks:', betweenMarks.replace(/\n/g, ' '));
      }
    }

    // Display final results
    console.log('\n\nFINAL RESULTS:');
    console.log('='.repeat(50));
    console.log(`Paragraph 18: ${para18 || 'Could not determine'}`);
    console.log(`Paragraph 19: ${para19 || 'Could not determine'}`);
    console.log(`Paragraph 20: ${para20 || 'Could not determine'}`);

    // Save results
    const results = {
      timestamp: new Date().toISOString(),
      method: 'X-mark (✖) detection',
      para18,
      para19,
      para20,
      notes: 'Detection based on ✖ Unicode character (U+2716) found in PDF text'
    };

    await fs.writeFile('./x_mark_detection_results.json', JSON.stringify(results, null, 2));
    console.log('\n✓ Results saved to x_mark_detection_results.json');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Error:', errorMessage);
  }
}

// Run the detection
console.log('Starting X-mark checkbox detection...\n');
detectXMarkCheckboxes().catch(console.error);