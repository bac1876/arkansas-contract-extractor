require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function testSpecificPages() {
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  console.log('🔍 Testing specific page extractions...\n');
  
  // First, convert the pages
  const pdfPath = path.resolve('Offer (EXE)-3461 Alliance Dr.pdf');
  const magickPath = 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe';
  
  // Convert pages 3-7 (0-indexed, so 3-7 in the contract)
  for (let i = 3; i <= 7; i++) {
    const args = [
      'convert',
      '-density', '150',
      pdfPath + `[${i}]`,
      '-alpha', 'remove',
      '-background', 'white',
      '-resize', '1224x1584',
      '-depth', '8',
      `page_${i}.png`
    ];
    
    await new Promise((resolve) => {
      const proc = spawn(magickPath, args);
      proc.on('close', () => resolve());
    });
  }
  
  console.log('✅ Converted pages 4-8 to PNG\n');
  
  // Test Page 4 (Financial Terms)
  console.log('Testing Page 4 - Financial Terms...');
  const page4img = fs.readFileSync('page_3.png');
  const page4prompt = `Extract ALL information from paragraphs 5-8:

PARAGRAPH 5 - LOAN AND CLOSING COSTS:
- Any dollar amounts in blanks
- Any custom text about seller paying costs
- Complete text from all filled blanks

PARAGRAPH 6 - APPRAISAL:
- Which option is checked (A or B)?
- A: Property must appraise OR Buyer pays difference
- B: Property MUST appraise for purchase price

PARAGRAPH 7 - EARNEST MONEY:
- Is there earnest money? (A. Yes or B. No)
- If Yes, what is the AMOUNT? (look for $ amount)
- WHO holds it? (look for "held by" or broker/title company name)

PARAGRAPH 8 - NON-REFUNDABLE DEPOSIT:
- Is deposit non-refundable? (A. Yes or B. No)
- If Yes, what AMOUNT becomes non-refundable?
- WHEN does it become non-refundable? (date or days)

Return JSON:
{
  "para5_amounts": ["all amounts found"],
  "para5_custom_text": "complete custom text",
  "seller_concessions": "seller pays text if any",
  "appraisal_option": "A" or "B",
  "appraisal_details": "what the option means",
  "earnest_money": "YES" or "NO",
  "earnest_money_amount": number or null,
  "earnest_money_held_by": "holder name" or null,
  "non_refundable": "YES" or "NO",
  "non_refundable_amount": number or null,
  "non_refundable_when": "when it becomes non-refundable" or null
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: page4prompt },
          { 
            type: 'image_url', 
            image_url: { 
              url: `data:image/png;base64,${page4img.toString('base64')}`,
              detail: 'high'
            }
          }
        ]
      }],
      max_tokens: 500,
      temperature: 0.1
    });
    
    const content = response.choices[0].message.content || '';
    console.log('Page 4 Response:', content);
    
    // Try to parse
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      console.log('✅ Parsed successfully:', Object.keys(parsed).length, 'fields');
    } catch (e) {
      console.log('❌ Failed to parse JSON');
    }
  } catch (err) {
    console.log('Error:', err.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test Page 6 (Survey & Para 13)
  console.log('Testing Page 6 - Survey & Para 13...');
  const page6img = fs.readFileSync('page_5.png');
  const page6prompt = `Extract information from this page:

PARAGRAPH 11 - SURVEY:
- Who pays for survey or what is written?
- Look for checkboxes: A (Buyer), B (Seller), C (Split)
- Or text like "Buyer declines survey"

PARAGRAPH 13 - FIXTURES AND ATTACHED EQUIPMENT:
IMPORTANT: There are TWO blanks to fill:
1. FIRST BLANK (after the list of standard fixtures): Look for handwritten text showing items that CONVEY/are INCLUDED
2. SECOND BLANK (after "Buyer is aware the following items are not owned by Seller"): Look for handwritten text showing items that DO NOT convey/are EXCLUDED

Return JSON:
{
  "survey_option": "A" or "B" or "C" or "text",
  "survey_details": "exact text if custom or decline",
  "para13_items_included": "items in first blank that convey" or null,
  "para13_items_excluded": "items in second blank that don't convey" or null
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: page6prompt },
          { 
            type: 'image_url', 
            image_url: { 
              url: `data:image/png;base64,${page6img.toString('base64')}`,
              detail: 'high'
            }
          }
        ]
      }],
      max_tokens: 300,
      temperature: 0.1
    });
    
    const content = response.choices[0].message.content || '';
    console.log('Page 6 Response:', content);
    
    // Try to parse
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      console.log('✅ Parsed successfully:', Object.keys(parsed).length, 'fields');
    } catch (e) {
      console.log('❌ Failed to parse JSON');
    }
  } catch (err) {
    console.log('Error:', err.message);
  }
  
  // Clean up
  for (let i = 3; i <= 7; i++) {
    fs.unlinkSync(`page_${i}.png`);
  }
}

testSpecificPages().catch(console.error);