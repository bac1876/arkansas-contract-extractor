/**
 * Extract Page 4 data (Paragraphs 5-8) using Vision API
 */

import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';

dotenv.config();

async function extractPage4() {
  console.log('Page 4 Extraction (Paragraphs 5-8)');
  console.log('===================================\n');

  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  try {
    const imageBuffer = await fs.readFile('./pages/page4.png');
    const base64Image = imageBuffer.toString('base64');

    console.log('Sending to GPT-4 Vision API...\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this Arkansas real estate contract page and extract information from Paragraphs 5-8.

Extract the following:

PARAGRAPH 5 - LOAN AND CLOSING COSTS:
- Look for any filled-in blank amounts (dollar amounts)
- Any custom text in the blank lines

PARAGRAPH 6 - APPRAISAL:
- Look for checkboxes A or B
- A: Property appraises for purchase price or Buyer pays difference
- B: Property must appraise for purchase price

PARAGRAPH 7 - EARNEST MONEY:
- Is there earnest money? (A. Yes or B. No)
- If Yes, what is the amount?
- Who holds it? (typically says "held by ___")

PARAGRAPH 8 - NON-REFUNDABLE DEPOSIT:
- Is earnest money non-refundable? (A. Yes or B. No)
- If Yes, what amount becomes non-refundable?
- When does it become non-refundable? (date or condition)

Return a JSON object:
{
  "para5_loan_costs": {
    "amounts": ["any dollar amounts found"],
    "custom_text": "any custom text in blanks"
  },
  "para6_appraisal": {
    "option_checked": "A" or "B" or null,
    "description": "what the option means"
  },
  "para7_earnest_money": {
    "has_earnest_money": "YES" or "NO",
    "amount": number or null,
    "held_by": "who holds it" or null
  },
  "para8_non_refundable": {
    "is_non_refundable": "YES" or "NO",
    "amount": number or null,
    "when": "date or condition" or null
  }
}

Look for [X], X, or filled checkboxes to determine selections.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 700,
      temperature: 0.1
    });

    const visionResult = response.choices[0].message.content;
    console.log('Raw Response:');
    console.log(visionResult);
    console.log('\n');

    // Parse response
    const cleanJson = visionResult?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '{}';
    const extracted = JSON.parse(cleanJson);
    
    console.log('=== EXTRACTED PAGE 4 DATA ===\n');
    
    console.log('PARAGRAPH 5 - Loan and Closing Costs:');
    if (extracted.para5_loan_costs?.amounts?.length > 0) {
      console.log('  Amounts:', extracted.para5_loan_costs.amounts.join(', '));
    }
    if (extracted.para5_loan_costs?.custom_text) {
      console.log('  Custom text:', extracted.para5_loan_costs.custom_text);
    }
    if (!extracted.para5_loan_costs?.amounts?.length && !extracted.para5_loan_costs?.custom_text) {
      console.log('  No specific amounts or text found');
    }
    console.log('');
    
    console.log('PARAGRAPH 6 - Appraisal:');
    console.log('  Option:', extracted.para6_appraisal?.option_checked || 'NOT FOUND');
    if (extracted.para6_appraisal?.description) {
      console.log('  Meaning:', extracted.para6_appraisal.description);
    }
    console.log('');
    
    console.log('PARAGRAPH 7 - Earnest Money:');
    console.log('  Has earnest money:', extracted.para7_earnest_money?.has_earnest_money || 'NOT FOUND');
    if (extracted.para7_earnest_money?.amount) {
      console.log('  Amount: $' + extracted.para7_earnest_money.amount.toLocaleString());
    }
    if (extracted.para7_earnest_money?.held_by) {
      console.log('  Held by:', extracted.para7_earnest_money.held_by);
    }
    console.log('');
    
    console.log('PARAGRAPH 8 - Non-refundable:');
    console.log('  Is non-refundable:', extracted.para8_non_refundable?.is_non_refundable || 'NOT FOUND');
    if (extracted.para8_non_refundable?.amount) {
      console.log('  Amount: $' + extracted.para8_non_refundable.amount.toLocaleString());
    }
    if (extracted.para8_non_refundable?.when) {
      console.log('  When:', extracted.para8_non_refundable.when);
    }
    
    // Save results
    await fs.writeFile('./pages/page4_results.json', JSON.stringify(extracted, null, 2));
    console.log('\n✓ Results saved to ./pages/page4_results.json');
    
    return extracted;
    
  } catch (error) {
    console.error('Error:', error);
  }
}

extractPage4().catch(console.error);