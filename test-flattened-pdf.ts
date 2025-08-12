/**
 * Test extraction with flattened PDF to see if it improves results
 */

const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

async function testFlattenedPDF() {
  console.log('Testing Flattened PDF Extraction');
  console.log('=================================\n');

  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  const originalPath = './sample_contract.pdf';
  const flattenedPath = './sample_contract_flat.pdf';

  try {
    // Parse both PDFs
    console.log('1. PARSING ORIGINAL PDF...');
    const originalBuffer = await fs.readFile(originalPath);
    const originalPdf = await pdfParse(originalBuffer);
    console.log(`   Pages: ${originalPdf.numpages}`);
    console.log(`   Text length: ${originalPdf.text.length} chars\n`);

    console.log('2. PARSING FLATTENED PDF...');
    const flattenedBuffer = await fs.readFile(flattenedPath);
    const flattenedPdf = await pdfParse(flattenedBuffer);
    console.log(`   Pages: ${flattenedPdf.numpages}`);
    console.log(`   Text length: ${flattenedPdf.text.length} chars\n`);

    // Look for specific problem areas in both
    console.log('3. SEARCHING FOR PROBLEM FIELDS:\n');
    
    const searchTargets = [
      { name: 'Paragraph 13 Custom', pattern: /13\.\s*[^]*?(?=14\.|$)/gi },
      { name: 'Paragraph 18', pattern: /18\.\s*[^]*?(?=19\.|$)/gi },
      { name: 'Paragraph 19', pattern: /19\.\s*[^]*?(?=20\.|$)/gi },
      { name: 'Paragraph 20', pattern: /20\.\s*[^]*?(?=21\.|$)/gi },
      { name: 'Paragraph 23 Possession', pattern: /23\.\s*POSSESSION[^]*?(?=24\.|$)/gi },
      { name: 'Paragraph 37', pattern: /37\.\s*[^]*?(?=38\.|$)/gi }
    ];

    for (const target of searchTargets) {
      console.log(`\n${target.name}:`);
      console.log('-'.repeat(50));
      
      // Search in original
      const originalMatch = originalPdf.text.match(target.pattern);
      if (originalMatch && originalMatch[0].length > 20) {
        console.log('ORIGINAL PDF:');
        console.log(originalMatch[0].substring(0, 300));
      } else {
        console.log('ORIGINAL PDF: Not found or too short');
      }
      
      console.log('\n');
      
      // Search in flattened
      const flattenedMatch = flattenedPdf.text.match(target.pattern);
      if (flattenedMatch && flattenedMatch[0].length > 20) {
        console.log('FLATTENED PDF:');
        console.log(flattenedMatch[0].substring(0, 300));
      } else {
        console.log('FLATTENED PDF: Not found or too short');
      }
    }

    // Do a full extraction on flattened PDF
    console.log('\n\n4. FULL EXTRACTION FROM FLATTENED PDF:');
    console.log('='.repeat(60) + '\n');

    const systemPrompt = `You are extracting specific fields from an Arkansas real estate contract.
Look for paragraph numbers and extract the requested information.
Return ONLY the requested data in JSON format.`;

    const userPrompt = `Extract these fields from this Arkansas contract:

TEXT:
${flattenedPdf.text.substring(10000, 35000)}

EXTRACT:
1. Paragraph 13 - Any custom written text
2. Paragraph 18 - Which checkbox (A, B, C, or D)
3. Paragraph 19 - Which checkbox (A, B, or C)
4. Paragraph 20 - Lead-based paint option
5. Paragraph 23 - Possession option
6. Paragraph 37 - Which checkbox

Return as JSON:
{
  "para13_custom": "text or null",
  "para18": "A/B/C/D or null",
  "para19": "A/B/C or null",
  "para20": "option or null",
  "para23_possession": "option or null",
  "para37": "option or null"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    const extracted = JSON.parse(response.choices[0].message.content || '{}');
    
    console.log('GPT-4 Extraction Results:');
    console.log(JSON.stringify(extracted, null, 2));

    // Manual pattern search for Paragraph 37 specifically
    console.log('\n\n5. DETAILED SEARCH FOR PARAGRAPH 37:');
    console.log('-'.repeat(50));
    
    // Try different patterns
    const para37Patterns = [
      /37\./gi,
      /PARAGRAPH 37/gi,
      /37\.\s*[A-Z]/gi,
      /OTHER PROVISIONS[^]*?37/gi
    ];

    for (const pattern of para37Patterns) {
      const matches = flattenedPdf.text.match(pattern);
      if (matches) {
        console.log(`\nPattern ${pattern} found ${matches.length} matches`);
        if (matches[0]) {
          // Get context around the match
          const index = flattenedPdf.text.indexOf(matches[0]);
          const context = flattenedPdf.text.substring(Math.max(0, index - 100), Math.min(flattenedPdf.text.length, index + 400));
          console.log('Context:');
          console.log(context);
        }
      }
    }

    // Save comparison results
    const comparison = {
      original: {
        pages: originalPdf.numpages,
        textLength: originalPdf.text.length,
        sample: originalPdf.text.substring(20000, 20500)
      },
      flattened: {
        pages: flattenedPdf.numpages,
        textLength: flattenedPdf.text.length,
        sample: flattenedPdf.text.substring(20000, 20500)
      },
      extraction: extracted
    };

    await fs.writeFile('./flattened_comparison.json', JSON.stringify(comparison, null, 2));
    console.log('\n✓ Comparison saved to flattened_comparison.json');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Error:', errorMessage);
  }
}

// Run the test
console.log('Starting flattened PDF test...\n');
testFlattenedPDF().catch(console.error);