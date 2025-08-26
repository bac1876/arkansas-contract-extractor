require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function detailedPara13Check() {
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  console.log('🔍 Detailed Para 13 Analysis...\n');
  
  const pdfPath = path.resolve('Offer (EXE)-3461 Alliance Dr.pdf');
  const magickPath = 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe';
  const outputPath = path.resolve('para13_detailed.png');
  
  // Convert page 6 (index 5) 
  const args = [
    'convert',
    '-density', '150',
    pdfPath + '[5]',
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
        console.log('✅ Page 6 converted\n');
        resolve();
      } else {
        reject(new Error('Conversion failed'));
      }
    });
  });
  
  const imageBuffer = fs.readFileSync(outputPath);
  
  // Try different prompts to understand what GPT-4o is seeing
  const prompts = [
    {
      name: 'Simple Read',
      text: `Please read paragraph 13 on this page. Tell me if you see any handwritten or typed text in any blanks.`
    },
    {
      name: 'Look for Kitchen/Refrigerator',
      text: `Look at paragraph 13. Do you see the words "kitchen" or "refrigerator" written anywhere? If yes, where exactly?`
    },
    {
      name: 'Blank Detection',
      text: `In paragraph 13, after the long list of standard fixtures, is there a blank line? Is anything written on that blank line? Please describe exactly what you see.`
    },
    {
      name: 'Full Text',
      text: `Can you read the full text of paragraph 13, including any handwritten additions?`
    }
  ];
  
  for (const prompt of prompts) {
    console.log(`\nTest: ${prompt.name}`);
    console.log('='.repeat(60));
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt.text },
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
    
    console.log(response.choices[0].message.content);
  }
  
  // Clean up
  fs.unlinkSync(outputPath);
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY:');
  console.log('Current extraction: "kitchen refrigerator"');
  console.log('You said this is incorrect.');
  console.log('What should Para 13 items_included actually be?');
}

detailedPara13Check().catch(console.error);