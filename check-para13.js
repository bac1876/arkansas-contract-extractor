require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function checkPara13() {
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  console.log('🔍 Checking Para 13 on Page 6...\n');
  
  const pdfPath = path.resolve('Offer (EXE)-3461 Alliance Dr.pdf');
  const magickPath = 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe';
  const outputPath = path.resolve('para13_check.png');
  
  // Convert page 6 (index 5)
  const args = [
    'convert',
    '-density', '150',
    pdfPath + '[5]',  // Page 6
    '-alpha', 'remove',
    '-background', 'white',
    '-resize', '1224x1584',
    '-depth', '8',
    outputPath
  ];
  
  console.log('Converting page 6 to PNG...');
  await new Promise((resolve, reject) => {
    const proc = spawn(magickPath, args);
    proc.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Converted page 6\n');
        resolve();
      } else {
        reject(new Error('Conversion failed'));
      }
    });
    proc.on('error', reject);
  });
  
  // Read the image
  const imageBuffer = fs.readFileSync(outputPath);
  
  // Ask GPT-4o to read Para 13 carefully
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        { 
          type: 'text', 
          text: `Look at PARAGRAPH 13 - FIXTURES AND ATTACHED EQUIPMENT on this page.

I need you to read EXACTLY what is written in the two blanks:

1. FIRST BLANK: After the list of standard fixtures (after "garage door openers, storm windows, storm doors, window screens, shutters, awnings, wall-to-wall carpeting, mirrors fixed in place, ceiling fans, attic fans, mail boxes, television antennas/satellite dish and equipment, mounts/brackets for televisions/speakers, heating and air conditioning units, security and fire detection equipment, wiring, plumbing and lighting fixtures, chandeliers, water softener system, kitchen equipment, garage door openers, cleaning equipment, shrubbery, landscaping, outdoor cooking units, and all other property owned by Seller and attached to the above described real property.") 
   - What text is written in the blank after this list? (This shows what ADDITIONAL items convey)

2. SECOND BLANK: After "Buyer is aware the following items are not owned by Seller or do not convey with the Property:"
   - What text is written in this blank? (This shows what items DO NOT convey)

Please tell me EXACTLY what you see written in each blank, or if the blank is empty.`
        },
        { 
          type: 'image_url', 
          image_url: { 
            url: `data:image/png;base64,${imageBuffer.toString('base64')}`,
            detail: 'high'
          }
        }
      ]
    }],
    max_tokens: 500,
    temperature: 0.1
  });
  
  const content = response.choices[0].message.content || '';
  console.log('GPT-4o Response about Para 13:');
  console.log('='.repeat(60));
  console.log(content);
  console.log('='.repeat(60));
  
  // Also try our current extraction prompt
  console.log('\nTrying current extraction prompt...\n');
  const extractResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Extract information from this page:

PARAGRAPH 11 - SURVEY:
- Who pays for survey or what is written?
- Look for checkboxes: A (Buyer), B (Seller), C (Split)
- Or text like "Buyer declines survey"

PARAGRAPH 13 - FIXTURES AND ATTACHED EQUIPMENT:
IMPORTANT: There are TWO blanks to fill:
1. FIRST BLANK (after the list of standard fixtures like "garage door openers..."): Look for handwritten text showing items that CONVEY/are INCLUDED with the property
2. SECOND BLANK (after "Buyer is aware the following items are not owned by Seller or do not convey with the Property:"): Look for handwritten text showing items that DO NOT convey/are EXCLUDED

Look for any handwritten or typed text in these blanks (like "fridge" or "curtains").

Return JSON:
{
  "survey_option": "A" or "B" or "C" or "text",
  "survey_details": "exact text if custom or decline",
  "para13_items_included": "items in first blank that convey" or null,
  "para13_items_excluded": "items in second blank that don't convey" or null
}`
        },
        { 
          type: 'image_url', 
          image_url: { 
            url: `data:image/png;base64,${imageBuffer.toString('base64')}`,
            detail: 'high'
          }
        }
      ]
    }],
    max_tokens: 300,
    temperature: 0.1
  });
  
  const extractContent = extractResponse.choices[0].message.content || '';
  console.log('Current extraction result:');
  console.log(extractContent);
  
  // Try to parse
  try {
    const parsed = JSON.parse(extractContent.replace(/```json\n?/g, '').replace(/```/g, '').trim());
    console.log('\n✅ Parsed data:');
    console.log('  - para13_items_included:', parsed.para13_items_included || 'NULL/EMPTY');
    console.log('  - para13_items_excluded:', parsed.para13_items_excluded || 'NULL/EMPTY');
  } catch (e) {
    console.log('\n❌ Failed to parse JSON');
  }
  
  // Clean up
  fs.unlinkSync(outputPath);
}

checkPara13().catch(console.error);