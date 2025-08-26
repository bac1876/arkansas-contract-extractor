require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

async function extractWithGPT5Mini() {
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  console.log('🔍 Simple GPT-5-mini Test on Contract Page 1\n');
  
  // Read test image
  const imagePath = path.join(__dirname, 'contract2_pages', 'page1.png');
  
  if (!fs.existsSync(imagePath)) {
    console.log('❌ Test image not found at:', imagePath);
    return;
  }
  
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  
  const prompt = `Extract ALL information from this Arkansas contract page 1:

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

  console.log('Testing GPT-5-mini with proper token allocation...');
  console.log('Token Budget: 4096 (covers reasoning + output)\n');
  
  try {
    const start = Date.now();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { 
            type: 'image_url', 
            image_url: { 
              url: `data:image/png;base64,${base64Image}`,
              detail: 'high'
            }
          }
        ]
      }],
      max_completion_tokens: 4096,  // CRITICAL for GPT-5!
      response_format: { type: 'json_object' }
      // Note: GPT-5 doesn't support custom temperature, uses default (1)
    });
    
    const elapsed = Date.now() - start;
    const content = response.choices[0]?.message?.content || '';
    
    console.log(`⏱️ Response time: ${elapsed}ms`);
    console.log(`📊 Tokens used: ${response.usage?.total_tokens}`);
    
    if (!content) {
      console.log('❌ Empty response - need higher max_completion_tokens!');
      return;
    }
    
    console.log('✅ Response received! Length:', content.length);
    
    try {
      const parsed = JSON.parse(content);
      console.log('\n✅ Successfully parsed JSON:');
      console.log('   - Buyers:', parsed.buyers);
      console.log('   - Property:', parsed.property_address);
      console.log('   - Type:', parsed.purchase_type);
      console.log('   - Amount:', parsed.purchase_price || parsed.cash_amount);
      
      // Cost calculation
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      
      const gpt5Cost = (inputTokens / 1000000) * 0.25 + (outputTokens / 1000000) * 2;
      const gpt4Cost = (inputTokens / 1000000) * 2.50 + (outputTokens / 1000000) * 10;
      
      console.log('\n💰 Cost Analysis (for this page):');
      console.log(`   GPT-5-mini: $${gpt5Cost.toFixed(6)}`);
      console.log(`   GPT-4o would be: $${gpt4Cost.toFixed(6)}`);
      console.log(`   Savings: $${(gpt4Cost - gpt5Cost).toFixed(6)} (${Math.round((1 - gpt5Cost/gpt4Cost) * 100)}% cheaper)`);
      
      console.log('\n📈 Projected Full Contract Cost (16 pages):');
      console.log(`   GPT-5-mini: ~$${(gpt5Cost * 16).toFixed(4)}`);
      console.log(`   GPT-4o: ~$${(gpt4Cost * 16).toFixed(4)}`);
      console.log(`   Total savings per contract: ~$${((gpt4Cost - gpt5Cost) * 16).toFixed(4)}`);
      
    } catch (e) {
      console.log('⚠️ Could not parse as JSON');
      console.log('Raw content:', content.substring(0, 200));
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

extractWithGPT5Mini().catch(console.error);