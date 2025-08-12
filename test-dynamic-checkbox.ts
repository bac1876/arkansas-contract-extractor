/**
 * Dynamic checkbox extraction using pattern analysis
 * This approach analyzes PDF structure to find selected checkboxes
 */

const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

async function dynamicCheckboxExtraction() {
  console.log('Dynamic Checkbox Extraction');
  console.log('============================\n');

  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  // Try both PDFs to see which gives better results
  const pdfPaths = [
    './sample_contract_flat.pdf',
    './sample_contract.pdf'
  ];

  for (const contractPath of pdfPaths) {
    console.log(`\nTesting: ${contractPath}`);
    console.log('='.repeat(50));

    try {
      const dataBuffer = await fs.readFile(contractPath);
      const pdfData = await pdfParse(dataBuffer);

      // Enhanced extraction function
      async function extractCheckbox(paraNum: string, pdfText: string): Promise<any> {
        const result = {
          paragraph: paraNum,
          selection: null as string | null,
          confidence: 'low',
          method: 'none',
          context: ''
        };

        // Method 1: Look for explicit checkbox markers
        const paraPattern = new RegExp(`${paraNum}\\.[\\s\\S]{0,1000}?(?=${parseInt(paraNum) + 1}\\.|$)`, 'gi');
        const paraMatch = pdfText.match(paraPattern);
        
        if (!paraMatch) {
          return result;
        }

        const paraText = paraMatch[0];
        result.context = paraText.substring(0, 200);

        // Check for various checkbox indicators
        const checkboxIndicators = [
          { pattern: /\[X\]\s*([A-D])/i, name: '[X] format' },
          { pattern: /\(X\)\s*([A-D])/i, name: '(X) format' },
          { pattern: /☑\s*([A-D])/i, name: 'checkmark format' },
          { pattern: /☒\s*([A-D])/i, name: 'checked box format' },
          { pattern: /■\s*([A-D])/i, name: 'filled box format' },
          { pattern: /([A-D])\s*\[X\]/i, name: 'reverse [X]' },
          { pattern: /([A-D])\s*\(X\)/i, name: 'reverse (X)' },
          // Look for standalone X near option letters
          { pattern: /X\s+([A-D])\./i, name: 'X before option' },
          { pattern: /([A-D])\.\s+X(?!\w)/i, name: 'X after option' },
          // Look for filled bullet or similar
          { pattern: /●\s*([A-D])/i, name: 'filled bullet' },
          { pattern: /([A-D])\s*●/i, name: 'reverse bullet' }
        ];

        for (const indicator of checkboxIndicators) {
          const match = paraText.match(indicator.pattern);
          if (match) {
            result.selection = match[1].toUpperCase();
            result.confidence = 'high';
            result.method = indicator.name;
            return result;
          }
        }

        // Method 2: Analyze option order and spacing
        // Sometimes the selected option appears differently (bold, different spacing, etc.)
        const optionPattern = /([A-D])\.\s*([^\n]{0,100})/gi;
        const options = [];
        let match;
        
        while ((match = optionPattern.exec(paraText)) !== null) {
          options.push({
            letter: match[1].toUpperCase(),
            text: match[2].trim(),
            position: match.index
          });
        }

        if (options.length > 0) {
          // Check if one option has different formatting hints
          // In some PDFs, selected options might appear first or have different text patterns
          
          // If only one option is found, it might be the selected one
          if (options.length === 1) {
            result.selection = options[0].letter;
            result.confidence = 'medium';
            result.method = 'single option found';
            return result;
          }

          // Check for text that indicates selection
          for (const option of options) {
            // Check if this option's text contains indicators of selection
            if (option.text.match(/selected|chosen|marked|checked/i)) {
              result.selection = option.letter;
              result.confidence = 'medium';
              result.method = 'text indicator';
              return result;
            }
          }

          // If we found options but can't determine selection
          result.method = `found ${options.length} options, no selection detected`;
        }

        // Method 3: Use GPT-4 to analyze the text context
        if (options.length > 0) {
          const gptPrompt = `Analyze this paragraph from a contract and determine which checkbox option (A, B, C, or D) is selected.
          
          Text:
          ${paraText}
          
          Look for:
          - Any indication that one option is marked, selected, or chosen
          - Text patterns that suggest which option applies
          - If the text describes a specific scenario that matches one option
          
          Return ONLY the letter (A, B, C, or D) of the selected option, or "NONE" if no selection is clear.`;

          try {
            const response = await openai.chat.completions.create({
              model: 'gpt-4-turbo-preview',
              messages: [
                { role: 'system', content: 'You are analyzing contract checkboxes. Return only a single letter or NONE.' },
                { role: 'user', content: gptPrompt }
              ],
              temperature: 0.1,
              max_tokens: 10
            });

            const gptResult = response.choices[0].message.content?.trim().toUpperCase();
            if (gptResult && gptResult.match(/^[A-D]$/)) {
              result.selection = gptResult;
              result.confidence = 'medium';
              result.method = 'GPT-4 analysis';
              return result;
            }
          } catch (e) {
            console.log('GPT-4 analysis failed');
          }
        }

        return result;
      }

      // Extract paragraphs 18, 19, 20
      console.log('\nExtracting checkboxes...\n');
      
      const para18Result = await extractCheckbox('18', pdfData.text);
      const para19Result = await extractCheckbox('19', pdfData.text);
      const para20Result = await extractCheckbox('20', pdfData.text);

      // Display results
      console.log('Results:');
      console.log('--------');
      
      for (const result of [para18Result, para19Result, para20Result]) {
        console.log(`\nParagraph ${result.paragraph}:`);
        console.log(`  Selection: ${result.selection || 'NOT DETECTED'}`);
        console.log(`  Confidence: ${result.confidence}`);
        console.log(`  Method: ${result.method}`);
        if (result.context) {
          console.log(`  Context: "${result.context.substring(0, 100)}..."`);
        }
      }

      // Save results
      const extractionResults = {
        pdf: contractPath,
        timestamp: new Date().toISOString(),
        para18: para18Result,
        para19: para19Result,
        para20: para20Result
      };

      const filename = contractPath.includes('flat') ? 
        './dynamic_extraction_flat.json' : 
        './dynamic_extraction_original.json';
      
      await fs.writeFile(filename, JSON.stringify(extractionResults, null, 2));
      console.log(`\n✓ Results saved to ${filename}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ Error for ${contractPath}:`, errorMessage);
    }
  }

  console.log('\n\nDynamic extraction complete!');
  console.log('============================\n');
  console.log('Next steps:');
  console.log('1. Review the extraction results from both PDFs');
  console.log('2. If standard extraction fails, consider using the OCR approach');
  console.log('3. For production, combine multiple methods for best accuracy');
}

// Run the dynamic extraction
console.log('Starting dynamic checkbox extraction...\n');
dynamicCheckboxExtraction().catch(console.error);