require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function diagnoseMissingFields() {
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  console.log('🔍 Diagnosing missing fields from 3461 Alliance Dr...\n');
  
  const pdfPath = path.resolve('Offer (EXE)-3461 Alliance Dr.pdf');
  const magickPath = 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe';
  
  // Focus on pages with missing data
  const testsToRun = [
    {
      page: 3, // Page 4 in PDF (0-indexed)
      name: 'Page 4 - Earnest Money Details',
      prompt: `Look at PARAGRAPH 7 - EARNEST MONEY section carefully.
What is the exact dollar amount after "in the amount of $"?
Who is holding it (look for "to be held by" text)?

Also look at PARAGRAPH 8 - NON-REFUNDABLE section.
If Option A is checked, what amount and when does it become non-refundable?

Return exact text you see, don't interpret.`
    },
    {
      page: 5, // Page 6 in PDF
      name: 'Page 6 - Para 13 Excluded Items',
      prompt: `Look at PARAGRAPH 13 - FIXTURES section.
There are TWO blanks to fill:
1. After "following attached equipment" - what's written in the FIRST blank?
2. After "following items are not owned by Seller or do not convey" - what's written in the SECOND blank?

Return the exact text you see in each blank, or "blank/empty" if nothing written.`
    },
    {
      page: 6, // Page 7 in PDF
      name: 'Page 7 - Contingency Details',
      prompt: `Look at PARAGRAPH 14 - CONTINGENCY section.
If Option B is checked (YES), what is written in the blank space for contingency details?
Return the exact text or "no contingency" if Option A is checked.`
    },
    {
      page: 7, // Page 8 in PDF
      name: 'Page 8 - Warranty Paid By',
      prompt: `Look at PARAGRAPH 15 - HOME WARRANTY section.
If a warranty is provided, who pays for it? Look for text about who pays.
Return exact text about payment or "no warranty" if Option A is checked.`
    }
  ];
  
  for (const test of testsToRun) {
    console.log(`\nTesting ${test.name}...`);
    console.log('='.repeat(60));
    
    const outputPath = path.resolve(`diagnose_page_${test.page}.png`);
    
    // Convert the specific page
    const args = [
      'convert',
      '-density', '150',
      pdfPath + `[${test.page}]`,
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
          console.log(`✅ Converted page ${test.page + 1} to PNG`);
          resolve();
        } else {
          reject(new Error(`ImageMagick failed with code ${code}`));
        }
      });
      proc.on('error', reject);
    });
    
    // Test with GPT-4o
    const imageBuffer = fs.readFileSync(outputPath);
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: test.prompt },
            { 
              type: 'image_url', 
              image_url: { 
                url: `data:image/png;base64,${imageBuffer.toString('base64')}`,
                detail: 'high'
              }
            }
          ]
        }],
        max_tokens: 400,
        temperature: 0.1
      });
      
      const content = response.choices[0].message.content || '';
      console.log('GPT-4o Response:');
      console.log(content);
      
    } catch (err) {
      console.log('Error:', err.message);
    }
    
    // Clean up
    fs.unlinkSync(outputPath);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('DIAGNOSIS COMPLETE');
  console.log('Missing fields that need extraction logic updates:');
  console.log('1. earnest_money_amount - Need to extract dollar amount from Para 7');
  console.log('2. earnest_money_held_by - Need to extract holder name from Para 7');
  console.log('3. cash_amount - Only for cash purchases (this is financed, so null is correct)');
  console.log('4. non_refundable_amount - From Para 8 if Option A checked');
  console.log('5. non_refundable_when - From Para 8 if Option A checked');
  console.log('6. para13_items_excluded - Second blank in Para 13');
  console.log('7. contingency_details - From Para 14 if Option B checked');
  console.log('8. warranty_paid_by - From Para 15 if warranty provided');
  console.log('9. acceptance_date - Need to find where this is on contract');
  console.log('10. para37_option - Need to find Para 37 location');
}

diagnoseMissingFields().catch(console.error);