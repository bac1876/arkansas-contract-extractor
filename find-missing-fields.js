require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function findMissingFields() {
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  console.log('🔍 Finding acceptance_date and para37_option fields...\n');
  
  const pdfPath = path.resolve('Offer (EXE)-3461 Alliance Dr.pdf');
  const magickPath = 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe';
  
  // Check last few pages for these fields
  const pagesToCheck = [14, 15, 16]; // Last 3 pages
  
  for (const pageNum of pagesToCheck) {
    console.log(`\nChecking Page ${pageNum + 1}...`);
    console.log('='.repeat(60));
    
    const outputPath = path.resolve(`find_page_${pageNum}.png`);
    
    // Convert the specific page
    const args = [
      'convert',
      '-density', '150',
      pdfPath + `[${pageNum}]`,
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
          console.log(`✅ Converted page ${pageNum + 1} to PNG`);
          resolve();
        } else {
          reject(new Error(`ImageMagick failed with code ${code}`));
        }
      });
    });
    
    const imageBuffer = fs.readFileSync(outputPath);
    
    // Search for acceptance date and para 37
    const searchPrompt = `Look for these specific items on this page:

1. ACCEPTANCE DATE - Look for text like "accepted this" or "acceptance date" followed by a date
2. PARAGRAPH 37 - Look for "PARA 37" or "PARAGRAPH 37" with options A, B, or C
3. Any signatures with dates next to them
4. Serial number at the bottom of the page

Return what you find for each item.`;
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: searchPrompt },
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
  console.log('FINDINGS:');
  console.log('1. acceptance_date - Look for "accepted this" date on signature pages');
  console.log('2. para37_option - May not exist in this contract version');
}

findMissingFields().catch(console.error);