/**
 * Test cash contract extraction from page1-1.png
 */

import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';

dotenv.config();

async function testCashContract() {
  console.log('Testing CASH Contract Extraction');
  console.log('=================================\n');

  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  try {
    // Read the PNG directly
    const imageBuffer = await fs.readFile('./page1-1.png');
    const base64Image = imageBuffer.toString('base64');

    console.log('Sending page1-1.png to GPT-4 Vision API...\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this Arkansas real estate contract page and extract information.

IMPORTANT: Check paragraph 3 carefully:
- 3A is for FINANCED purchases (has loan type checkboxes)
- 3B is for LOAN ASSUMPTION
- 3C is for CASH purchases (no loan, just cash amount)

Extract the following:

1. Which paragraph is checked (3A, 3B, or 3C)?
2. If 3C is checked: What is the cash amount?
3. If 3A is checked: What is the purchase price and loan type?
4. Property type (Paragraph 2)
5. Property address and buyer names

Return a JSON object:
{
  "purchase_type": "FINANCED" or "CASH" or "LOAN_ASSUMPTION",
  "paragraph_checked": "3A" or "3B" or "3C",
  "purchase_price": number (from 3A if financed),
  "cash_amount": number (from 3C if cash),
  "loan_type": "FHA/VA/CONVENTIONAL/USDA-RD" or "CASH" or null,
  "property_type": "property type selected",
  "property_address": "address",
  "buyers": ["name1", "name2"]
}`
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
      max_tokens: 500,
      temperature: 0.1
    });

    const visionResult = response.choices[0].message.content;
    console.log('Raw Response:');
    console.log(visionResult);
    console.log('\n');

    // Parse response
    const cleanJson = visionResult?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '{}';
    const extracted = JSON.parse(cleanJson);
    
    console.log('=== EXTRACTED DATA ===\n');
    console.log('Purchase Type:', extracted.purchase_type);
    console.log('Paragraph Checked:', extracted.paragraph_checked);
    console.log('');
    
    if (extracted.purchase_type === 'CASH') {
      console.log('💵 CASH PURCHASE DETECTED!');
      console.log('Cash Amount:', extracted.cash_amount ? `$${extracted.cash_amount.toLocaleString()}` : 'NOT FOUND');
      console.log('Purchase Price from 3A:', extracted.purchase_price || 'N/A (using cash)');
      console.log('Loan Type:', extracted.loan_type || 'N/A (cash purchase)');
    } else {
      console.log('🏦 FINANCED PURCHASE');
      console.log('Purchase Price:', extracted.purchase_price ? `$${extracted.purchase_price.toLocaleString()}` : 'NOT FOUND');
      console.log('Loan Type:', extracted.loan_type || 'NOT FOUND');
    }
    
    console.log('\nProperty Type:', extracted.property_type || 'NOT FOUND');
    console.log('Property Address:', extracted.property_address || 'NOT FOUND');
    console.log('Buyers:', extracted.buyers?.join(', ') || 'NOT FOUND');
    
    // Save results
    await fs.writeFile('./page1-1_vision_results.json', JSON.stringify(extracted, null, 2));
    console.log('\n✓ Results saved to page1-1_vision_results.json');
    
    // Compare with financed contract if available
    try {
      const financedResults = await fs.readFile('./page1_vision_results.json', 'utf-8');
      const financed = JSON.parse(financedResults);
      
      console.log('\n' + '='.repeat(50));
      console.log('COMPARISON WITH FINANCED CONTRACT');
      console.log('='.repeat(50) + '\n');
      
      console.log('Financed Contract (page1.pdf):');
      console.log(`  Type: ${financed.purchase_type}`);
      console.log(`  Loan: ${financed.loan_type}`);
      console.log(`  Amount: $${(financed.purchase_price || 0).toLocaleString()}\n`);
      
      console.log('Cash Contract (page1-1.png):');
      console.log(`  Type: ${extracted.purchase_type}`);
      console.log(`  Loan: ${extracted.loan_type || 'N/A'}`);
      console.log(`  Amount: $${(extracted.cash_amount || 0).toLocaleString()}\n`);
      
      if (financed.purchase_type === 'FINANCED' && extracted.purchase_type === 'CASH') {
        console.log('✅ Successfully differentiated between FINANCED and CASH contracts!');
      }
    } catch {
      console.log('\n(Run test on page1.pdf first to compare results)');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testCashContract().catch(console.error);