/**
 * Enhanced extraction using multiple methods to detect checkboxes
 * Combines pattern matching with contextual analysis
 */

const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

async function enhancedCheckboxExtraction() {
  console.log('Enhanced Checkbox Extraction');
  console.log('============================\n');

  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  const contractPath = './sample_contract_flat.pdf';

  try {
    const dataBuffer = await fs.readFile(contractPath);
    const pdfData = await pdfParse(dataBuffer);

    // Create a more sophisticated extraction function
    async function extractParagraphCheckbox(paraNum: string): Promise<{selection: string | null, method: string}> {
      console.log(`\nAnalyzing Paragraph ${paraNum}...`);
      
      // Find the paragraph in the text
      const patterns = [
        new RegExp(`${paraNum}\\.[\\s\\S]{0,1500}?(?=${parseInt(paraNum) + 1}\\.|$)`, 'gi'),
        new RegExp(`PARAGRAPH ${paraNum}[\\s\\S]{0,1500}?(?=PARAGRAPH ${parseInt(paraNum) + 1}|$)`, 'gi'),
        new RegExp(`\\b${paraNum}\\.[\\s\\S]{0,1500}?(?=\\b${parseInt(paraNum) + 1}\\.|$)`, 'gi')
      ];

      let paraText = '';
      for (const pattern of patterns) {
        const match = pdfData.text.match(pattern);
        if (match && match[0].length > 20) {
          paraText = match[0];
          break;
        }
      }

      if (!paraText) {
        console.log(`  ❌ Paragraph ${paraNum} not found in text`);
        return { selection: null, method: 'not found' };
      }

      console.log(`  ✓ Found paragraph text (${paraText.length} chars)`);

      // Method 1: Look for common checkbox patterns
      const checkboxPatterns = [
        { regex: /\[X\]\s*([A-D])/i, name: '[X] marker' },
        { regex: /\(X\)\s*([A-D])/i, name: '(X) marker' },
        { regex: /☑\s*([A-D])/i, name: 'checkmark' },
        { regex: /☒\s*([A-D])/i, name: 'checked box' },
        { regex: /■\s*([A-D])/i, name: 'filled square' },
        { regex: /●\s*([A-D])/i, name: 'filled circle' },
        { regex: /([A-D])\s*\[X\]/i, name: 'reverse [X]' },
        { regex: /([A-D])\s*\(X\)/i, name: 'reverse (X)' },
        { regex: /✓\s*([A-D])/i, name: 'checkmark before' },
        { regex: /([A-D])\s*✓/i, name: 'checkmark after' }
      ];

      for (const pattern of checkboxPatterns) {
        const match = paraText.match(pattern.regex);
        if (match) {
          console.log(`  ✓ Found checkbox using ${pattern.name}: ${match[1].toUpperCase()}`);
          return { selection: match[1].toUpperCase(), method: pattern.name };
        }
      }

      // Method 2: Analyze the structure of options
      const optionMatches = paraText.matchAll(/([A-D])\.\s*([^\n]*)/gi);
      const options = Array.from(optionMatches).map(m => ({
        letter: m[1].toUpperCase(),
        text: m[2].trim(),
        fullMatch: m[0]
      }));

      console.log(`  Found ${options.length} options`);

      // If only one option is visible, it might be the selected one
      if (options.length === 1) {
        console.log(`  ✓ Only option ${options[0].letter} found - likely selected`);
        return { selection: options[0].letter, method: 'single option' };
      }

      // Method 3: Look for contextual clues in the paragraph text
      // Sometimes the text after the options indicates which was selected
      const contextClues = [
        { pattern: /(?:selected|chosen|marked|checked).*?([A-D])/i, name: 'selection keyword' },
        { pattern: /option\s+([A-D])\s+(?:is|was|has been)\s+(?:selected|chosen|marked)/i, name: 'option is selected' },
        { pattern: /([A-D])\s+(?:is|was|has been)\s+(?:selected|chosen|marked)/i, name: 'letter is selected' }
      ];

      for (const clue of contextClues) {
        const match = paraText.match(clue.pattern);
        if (match && match[1].match(/[A-D]/i)) {
          console.log(`  ✓ Found via ${clue.name}: ${match[1].toUpperCase()}`);
          return { selection: match[1].toUpperCase(), method: clue.name };
        }
      }

      // Method 4: Use GPT-4 to analyze the full context
      if (options.length > 0) {
        console.log('  Using GPT-4 for contextual analysis...');
        
        const prompt = `Analyze this paragraph from an Arkansas real estate contract and determine which checkbox option is selected.

Paragraph ${paraNum} text:
${paraText}

Instructions:
1. Look for any indication that one option is marked or selected
2. Consider the context - if the text describes a specific scenario, which option does it match?
3. If you see options A, B, C, D but can't determine which is selected, return NONE
4. Return ONLY the single letter (A, B, C, or D) that is selected, or NONE

Response (single letter or NONE):`;

        try {
          const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
              { 
                role: 'system', 
                content: 'You analyze legal contracts to identify selected checkbox options. Respond with only a single letter (A, B, C, or D) or NONE.' 
              },
              { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 10
          });

          const result = response.choices[0].message.content?.trim().toUpperCase();
          if (result && result.match(/^[A-D]$/)) {
            console.log(`  ✓ GPT-4 identified: ${result}`);
            return { selection: result, method: 'GPT-4 analysis' };
          } else {
            console.log(`  GPT-4 result: ${result}`);
          }
        } catch (error) {
          console.log('  GPT-4 analysis failed');
        }
      }

      // Method 5: Check if the paragraph describes a specific scenario that matches an option
      // For example, if Para 20 talks about property built after 1978, that's option A
      if (paraNum === '20' && paraText.includes('not constructed prior to 1978')) {
        console.log('  ✓ Para 20: Property built after 1978 = Option A');
        return { selection: 'A', method: 'contextual match' };
      }

      console.log('  ❌ Could not determine selection');
      return { selection: null, method: 'no detection' };
    }

    // Extract the problematic paragraphs
    console.log('Starting enhanced extraction...');
    console.log('='.repeat(50));

    const para18 = await extractParagraphCheckbox('18');
    const para19 = await extractParagraphCheckbox('19');
    const para20 = await extractParagraphCheckbox('20');

    // Also check some other paragraphs to verify the method works
    const para11 = await extractParagraphCheckbox('11');
    const para16 = await extractParagraphCheckbox('16');

    // Display results
    console.log('\n\n' + '='.repeat(50));
    console.log('EXTRACTION RESULTS');
    console.log('='.repeat(50) + '\n');

    const results = [
      { para: '11 (Survey)', ...para11 },
      { para: '16 (Inspection)', ...para16 },
      { para: '18', ...para18 },
      { para: '19', ...para19 },
      { para: '20', ...para20 }
    ];

    for (const result of results) {
      console.log(`Paragraph ${result.para}:`);
      console.log(`  Selection: ${result.selection || 'NOT DETECTED'}`);
      console.log(`  Method: ${result.method}`);
      console.log();
    }

    // Save results
    const extractionData = {
      timestamp: new Date().toISOString(),
      pdf: contractPath,
      results: {
        para11: para11.selection,
        para16: para16.selection,
        para18: para18.selection,
        para19: para19.selection,
        para20: para20.selection
      },
      methods: {
        para11: para11.method,
        para16: para16.method,
        para18: para18.method,
        para19: para19.method,
        para20: para20.method
      }
    };

    await fs.writeFile('./enhanced_extraction_results.json', JSON.stringify(extractionData, null, 2));
    console.log('✓ Results saved to enhanced_extraction_results.json\n');

    // Provide recommendations
    console.log('RECOMMENDATIONS:');
    console.log('================');
    console.log('1. The flattened PDF helps with text extraction');
    console.log('2. Paragraphs 18 and 19 may not have checkbox markers in the PDF');
    console.log('3. Consider asking users to provide contracts with clearly marked checkboxes');
    console.log('4. For production, combine multiple detection methods');
    console.log('5. May need to use OCR or computer vision for some PDFs');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Error:', errorMessage);
  }
}

// Run the enhanced extraction
console.log('Starting enhanced checkbox extraction...\n');
enhancedCheckboxExtraction().catch(console.error);