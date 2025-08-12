require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

async function testGPT5Extraction() {
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  console.log('🔍 Testing GPT-5 for Contract Extraction...\n');
  
  // Read test image
  const imagePath = path.join(__dirname, 'contract2_pages', 'page1.png');
  
  if (!fs.existsSync(imagePath)) {
    console.log('❌ Test image not found at:', imagePath);
    return;
  }
  
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  
  const extractionPrompt = `Extract ALL information from this Arkansas contract page 1:

1. PARAGRAPH 1 - PARTIES:
   - All buyer names (full names)
   - Property address (complete)

2. PARAGRAPH 2 - PROPERTY TYPE:
   - Which checkbox is marked?

3. PARAGRAPH 3 - PURCHASE DETAILS:
   - Purchase type (FINANCED/CASH/LOAN_ASSUMPTION)
   - Purchase price or cash amount
   - Loan type if applicable

Return JSON with buyers, property_address, property_type, purchase_type, purchase_price, cash_amount, loan_type`;

  const models = [
    { name: 'gpt-5', useMaxCompletion: true },
    { name: 'gpt-4o', useMaxCompletion: false }
  ];

  for (const model of models) {
    console.log(`\nTesting ${model.name}...`);
    
    try {
      const params = {
        model: model.name,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: extractionPrompt },
            { 
              type: 'image_url', 
              image_url: { 
                url: `data:image/png;base64,${base64Image}`,
                detail: 'high'
              }
            }
          ]
        }]
      };
      
      if (model.useMaxCompletion) {
        params.max_completion_tokens = 600;
      } else {
        params.max_tokens = 600;
        params.temperature = 0.1;
      }
      
      console.log('📤 Sending extraction request...');
      const start = Date.now();
      const response = await openai.chat.completions.create(params);
      const elapsed = Date.now() - start;
      
      console.log(`⏱️ Response time: ${elapsed}ms`);
      console.log(`📊 Tokens used: ${response.usage?.total_tokens}`);
      
      const content = response.choices[0].message.content || '';
      if (!content) {
        console.log('❌ Empty response received');
        continue;
      }
      
      console.log('📝 Raw response (first 200 chars):', content.substring(0, 200));
      
      // Try to parse JSON
      try {
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanContent);
        console.log('✅ Successfully parsed JSON:');
        console.log(JSON.stringify(parsed, null, 2).substring(0, 500));
      } catch (e) {
        console.log('⚠️ Could not parse as JSON, raw content shown above');
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

testGPT5Extraction().catch(console.error);