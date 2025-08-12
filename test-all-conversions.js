require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');

async function testAllConversions() {
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  console.log('🔍 Testing all conversion methods with GPT-4o...\n');
  
  const images = [
    { name: 'Working pre-converted', file: 'contract2_pages/page1.png' },
    { name: 'Convert style', file: 'test_convert_style.png' },
    { name: 'Ghostscript style', file: 'test_gs_style.png' },
    { name: 'pdf2pic style', file: 'test_pdf2pic_style.png' }
  ];
  
  const simplePrompt = 'Extract the buyer names from this contract. Return just the names.';
  
  for (const img of images) {
    if (!fs.existsSync(img.file)) {
      console.log(`❌ ${img.name}: File not found`);
      continue;
    }
    
    const imageBuffer = fs.readFileSync(img.file);
    const base64Image = imageBuffer.toString('base64');
    
    console.log(`Testing: ${img.name} (${imageBuffer.length} bytes)`);
    
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
        max_tokens: 100,
        temperature: 0.1
      });
      
      const content = response.choices[0].message.content || '';
      
      if (content.includes('Brian') || content.includes('Curtis')) {
        console.log(`✅ SUCCESS: ${content}`);
      } else if (content.includes('John') || content.includes('Doe')) {
        console.log(`⚠️ Demo data: ${content}`);
      } else {
        console.log(`❓ Response: ${content}`);
      }
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
    }
    
    console.log('');
  }
}

testAllConversions().catch(console.error);