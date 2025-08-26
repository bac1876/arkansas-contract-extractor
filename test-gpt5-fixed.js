require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

async function testGPT5WithProperTokens() {
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  console.log('🔍 Testing GPT-5 with PROPER token allocation...\n');
  console.log('📚 Based on documentation: GPT-5 needs high max_completion_tokens');
  console.log('   to cover BOTH reasoning phase AND final output\n');
  
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
    { 
      name: 'gpt-5-mini', 
      maxTokens: 4096,  // HIGH budget as per documentation!
      reasoning: 'medium'
    },
    { 
      name: 'gpt-5', 
      maxTokens: 4096,
      reasoning: 'medium'
    },
    { 
      name: 'gpt-4o', 
      maxTokens: 600,  // GPT-4o doesn't need as much
      reasoning: null  // Not applicable
    }
  ];

  for (const model of models) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing ${model.name}...`);
    console.log(`Token Budget: ${model.maxTokens} tokens`);
    
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
        }],
        response_format: { type: 'json_object' }  // Enforce JSON
      };
      
      // Use correct parameter name for each model
      if (model.name.startsWith('gpt-5')) {
        params.max_completion_tokens = model.maxTokens;
        // Add reasoning effort if specified
        if (model.reasoning) {
          params.reasoning_effort = model.reasoning;
        }
      } else {
        params.max_tokens = model.maxTokens;
        params.temperature = 0.1;
      }
      
      console.log('📤 Sending extraction request...');
      const start = Date.now();
      const response = await openai.chat.completions.create(params);
      const elapsed = Date.now() - start;
      
      console.log(`⏱️ Response time: ${elapsed}ms`);
      console.log(`📊 Tokens used: ${response.usage?.total_tokens}`);
      
      // Check for reasoning tokens (GPT-5 specific)
      if (response.usage?.reasoning_tokens) {
        console.log(`💭 Reasoning tokens: ${response.usage.reasoning_tokens}`);
      }
      
      const content = response.choices[0].message.content || '';
      
      if (!content) {
        console.log('❌ Empty response received');
        console.log('   This means max_completion_tokens is still too low!');
        continue;
      }
      
      console.log('✅ Response received! Length:', content.length);
      
      // Try to parse JSON
      try {
        const parsed = JSON.parse(content);
        console.log('✅ Successfully parsed JSON:');
        console.log('   - Buyers:', parsed.buyers);
        console.log('   - Property:', parsed.property_address);
        console.log('   - Type:', parsed.purchase_type);
        console.log('   - Amount:', parsed.purchase_price || parsed.cash_amount);
      } catch (e) {
        console.log('⚠️ Could not parse as JSON');
        console.log('Raw content:', content.substring(0, 200));
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📝 SUMMARY:');
  console.log('GPT-5 requires HIGH max_completion_tokens (4096+) to work!');
  console.log('This covers both reasoning phase AND final output.');
  console.log('With proper token allocation, GPT-5 should extract data successfully.');
}

testGPT5WithProperTokens().catch(console.error);