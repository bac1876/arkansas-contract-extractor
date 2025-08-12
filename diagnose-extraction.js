require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function diagnoseExtraction() {
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  console.log('🔍 Diagnosing extraction issues for 3461 Alliance Dr...\n');
  
  // Convert a few key pages to test
  const pdfPath = path.resolve('Offer (EXE)-3461 Alliance Dr.pdf');
  const magickPath = 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe';
  
  const pagesToTest = [
    { page: 3, name: 'Page 4 - Financial Terms', extract: 'earnest money, non-refundable deposit' },
    { page: 5, name: 'Page 6 - Survey & Para 13', extract: 'survey option, para 13 items' },
    { page: 6, name: 'Page 7 - Contingencies', extract: 'contingency details' },
    { page: 7, name: 'Page 8 - Warranty & Inspection', extract: 'home warranty, inspection option' }
  ];
  
  for (const test of pagesToTest) {
    console.log(`\nTesting ${test.name}...`);
    console.log('='.repeat(50));
    
    const outputPath = path.resolve(`test_page_${test.page}.png`);
    
    // Convert the specific page
    const args = [
      'convert',
      '-density', '150',
      pdfPath + `[${test.page}]`,  // Specific page
      '-alpha', 'remove',
      '-background', 'white',
      '-resize', '1224x1584',
      '-depth', '8',
      outputPath
    ];
    
    await new Promise((resolve) => {
      const proc = spawn(magickPath, args);
      proc.on('close', () => {
        console.log(`✅ Converted page ${test.page + 1} to PNG`);
        resolve();
      });
    });
    
    // Test with GPT-4o
    const imageBuffer = fs.readFileSync(outputPath);
    const base64Image = imageBuffer.toString('base64');
    
    // Try a simple extraction
    const simplePrompt = `Can you see text on this image? If yes, tell me what section or paragraph number you can see, and any checkboxes or filled fields.`;
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: simplePrompt },
            { 
              type: 'image_url', 
              image_url: { 
                url: `data:image/png;base64,${base64Image}`,
                detail: 'high'
              }
            }
          ]
        }],
        max_tokens: 300,
        temperature: 0.1
      });
      
      const content = response.choices[0].message.content || '';
      console.log('GPT-4o Response:', content.substring(0, 400));
      
      if (content.includes("can't") || content.includes("unable") || content.includes("sorry")) {
        console.log('❌ GPT-4o cannot read this page!');
      } else {
        console.log('✅ GPT-4o can read this page');
      }
      
    } catch (err) {
      console.log('Error:', err.message);
    }
    
    // Clean up
    fs.unlinkSync(outputPath);
  }
}

diagnoseExtraction().catch(console.error);