require('dotenv').config();
const { ImageMagickExtractor } = require('./dist/extraction-imagemagick.js');
const path = require('path');

// Simple GPT-5 test using chat completions endpoint with GPT-5 model names
async function testGPT5Simple() {
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  console.log('🔬 Testing GPT-5 models availability...\n');
  
  // First, test if GPT-5 models are available
  const testPrompt = 'Say "Hello from GPT-5" in exactly 4 words.';
  
  const models = [
    { name: 'gpt-5', maxTokenParam: 'max_completion_tokens' },
    { name: 'gpt-5-mini', maxTokenParam: 'max_completion_tokens' },
    { name: 'o1-preview', maxTokenParam: 'max_completion_tokens' },
    { name: 'o1-mini', maxTokenParam: 'max_completion_tokens' },
    { name: 'gpt-4o', maxTokenParam: 'max_tokens' }  // Control
  ];
  
  for (const model of models) {
    try {
      console.log(`Testing ${model.name}...`);
      
      const params = {
        model: model.name,
        messages: [{ role: 'user', content: testPrompt }]
      };
      
      // Use appropriate token parameter
      params[model.maxTokenParam] = 100;
      
      const response = await openai.chat.completions.create(params);
      console.log(`✅ ${model.name} works: "${response.choices[0].message.content}"`);
      console.log(`   Tokens used: ${response.usage?.total_tokens}\n`);
      
    } catch (error) {
      console.log(`❌ ${model.name}: ${error.message}\n`);
    }
  }
}

async function compareExtraction() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPARING GPT-4o vs GPT-5 EXTRACTION');
  console.log('='.repeat(60) + '\n');
  
  const pdfPath = path.resolve('Offer (EXE)-3461 Alliance Dr.pdf');
  
  // Test GPT-4o extraction
  console.log('🤖 Testing GPT-4o extraction...');
  const gpt4Extractor = new ImageMagickExtractor();
  const startGPT4 = Date.now();
  const gpt4Result = await gpt4Extractor.extractFromPDF(pdfPath);
  const gpt4Time = Date.now() - startGPT4;
  
  if (gpt4Result.success) {
    console.log(`✅ GPT-4o: ${gpt4Result.fieldsExtracted}/${gpt4Result.totalFields} fields (${gpt4Result.extractionRate})`);
    console.log(`⏱️  Time: ${gpt4Time}ms\n`);
  } else {
    console.log(`❌ GPT-4o failed: ${gpt4Result.error}\n`);
  }
  
  // For GPT-5, we'll test with the standard API but with GPT-5 model names
  // This is because the Responses API might not be publicly available yet
  console.log('🤖 Testing GPT-5 extraction (if available)...');
  
  try {
    // Try a simple GPT-5 extraction using existing infrastructure
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const fs = require('fs');
    
    // Just test on page 1 for now
    const testImagePath = 'para13_check.png'; // If exists from previous test
    
    // Create a simple test image if needed
    if (!fs.existsSync(testImagePath)) {
      console.log('Creating test image...');
      const { spawn } = require('child_process');
      const magickPath = 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe';
      
      await new Promise((resolve) => {
        const proc = spawn(magickPath, [
          'convert',
          '-density', '150',
          pdfPath + '[0]',
          '-alpha', 'remove',
          '-background', 'white',
          '-resize', '1224x1584',
          '-depth', '8',
          testImagePath
        ]);
        proc.on('close', resolve);
      });
    }
    
    if (fs.existsSync(testImagePath)) {
      const imageBuffer = fs.readFileSync(testImagePath);
      const base64Image = imageBuffer.toString('base64');
      
      console.log('Testing GPT-5 vision extraction...');
      const startGPT5 = Date.now();
      
      const response = await openai.chat.completions.create({
        model: 'gpt-5-mini', // Try GPT-5-mini
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract buyer names and property address from this contract. Return as JSON.'
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
        max_completion_tokens: 1000 // Use GPT-5 parameter
      });
      
      const gpt5Time = Date.now() - startGPT5;
      const content = response.choices[0].message.content || '';
      
      if (content) {
        console.log(`✅ GPT-5 responded in ${gpt5Time}ms`);
        console.log(`📝 Response: ${content.substring(0, 200)}...`);
        console.log(`💰 Tokens used: ${response.usage?.total_tokens}\n`);
      } else {
        console.log('⚠️ GPT-5 returned empty response\n');
      }
      
      // Clean up
      fs.unlinkSync(testImagePath);
    }
    
  } catch (error) {
    console.log(`⚠️ GPT-5 not available or error: ${error.message}\n`);
  }
  
  // Summary
  console.log('='.repeat(60));
  console.log('📈 COMPARISON SUMMARY');
  console.log('='.repeat(60));
  
  if (gpt4Result.success) {
    console.log('\nGPT-4o Results:');
    console.log(`  ✅ Extraction Rate: ${gpt4Result.extractionRate}`);
    console.log(`  ⏱️  Processing Time: ${gpt4Time}ms`);
    console.log(`  📊 Fields Extracted: ${gpt4Result.fieldsExtracted}/41`);
    
    // Show key fields
    const data = gpt4Result.data;
    console.log('\n  Key Fields:');
    console.log(`    - Buyers: ${data.buyers?.join(', ') || 'N/A'}`);
    console.log(`    - Property: ${data.property_address || 'N/A'}`);
    console.log(`    - Purchase Type: ${data.purchase_type || 'N/A'}`);
    console.log(`    - Amount: $${data.purchase_price || data.cash_amount || 'N/A'}`);
  }
  
  console.log('\nGPT-5 Status:');
  console.log('  ⚠️ GPT-5 models may not be publicly available yet');
  console.log('  📝 Documentation suggests using /v1/responses endpoint');
  console.log('  💡 When available, GPT-5 should provide:');
  console.log('     - Better reasoning transparency');
  console.log('     - More reliable structured output');
  console.log('     - Higher token costs due to reasoning phase');
}

// Run tests
async function main() {
  await testGPT5Simple();
  await compareExtraction();
}

main().catch(console.error);