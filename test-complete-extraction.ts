/**
 * Complete extraction test - ensures ALL 20 field groups are extracted
 */

const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

async function completeExtraction() {
  console.log('COMPLETE Arkansas Contract Extraction - ALL 20 FIELDS');
  console.log('=====================================================\n');

  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  // Use flattened PDF for better extraction
  const contractPath = './test_contract2.pdf';

  try {
    // Parse PDF
    console.log('Parsing PDF...');
    const dataBuffer = await fs.readFile(contractPath);
    const pdfData = await pdfParse(dataBuffer);
    console.log(`✓ PDF parsed: ${pdfData.numpages} pages\n`);

    // Split into smaller chunks for better extraction
    const textChunks = [];
    const chunkSize = 10000;
    for (let i = 0; i < pdfData.text.length; i += chunkSize) {
      textChunks.push(pdfData.text.substring(i, i + chunkSize));
    }

    console.log(`Processing ${textChunks.length} chunks...\n`);

    // Extract from each chunk
    const allExtractions = [];
    for (let i = 0; i < textChunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${textChunks.length}...`);
      
      const systemPrompt = `You are extracting specific fields from an Arkansas real estate contract.
IMPORTANT: Look for paragraph numbers (1, 2, 3... or "Paragraph 1", etc.)
Many fields use "A. Yes" and "B. No" format - identify which appears FIRST (that's the selected one).
Return ONLY the requested data in JSON format.`;

      const userPrompt = `Extract ALL these fields from this contract text (chunk ${i+1}/${textChunks.length}):

TEXT:
${textChunks[i]}

EXTRACT THESE 19 FIELD GROUPS:

1. From Paragraph 1: Buyer names and property address
2. From Paragraph 3: Purchase price (dollar amount)
3. From Paragraph 3: Loan type (FHA/VA/Conventional/Cash/Other)
4. From Paragraph 5: ALL data from fill-in blanks
5. From Paragraph 7: Earnest money - look for "A. Yes" or "B. No"
6. From Paragraph 8: Non-refundable deposit - Yes or No
7. From Paragraph 10: Title option - Look for A, B, or C (the first one that appears is typically selected)
8. From Paragraph 11: Survey - who pays (Buyer/Seller/Split)
9. From Paragraph 13: Any custom written text
10. From Paragraph 14: Contingency - Yes or No
11. From Paragraph 15: Home warranty - "A. Yes" or "B. No"
12. From Paragraph 15: If checkbox B selected, what data?
13. From Paragraph 16: Which checkbox (A or B)
14. From Paragraph 19: Termite control - which checkbox (A, B, or C)
15. From Paragraph 20: Lead paint - which checkbox
16. From Paragraph 22: Date
17. From Paragraph 23: Possession - which checkbox
18. From Paragraph 32: Custom text if any
19. From Paragraph 37: Which checkbox
20. From Paragraph 38: Date
21. From Paragraph 39: Contract serial number

Return as JSON with field names like:
{
  "para1_buyers": ["name1", "name2"],
  "para1_property": "address",
  "para3_price": 250000,
  "para3_loan": "Conventional",
  "para5_blanks": ["data1", "data2"],
  "para7_earnest": true,
  "para8_nonrefundable": false,
  "para10_title": "B",
  "para11_survey": "Buyer",
  "para13_custom": "text",
  "para14_contingency": false,
  "para15_warranty": true,
  "para15_checkbox_b": "data",
  "para16": "A",
  "para19": null,
  "para20": null,
  "para22_date": "date",
  "para23_possession": "option",
  "para32_custom": null,
  "para37": null,
  "para38_date": "date",
  "para39_serial": "number"
}

If a field is not found in this chunk, set it as null.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const chunkResult = JSON.parse(response.choices[0].message.content || '{}');
      allExtractions.push(chunkResult);
    }

    // Merge results from all chunks (prefer non-null values)
    console.log('\nMerging results from all chunks...\n');
    const merged: any = {};
    
    for (const extraction of allExtractions) {
      for (const [key, value] of Object.entries(extraction)) {
        if (value !== null && value !== undefined && value !== '') {
          // If we don't have this field yet, or if this value seems more complete
          if (!merged[key] || 
              (typeof value === 'string' && value.length > (merged[key] as string).length) ||
              (Array.isArray(value) && value.length > 0)) {
            merged[key] = value;
          }
        }
      }
    }

    // Special check for Paragraph 10 Title if not found
    if (!merged.para10_title) {
      console.log('Checking for Paragraph 10 Title option...');
      const para10Pattern = /10\.[^]*?(?=11\.|$)/gi;
      const para10Match = pdfData.text.match(para10Pattern);
      
      if (para10Match && para10Match[0]) {
        const text = para10Match[0];
        // Check which option appears first
        const aPos = text.search(/\bA\./i);
        const bPos = text.search(/\bB\./i);
        const cPos = text.search(/\bC\./i);
        
        if (bPos > -1 && (aPos === -1 || bPos < aPos) && (cPos === -1 || bPos < cPos)) {
          merged.para10_title = 'B';
          console.log('  ✓ Found Title option: B\n');
        } else if (aPos > -1 && (cPos === -1 || aPos < cPos)) {
          merged.para10_title = 'A';
          console.log('  ✓ Found Title option: A\n');
        } else if (cPos > -1) {
          merged.para10_title = 'C';
          console.log('  ✓ Found Title option: C\n');
        }
      }
    }

    // NO HARDCODED VALUES - show what was actually extracted
    // Earnest money conversion only if actually found
    if (merged.para7_earnest === "A. Yes") {
      merged.para7_earnest = true;
      console.log('  ✓ Converted earnest money "A. Yes" to: true\n');
    }

    // NO HARDCODED LOAN TYPE - only show what was extracted
    // Do not override loan type

    // NO HARDCODED CONTINGENCY - only show what was extracted

    // NO HARDCODED POSSESSION - only show what was extracted

    // NO HARDCODED PARA 16 - only show what was extracted

    // NO HARDCODED PARA 13 - only show what was extracted

    // NO HARDCODED PARA 32 - only show what was extracted

    // NO HARDCODED PARA 37 - only show what was extracted

    // Dynamic checkbox detection for Para 18, 19, 20
    // These often don't extract well from PDF text
    // Use pattern matching or ask GPT-4 to analyze the context
    
    async function detectCheckbox(paraNum: string): Promise<string | null> {
      // Look for the paragraph in the PDF text
      const paraPattern = new RegExp(`${paraNum}\\.([\\s\\S]{0,500})(?=${parseInt(paraNum) + 1}\\.|$)`, 'i');
      const match = pdfData.text.match(paraPattern);
      
      if (!match) return null;
      
      const paraText = match[0];
      
      // Check if only one option is visible (likely the selected one)
      const options = paraText.match(/([A-D])\./gi);
      if (options && options.length === 1) {
        return options[0].charAt(0).toUpperCase();
      }
      
      // If we can't determine from structure, return null
      // In production, this would trigger additional detection methods
      return null;
    }
    
    // Try dynamic detection for Para 19, 20
    // Use smart pattern extraction for Para 19
    
    if (!merged.para19) {
      // Check for the specific 18-19 pattern that causes extraction issues
      const pattern18to19 = /18\.\s*A\.\s*B\.\s*C\.\s*D\.\s*19\.\s*A\.\s*B\.\s*C\./s;
      const match = pdfData.text.match(pattern18to19);
      
      if (match) {
        // Found the problematic pattern - use learned mapping
        const afterPattern = pdfData.text.substring(match.index! + match[0].length, match.index! + match[0].length + 200);
        const xMarks = (afterPattern.match(/✖/g) || []).length;
        
        // NO HARDCODED PARA 19 - only report what was found
        console.log(`  ⚠ Para 19 pattern found with ${xMarks} X marks - not assuming value\n`);
      } else {
        // Try standard detection
        const detected19 = await detectCheckbox('19');
        if (detected19) {
          merged.para19 = detected19;
          console.log(`  ✓ Detected Paragraph 19 checkbox: ${detected19}\n`);
        } else {
          console.log('  ⚠ Could not detect Para 19 - manual review needed\n');
        }
      }
    }
    
    if (!merged.para20) {
      const detected20 = await detectCheckbox('20');
      if (detected20) {
        merged.para20 = detected20;
        console.log(`  ✓ Detected Paragraph 20 checkbox: ${detected20}\n`);
      } else {
        // NO HARDCODED PARA 20 - only report what was found
        if (pdfData.text.includes('not constructed prior to 1978')) {
          console.log('  ⚠ Found "not constructed prior to 1978" text but not assuming value\n');
        } else {
          console.log('  ⚠ Could not detect Para 20\n');
        }
      }
    }

    // Fix Survey to be A or B instead of "Buyer"/"Seller"
    if (merged.para11_survey === 'Buyer') {
      merged.para11_survey = 'A';
      console.log('  ✓ Converted Survey to: A (Buyer)\n');
    } else if (merged.para11_survey === 'Seller') {
      merged.para11_survey = 'B';
      console.log('  ✓ Converted Survey to: B (Seller)\n');
    }

    // Note: Paragraphs 19 and 20 have no data in this contract

    // Display ALL results
    console.log('═══════════════════════════════════════════════════════');
    console.log('           COMPLETE EXTRACTION RESULTS - ALL 20 FIELDS  ');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('1. PARTIES (Paragraph 1):');
    console.log(`   Buyers: ${merged.para1_buyers?.join(', ') || 'NOT FOUND'}`);
    console.log(`   Property: ${merged.para1_property || 'NOT FOUND'}\n`);

    console.log('2. PURCHASE PRICE (Paragraph 3):');
    console.log(`   Amount: ${merged.para3_price ? '$' + merged.para3_price.toLocaleString() : 'NOT FOUND'}\n`);

    console.log('3. LOAN TYPE (Paragraph 3):');
    console.log(`   Type: ${merged.para3_loan || 'NOT FOUND'}\n`);

    console.log('4. PARAGRAPH 5 BLANKS:');
    if (merged.para5_blanks && merged.para5_blanks.length > 0) {
      merged.para5_blanks.forEach((item: string, i: number) => {
        console.log(`   ${i + 1}. ${item}`);
      });
    } else {
      console.log(`   NOT FOUND`);
    }
    console.log();

    console.log('5. EARNEST MONEY (Paragraph 7):');
    console.log(`   Has Earnest Money: ${merged.para7_earnest === true ? 'YES' : merged.para7_earnest === false ? 'NO' : 'NOT FOUND'}\n`);

    console.log('6. NON-REFUNDABLE (Paragraph 8):');
    console.log(`   Is Non-refundable: ${merged.para8_nonrefundable === true ? 'YES' : merged.para8_nonrefundable === false ? 'NO' : 'NOT FOUND'}\n`);

    console.log('7. TITLE OPTION (Paragraph 10):');
    console.log(`   Selected: ${merged.para10_title || 'NOT FOUND'}\n`);

    console.log('8. SURVEY (Paragraph 11):');
    console.log(`   Who Pays: ${merged.para11_survey || 'NOT FOUND'}\n`);

    console.log('9. PARAGRAPH 13 CUSTOM:');
    console.log(`   Text: ${merged.para13_custom || 'NOT FOUND'}\n`);

    console.log('10. CONTINGENCY (Paragraph 14):');
    console.log(`    Has Contingency: ${merged.para14_contingency === true ? 'YES' : merged.para14_contingency === false ? 'NO' : 'NOT FOUND'}\n`);

    console.log('11. HOME WARRANTY (Paragraph 15):');
    console.log(`    Has Warranty: ${merged.para15_warranty === true ? 'YES' : merged.para15_warranty === false ? 'NO' : 'NOT FOUND'}`);
    console.log(`    Checkbox B Data: ${merged.para15_checkbox_b || 'NOT FOUND'}\n`);

    console.log('12. PARAGRAPH 16 CHECKBOX:');
    console.log(`    Selected: ${merged.para16 || 'NOT FOUND'}\n`);

    console.log('13. PARAGRAPH 19 CHECKBOX (Termite Control):');
    console.log(`    Selected: ${merged.para19 || 'NOT FOUND - Manual Review Needed'}\n`);

    console.log('14. PARAGRAPH 20 CHECKBOX (Lead Paint):');
    console.log(`    Selected: ${merged.para20 || 'NOT FOUND'}\n`);

    console.log('15. PARAGRAPH 22 DATE:');
    console.log(`    Date: ${merged.para22_date || 'NOT FOUND'}\n`);

    console.log('16. POSSESSION (Paragraph 23):');
    console.log(`    Selected: ${merged.para23_possession || 'NOT FOUND'}\n`);

    console.log('17. PARAGRAPH 32 CUSTOM:');
    console.log(`    Text: ${merged.para32_custom || 'NOT FOUND'}\n`);

    console.log('18. PARAGRAPH 37 CHECKBOX:');
    console.log(`    Selected: ${merged.para37 || 'NOT FOUND'}\n`);

    console.log('19. PARAGRAPH 38 DATE:');
    console.log(`    Date: ${merged.para38_date || 'NOT FOUND'}\n`);

    console.log('20. PARAGRAPH 39 SERIAL:');
    console.log(`    Serial Number: ${merged.para39_serial || 'NOT FOUND'}\n`);

    // Count how many fields were found (excluding para18 from count)
    const fieldCount = Object.values(merged).filter(v => v !== null && v !== undefined).length;
    console.log('═══════════════════════════════════════════════════════');
    console.log(`SUMMARY: Found ${fieldCount} out of 21 fields (Para 18 no longer required)`);
    console.log('═══════════════════════════════════════════════════════\n');

    // Save complete results
    await fs.writeFile('./complete_extraction.json', JSON.stringify(merged, null, 2));
    console.log('✓ Complete results saved to complete_extraction.json\n');

    // Create CSV
    const csvRows = [
      ['Field', 'Value'],
      ['Para 1 - Buyers', merged.para1_buyers?.join('; ') || ''],
      ['Para 1 - Property', merged.para1_property || ''],
      ['Para 3 - Price', merged.para3_price?.toString() || ''],
      ['Para 3 - Loan Type', merged.para3_loan || ''],
      ['Para 5 - Blanks', merged.para5_blanks?.join('; ') || ''],
      ['Para 7 - Earnest Money', merged.para7_earnest === true ? 'YES' : merged.para7_earnest === false ? 'NO' : ''],
      ['Para 8 - Non-refundable', merged.para8_nonrefundable === true ? 'YES' : merged.para8_nonrefundable === false ? 'NO' : ''],
      ['Para 10 - Title', merged.para10_title || ''],
      ['Para 11 - Survey', merged.para11_survey || ''],
      ['Para 13 - Custom', merged.para13_custom || ''],
      ['Para 14 - Contingency', merged.para14_contingency === true ? 'YES' : merged.para14_contingency === false ? 'NO' : ''],
      ['Para 15 - Warranty', merged.para15_warranty === true ? 'YES' : merged.para15_warranty === false ? 'NO' : ''],
      ['Para 15 - Checkbox B', merged.para15_checkbox_b || ''],
      ['Para 16', merged.para16 || ''],
      ['Para 19 - Termite', merged.para19 || 'Manual Review'],
      ['Para 20 - Lead Paint', merged.para20 || ''],
      ['Para 22 - Date', merged.para22_date || ''],
      ['Para 23 - Possession', merged.para23_possession || ''],
      ['Para 32 - Custom', merged.para32_custom || ''],
      ['Para 37', merged.para37 || ''],
      ['Para 38 - Date', merged.para38_date || ''],
      ['Para 39 - Serial', merged.para39_serial || '']
    ];

    const csv = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    await fs.writeFile('./complete_extraction.csv', csv);
    console.log('✓ CSV saved to complete_extraction.csv');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Error:', errorMessage);
  }
}

// Run the test
console.log('Starting COMPLETE extraction of ALL 20 fields...\n');
completeExtraction().catch(console.error);