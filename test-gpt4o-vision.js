require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function testVisionExtraction() {
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  console.log('🔍 Testing GPT-4o Vision on actual contract image...\n');
  
  // First, convert page 1 to PNG
  const pdfPath = path.resolve('test_contract2.pdf');
  const outputPath = path.resolve('test_page1.png');
  
  console.log('Converting PDF page 1 to PNG...');
  
  const magickPath = 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe';
  
  await new Promise((resolve, reject) => {
    const proc = spawn(magickPath, [
      '-density', '300',
      pdfPath + '[0]',  // Extract only first page
      outputPath
    ]);
    
    proc.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Conversion successful\n');
        resolve();
      } else {
        reject(new Error('Conversion failed'));
      }
    });
  });
  
  // Read the image
  const imageBuffer = fs.readFileSync(outputPath);
  const base64Image = imageBuffer.toString('base64');
  console.log('📏 Image size:', imageBuffer.length, 'bytes\n');
  
  // Test with simple prompt first
  console.log('Test 1: Simple extraction');
  console.log('------------------------');
  try {
    const response1 = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { 
            type: 'text', 
            text: 'What are the buyer names on this contract? Just list the names.' 
          },
          { 
            type: 'image_url', 
            image_url: { 
              url: `data:image/png;base64,${base64Image}`,
              detail: 'high'
            }
          }
        ]
      }],
      max_tokens: 100,
      temperature: 0.1
    });
    
    console.log('Response:', response1.choices[0].message.content);
  } catch (err) {
    console.log('Error:', err.message);
  }
  
  console.log('\nTest 2: Full extraction with specific instructions');
  console.log('--------------------------------------------------');
  try {
    const response2 = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { 
            type: 'text', 
            text: `Look at this Arkansas real estate contract image.
            
IMPORTANT: Extract the ACTUAL text from the image. Do NOT use placeholder or demo data.

Find and extract:
1. The buyer names from Paragraph 1
2. The property address from Paragraph 1
3. The purchase type from Paragraph 3 (is 3A, 3B, or 3C checked?)

Return ONLY what you see in the actual image.` 
          },
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
    
    console.log('Response:', response2.choices[0].message.content);
  } catch (err) {
    console.log('Error:', err.message);
  }
  
  console.log('\n✅ Image saved as test_page1.png for manual inspection');
}

testVisionExtraction().catch(console.error);