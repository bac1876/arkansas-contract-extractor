require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function testPage4() {
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  console.log('🔍 Testing Page 4 extraction with different prompts...\n');
  
  const pdfPath = path.resolve('Offer (EXE)-3461 Alliance Dr.pdf');
  const magickPath = 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe';
  
  // Convert page 4 (index 3)
  const outputPath = path.resolve('test_page_4.png');
  const args = [
    'convert',
    '-density', '150',
    pdfPath + '[3]',
    '-alpha', 'remove',
    '-background', 'white',
    '-resize', '1224x1584',
    '-depth', '8',
    outputPath
  ];
  
  await new Promise((resolve, reject) => {
    const proc = spawn(magickPath, args);
    proc.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Converted page 4 to PNG\n');
        resolve();
      } else {
        reject(new Error(`ImageMagick failed with code ${code}`));
      }
    });
  });
  
  const imageBuffer = fs.readFileSync(outputPath);
  const base64Image = imageBuffer.toString('base64');
  
  // Try different prompts
  const prompts = [
    {
      name: 'Original Complex Prompt',
      text: `Extract ALL information from paragraphs 5-8:

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
}`
    },
    {
      name: 'Focused on Earnest Money Only',
      text: `Focus ONLY on PARAGRAPH 7 - EARNEST MONEY section:

1. Is Option A (Yes) or Option B (No) checked?
2. If Yes is checked, look for the text "in the amount of $" and extract the number after it
3. Look for text "to be held by" and extract what comes after it (broker or title company name)

Return as JSON:
{
  "earnest_money_checked": "A" or "B",
  "earnest_money_amount": the number after $ sign,
  "earnest_money_holder": the text after "to be held by"
}`
    },
    {
      name: 'Read All Text First',
      text: `Read all the text you can see on this page. Focus on any filled blanks, handwritten text, or numbers written in spaces. Tell me everything you can read, especially:
- Any dollar amounts (look for $ signs)
- Any company names or broker names
- Any dates or timeframes
- Which checkboxes are marked with X`
    }
  ];
  
  for (const prompt of prompts) {
    console.log(`\nTesting: ${prompt.name}`);
    console.log('='.repeat(60));
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt.text },
            { 
              type: 'image_url', 
              image_url: { 
                url: `data:image/png;base64,${base64Image}`,
                detail: 'high'
              }
            }
          ]
        }],
        max_tokens: 600,
        temperature: 0.1
      });
      
      const content = response.choices[0].message.content || '';
      console.log('Response:');
      console.log(content);
      
      // Try to parse if JSON
      if (content.includes('{')) {
        try {
          const cleaned = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          console.log('\n✅ Parsed successfully:');
          console.log('  - earnest_money_amount:', parsed.earnest_money_amount || 'NOT FOUND');
          console.log('  - earnest_money_held_by:', parsed.earnest_money_held_by || parsed.earnest_money_holder || 'NOT FOUND');
        } catch (e) {
          console.log('\n⚠️ Could not parse JSON');
        }
      }
      
    } catch (err) {
      console.log('Error:', err.message);
    }
  }
  
  // Clean up
  fs.unlinkSync(outputPath);
  
  console.log('\n' + '='.repeat(60));
  console.log('CONCLUSION:');
  console.log('Need to update extraction logic to handle cases where:');
  console.log('1. Earnest money amount might be blank or $0');
  console.log('2. Holder name might be blank');
  console.log('3. Non-refundable might be unchecked (Option B)');
}

testPage4().catch(console.error);