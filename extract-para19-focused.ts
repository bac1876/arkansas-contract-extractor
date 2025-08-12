/**
 * Focused extraction for Paragraph 19 only
 * Uses multiple techniques to detect the checkbox selection
 */

const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

async function extractParagraph19Only() {
  console.log('Paragraph 19 Focused Extraction');
  console.log('================================\n');

  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  // Try both PDFs
  const pdfPaths = [
    { path: './sample_contract_flat.pdf', label: 'Flattened' },
    { path: './sample_contract.pdf', label: 'Original' }
  ];

  for (const { path, label } of pdfPaths) {
    console.log(`\nTesting ${label} PDF:`);
    console.log('='.repeat(50));

    try {
      const dataBuffer = await fs.readFile(path);
      const pdfData = await pdfParse(dataBuffer);

      // Method 1: Direct pattern search for Para 19
      console.log('\nMethod 1: Pattern Search');
      console.log('-'.repeat(30));
      
      // Look for Paragraph 19 with various patterns
      const patterns = [
        /19\.\s*TERMITE[^]*?(?:A\.\s*[^\n]*\n\s*B\.\s*[^\n]*\n\s*C\.[^\n]*)/gi,
        /19\.\s*[^]*?A\.\s*[^]*?B\.\s*[^]*?C\./gi,
        /PARAGRAPH 19[^]*?(?:A\.\s*[^\n]*\n\s*B\.\s*[^\n]*\n\s*C\.[^\n]*)/gi,
        /19\.\s*A\.\s*B\.\s*C\./gi
      ];

      let para19Text = '';
      for (const pattern of patterns) {
        const match = pdfData.text.match(pattern);
        if (match) {
          para19Text = match[0];
          console.log('Found Para 19 with pattern match');
          break;
        }
      }

      if (!para19Text) {
        // Try to find it between 18 and 20
        const betweenPattern = /18\.[^]*?19\.[^]*?20\./gi;
        const betweenMatch = pdfData.text.match(betweenPattern);
        if (betweenMatch) {
          // Extract just the Para 19 portion
          const para19Pattern = /19\.[^]*?(?=20\.)/i;
          const extracted = betweenMatch[0].match(para19Pattern);
          if (extracted) {
            para19Text = extracted[0];
            console.log('Found Para 19 between 18 and 20');
          }
        }
      }

      if (para19Text) {
        console.log(`Para 19 text (first 200 chars): "${para19Text.substring(0, 200).replace(/\n/g, ' ')}"`);
        
        // Check for checkbox indicators
        const checkboxIndicators = [
          { pattern: /\[X\]\s*([ABC])/i, name: '[X] mark' },
          { pattern: /\(X\)\s*([ABC])/i, name: '(X) mark' },
          { pattern: /✖\s*([ABC])/i, name: '✖ mark' },
          { pattern: /☑\s*([ABC])/i, name: 'checkmark' },
          { pattern: /([ABC])\s*\[X\]/i, name: 'reverse [X]' },
          { pattern: /([ABC])\s*✖/i, name: 'reverse ✖' }
        ];

        let detectedOption = null;
        for (const indicator of checkboxIndicators) {
          const match = para19Text.match(indicator.pattern);
          if (match) {
            detectedOption = match[1].toUpperCase();
            console.log(`  ✓ Detected option ${detectedOption} using ${indicator.name}`);
            break;
          }
        }

        if (!detectedOption) {
          // Check if only one option is visible
          const options = para19Text.match(/([ABC])\./gi);
          if (options && options.length === 1) {
            detectedOption = options[0].charAt(0).toUpperCase();
            console.log(`  ✓ Only option ${detectedOption} visible - likely selected`);
          }
        }

        if (detectedOption) {
          console.log(`\n✅ Para 19 = Option ${detectedOption}`);
        } else {
          console.log('  Could not determine selection from pattern matching');
        }
      }

      // Method 2: Check for X marks near Para 19
      console.log('\nMethod 2: X-Mark Proximity Analysis');
      console.log('-'.repeat(30));
      
      // Find all ✖ marks and their positions
      const xMarkPositions: number[] = [];
      let xMatch;
      const xRegex = /✖/g;
      while ((xMatch = xRegex.exec(pdfData.text)) !== null) {
        xMarkPositions.push(xMatch.index);
      }
      
      console.log(`Found ${xMarkPositions.length} ✖ marks in the PDF`);
      
      // Find position of "19."
      const para19Pos = pdfData.text.search(/\b19\./);
      if (para19Pos !== -1 && xMarkPositions.length > 0) {
        // Find the closest X mark after Para 19
        const nearbyXMarks = xMarkPositions.filter(pos => 
          pos > para19Pos && pos < para19Pos + 500
        );
        
        if (nearbyXMarks.length > 0) {
          console.log(`Found ${nearbyXMarks.length} ✖ mark(s) near Para 19`);
          
          // Check what's between Para 19 and the X mark
          const textBetween = pdfData.text.substring(para19Pos, nearbyXMarks[0]);
          const optionsBefore = textBetween.match(/([ABC])\./gi);
          if (optionsBefore && optionsBefore.length > 0) {
            // The X mark likely corresponds to the last option before it
            const likelyOption = optionsBefore[optionsBefore.length - 1].charAt(0);
            console.log(`  ✓ X mark appears after option ${likelyOption}`);
          }
        }
      }

      // Method 3: Use GPT-4 to analyze the context
      console.log('\nMethod 3: GPT-4 Context Analysis');
      console.log('-'.repeat(30));
      
      // Extract a larger context around Para 19
      const contextStart = Math.max(0, para19Pos - 200);
      const contextEnd = Math.min(pdfData.text.length, para19Pos + 800);
      const context = pdfData.text.substring(contextStart, contextEnd);
      
      if (context.includes('19.')) {
        const prompt = `Analyze this section of an Arkansas real estate contract and determine which option (A, B, or C) is selected for Paragraph 19 (Termite Control).

Context from the contract:
${context}

Paragraph 19 deals with termite control requirements and typically has these options:
A. Termite inspection required
B. Termite inspection and treatment if needed
C. No termite inspection required

Based on the text, which option appears to be selected? Look for:
- Any marks, indicators, or formatting that suggests selection
- Text that describes which termite control option applies
- If you see "19." followed by options A, B, C, determine which is marked

Return ONLY the letter (A, B, or C) or "UNKNOWN" if you cannot determine.`;

        try {
          const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
              { 
                role: 'system', 
                content: 'You analyze contracts to identify selected options. Respond with only a single letter or UNKNOWN.' 
              },
              { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 10
          });

          const gptResult = response.choices[0].message.content?.trim().toUpperCase();
          console.log(`GPT-4 analysis result: ${gptResult}`);
          
          if (gptResult && gptResult.match(/^[ABC]$/)) {
            console.log(`\n✅ Para 19 = Option ${gptResult} (via GPT-4)`);
          }
        } catch (error) {
          console.log('GPT-4 analysis failed');
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error with ${label} PDF:`, errorMessage);
    }
  }

  // Final recommendation
  console.log('\n\n' + '='.repeat(50));
  console.log('EXTRACTION SUMMARY');
  console.log('='.repeat(50));
  console.log('\nParagraph 19 (Termite Control) extraction results:');
  console.log('- Standard text extraction cannot reliably detect the checkbox');
  console.log('- The ✖ marks appear in the PDF but not adjacent to options');
  console.log('- Visual inspection showed Option B is selected');
  console.log('\nRecommendations:');
  console.log('1. Request contracts with embedded form fields');
  console.log('2. Use OCR with image processing for checkbox detection');
  console.log('3. Implement manual review for Para 19 when auto-detection fails');
  
  // Save extraction status
  const status = {
    timestamp: new Date().toISOString(),
    para19_auto_detected: false,
    para19_visual_inspection: 'B',
    extraction_methods_tried: [
      'Pattern matching',
      'X-mark proximity analysis',
      'GPT-4 context analysis'
    ],
    recommendation: 'Manual review required for Para 19 in current PDF format'
  };
  
  await fs.writeFile('./para19_extraction_status.json', JSON.stringify(status, null, 2));
  console.log('\n✓ Status saved to para19_extraction_status.json');
}

// Run the extraction
console.log('Starting Paragraph 19 focused extraction...\n');
extractParagraph19Only().catch(console.error);