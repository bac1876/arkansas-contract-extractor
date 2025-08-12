require('dotenv').config();
const OpenAI = require('openai');

async function testModels() {
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  console.log('🔍 Testing OpenAI Models...\n');
  
  // Models to test
  const modelsToTest = [
    { name: 'gpt-5', useMaxCompletion: true },
    { name: 'gpt-5-mini', useMaxCompletion: true },
    { name: 'gpt-5-nano', useMaxCompletion: true },
    { name: 'gpt-4o', useMaxCompletion: false },
    { name: 'gpt-4o-2024-08-06', useMaxCompletion: false },
    { name: 'gpt-4-turbo', useMaxCompletion: false }
  ];

  for (const model of modelsToTest) {
    try {
      console.log(`Testing ${model.name}...`);
      const params = {
        model: model.name,
        messages: [{ 
          role: 'user', 
          content: 'Say "Model works!" in 3 words only.' 
        }]
      };
      
      // Use correct parameters for GPT-5 models
      if (model.useMaxCompletion) {
        params.max_completion_tokens = 100;  // More tokens for GPT-5
        // GPT-5 doesn't support temperature=0, use default
      } else {
        params.max_tokens = 10;
        params.temperature = 0;
      }
      
      const response = await openai.chat.completions.create(params);
      
      console.log(`✅ ${model.name}: ${response.choices[0].message.content}`);
      console.log(`   Usage: ${response.usage?.total_tokens} tokens\n`);
    } catch (error) {
      console.log(`❌ ${model.name}: ${error.message}\n`);
    }
  }

  // Test vision capability with multiple models
  console.log('\n🖼️ Testing Vision Capability...');
  
  const visionModels = [
    { name: 'gpt-5', useMaxCompletion: true },
    { name: 'gpt-4o', useMaxCompletion: false }
  ];
  
  // Create a simple test image (1x1 white pixel)
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  
  for (const model of visionModels) {
    try {
      console.log(`Testing ${model.name} vision...`);
      
      const params = {
        model: model.name,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'What color is this image?' },
            { type: 'image_url', image_url: { 
              url: `data:image/png;base64,${testImageBase64}`,
              detail: 'low'
            }}
          ]
        }]
      };
      
      if (model.useMaxCompletion) {
        params.max_completion_tokens = 50;
      } else {
        params.max_tokens = 50;
      }
      
      const response = await openai.chat.completions.create(params);
      console.log(`✅ ${model.name} vision works: ${response.choices[0].message.content}\n`);
    } catch (error) {
      console.log(`❌ ${model.name} vision failed: ${error.message}\n`);
    }
  }
}

testModels().catch(console.error);