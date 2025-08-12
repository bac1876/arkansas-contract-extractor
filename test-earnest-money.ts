/**
 * Specialized test for Earnest Money extraction (Paragraph 7)
 * Focuses on getting accurate Yes/No detection
 */

const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testEarnestMoneyExtraction() {
  console.log('Arkansas Contract - Earnest Money Extraction Test');
  console.log('=================================================\n');

  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  const contractPath = './sample_contract.pdf';

  try {
    // Parse PDF
    console.log('Parsing PDF...');
    const dataBuffer = await fs.readFile(contractPath);
    const pdfData = await pdfParse(dataBuffer);
    console.log(`✓ PDF parsed: ${pdfData.numpages} pages\n`);

    // First, let's find paragraph 7 in the text
    console.log('METHOD 1: Searching for Paragraph 7 content...');
    console.log('================================================\n');
    
    // Look for paragraph 7 patterns
    const para7Patterns = [
      /paragraph\s*7[^\n]*earnest/gi,
      /7\.\s*earnest\s*money/gi,
      /earnest\s*money.*deposit/gi,
      /initial\s*earnest\s*money/gi,
      /buyer.*agrees.*deposit.*earnest/gi
    ];

    let foundText = '';
    for (const pattern of para7Patterns) {
      const matches = pdfData.text.match(pattern);
      if (matches) {
        console.log(`Found match with pattern: ${pattern}`);
        
        // Get surrounding context (500 chars before and after)
        const index = pdfData.text.indexOf(matches[0]);
        const start = Math.max(0, index - 200);
        const end = Math.min(pdfData.text.length, index + matches[0].length + 500);
        foundText = pdfData.text.substring(start, end);
        
        console.log('\nContext around match:');
        console.log('-------------------');
        console.log(foundText);
        console.log('-------------------\n');
        break;
      }
    }

    // Now use GPT-4 with very specific instructions
    console.log('METHOD 2: Using GPT-4 with targeted extraction...');
    console.log('================================================\n');

    const systemPrompt = `You are analyzing an Arkansas real estate contract.
Your ONLY job is to determine if there is earnest money in this contract.
Look for:
- The word "earnest money" 
- Any dollar amount associated with earnest money
- Checkboxes or blanks related to earnest money
- The phrase "initial earnest money"
- Paragraph 7 which typically contains earnest money information

Return ONLY a JSON object with:
{
  "has_earnest_money": true or false,
  "evidence": "quote the exact text that shows earnest money",
  "confidence": 0-100
}`;

    const userPrompt = `Is there earnest money in this contract? Look especially in paragraph 7.

CONTRACT TEXT (focusing on earnest money sections):
${foundText || pdfData.text.substring(0, 10000)}

Remember: We only need YES or NO for earnest money existence, not the amount.`;

    console.log('Asking GPT-4 about earnest money...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    console.log('\nGPT-4 Analysis Result:');
    console.log('----------------------');
    console.log(`Has Earnest Money: ${result.has_earnest_money ? 'YES' : 'NO'}`);
    console.log(`Confidence: ${result.confidence}%`);
    if (result.evidence) {
      console.log(`\nEvidence found:`);
      console.log(`"${result.evidence}"`);
    }

    // METHOD 3: Simple keyword detection as backup
    console.log('\n\nMETHOD 3: Simple keyword detection...');
    console.log('=====================================\n');

    const earnestKeywords = [
      'earnest money',
      'earnest deposit',
      'initial earnest',
      'earnest money deposit',
      'EM deposit'
    ];

    let keywordFound = false;
    for (const keyword of earnestKeywords) {
      const regex = new RegExp(keyword, 'gi');
      if (regex.test(pdfData.text)) {
        console.log(`✓ Found keyword: "${keyword}"`);
        keywordFound = true;
        
        // Find the context
        const matches = pdfData.text.match(regex);
        if (matches) {
          const index = pdfData.text.indexOf(matches[0]);
          const contextStart = Math.max(0, index - 100);
          const contextEnd = Math.min(pdfData.text.length, index + matches[0].length + 100);
          const context = pdfData.text.substring(contextStart, contextEnd);
          console.log(`   Context: "...${context.replace(/\n/g, ' ')}..."`);
        }
      }
    }

    if (!keywordFound) {
      console.log('✗ No earnest money keywords found');
    }

    // METHOD 4: Look for specific checkbox patterns
    console.log('\n\nMETHOD 4: Checkbox pattern detection...');
    console.log('=======================================\n');

    const checkboxPatterns = [
      /\[[\s✓X]\]\s*earnest money/gi,
      /\([\s✓X]\)\s*earnest money/gi,
      /earnest money.*\[[\s✓X]\]/gi,
      /earnest money.*\([\s✓X]\)/gi,
      /☐\s*earnest money/gi,
      /☑\s*earnest money/gi
    ];

    let checkboxFound = false;
    for (const pattern of checkboxPatterns) {
      const matches = pdfData.text.match(pattern);
      if (matches) {
        console.log(`✓ Found checkbox pattern: ${matches[0]}`);
        checkboxFound = true;
        
        // Determine if checked or unchecked
        if (/[✓X☑]/.test(matches[0])) {
          console.log('   Status: CHECKED (Earnest money = YES)');
        } else {
          console.log('   Status: UNCHECKED (Earnest money = NO)');
        }
      }
    }

    if (!checkboxFound) {
      console.log('✗ No checkbox patterns found for earnest money');
    }

    // FINAL DETERMINATION
    console.log('\n\n════════════════════════════════════════');
    console.log('           FINAL DETERMINATION           ');
    console.log('════════════════════════════════════════\n');

    const finalDecision = result.has_earnest_money || keywordFound;
    console.log(`EARNEST MONEY PRESENT: ${finalDecision ? '✓ YES' : '✗ NO'}`);
    console.log(`\nBased on:`);
    console.log(`- GPT-4 Analysis: ${result.has_earnest_money ? 'Yes' : 'No'} (${result.confidence}% confidence)`);
    console.log(`- Keyword Detection: ${keywordFound ? 'Found' : 'Not found'}`);
    console.log(`- Checkbox Patterns: ${checkboxFound ? 'Found' : 'Not found'}`);

    // Save detailed results
    const detailedResults = {
      earnest_money_present: finalDecision,
      methods: {
        gpt4: {
          found: result.has_earnest_money,
          confidence: result.confidence,
          evidence: result.evidence
        },
        keyword_detection: {
          found: keywordFound
        },
        checkbox_detection: {
          found: checkboxFound
        }
      },
      recommendation: "If this is incorrect, the contract may use non-standard terminology or formatting for earnest money."
    };

    await fs.writeFile(
      './earnest_money_analysis.json', 
      JSON.stringify(detailedResults, null, 2)
    );
    console.log('\n✓ Detailed analysis saved to earnest_money_analysis.json');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Error:', errorMessage);
  }
}

// Run the test
console.log('Starting Earnest Money specialized extraction...\n');
testEarnestMoneyExtraction().catch(console.error);