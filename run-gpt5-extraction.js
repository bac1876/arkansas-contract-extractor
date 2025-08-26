require('dotenv').config();
const { ImageMagickExtractor } = require('./dist/extraction-imagemagick.js');
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

// Monkey-patch the ImageMagickExtractor to use GPT-5-mini
class GPT5MiniExtractor extends ImageMagickExtractor {
  constructor() {
    super();
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.modelName = 'gpt-5-mini';
    console.log('🚀 Initialized GPT-5-mini Extractor');
    console.log('💰 Using 67% cheaper model with proper token allocation');
  }
  
  // Override all page extraction methods to use GPT-5-mini
  async callGPT5Vision(imagePath, prompt) {
    const img = await fs.readFile(imagePath);
    const base64Image = img.toString('base64');
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
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
        // CRITICAL: High token budget for GPT-5!
        max_completion_tokens: 4096,
        response_format: { type: 'json_object' },
        temperature: 0.1
      });
      
      const content = response.choices[0]?.message?.content || '';
      
      if (!content) {
        console.log('⚠️ Empty response from GPT-5-mini');
        return {};
      }
      
      try {
        const cleanJson = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch {
        console.log('⚠️ Failed to parse JSON response');
        return {};
      }
    } catch (error) {
      console.error('❌ GPT-5-mini API error:', error.message);
      return {};
    }
  }
  
  async extractPage1(imagePath) {
    console.log('📄 Extracting Page 1 with GPT-5-mini...');
    const prompt = this.getPromptForPage(1);
    return await this.callGPT5Vision(imagePath, prompt);
  }
  
  async extractPage3(imagePath) {
    console.log('📄 Extracting Page 3 with GPT-5-mini...');
    const prompt = this.getPromptForPage(3);
    return await this.callGPT5Vision(imagePath, prompt);
  }
  
  async extractPage4(imagePath) {
    console.log('📄 Extracting Page 4 with GPT-5-mini...');
    const prompt = this.getPromptForPage(4);
    return await this.callGPT5Vision(imagePath, prompt);
  }
  
  async extractPage5(imagePath) {
    console.log('📄 Extracting Page 5 with GPT-5-mini...');
    const prompt = this.getPromptForPage(5);
    return await this.callGPT5Vision(imagePath, prompt);
  }
  
  async extractPage6(imagePath) {
    console.log('📄 Extracting Page 6 with GPT-5-mini...');
    const prompt = this.getPromptForPage(6);
    return await this.callGPT5Vision(imagePath, prompt);
  }
  
  async extractPage7(imagePath) {
    console.log('📄 Extracting Page 7 with GPT-5-mini...');
    const prompt = this.getPromptForPage(7);
    return await this.callGPT5Vision(imagePath, prompt);
  }
  
  async extractPage8(imagePath) {
    console.log('📄 Extracting Page 8 with GPT-5-mini...');
    const prompt = this.getPromptForPage(8);
    return await this.callGPT5Vision(imagePath, prompt);
  }
  
  async extractPages10to16(tempFolder, pngFiles) {
    console.log('📄 Extracting Pages 10-16 with GPT-5-mini...');
    const results = {};
    
    // Process each page individually
    for (let i = 9; i < Math.min(pngFiles.length, 17); i++) {
      if (pngFiles[i]) {
        const pagePath = path.join(tempFolder, pngFiles[i]);
        const pageNum = i + 1;
        console.log(`  📄 Processing Page ${pageNum}...`);
        const prompt = this.getPromptForPage(pageNum);
        const pageData = await this.callGPT5Vision(pagePath, prompt);
        Object.assign(results, pageData);
      }
    }
    
    return results;
  }
}

// Run extraction
async function main() {
  const pdfPath = process.argv[2];
  
  if (!pdfPath) {
    console.log('Usage: node run-gpt5-extraction.js <pdf-path>');
    process.exit(1);
  }
  
  console.log('='.repeat(60));
  console.log('🤖 GPT-5-mini Contract Extraction');
  console.log('='.repeat(60));
  console.log('');
  
  const startTime = Date.now();
  const extractor = new GPT5MiniExtractor();
  
  try {
    const result = await extractor.extractFromPDF(pdfPath);
    const elapsed = Date.now() - startTime;
    
    if (result.success) {
      console.log('\n' + '='.repeat(60));
      console.log('✅ EXTRACTION SUCCESSFUL');
      console.log('='.repeat(60));
      console.log(`⏱️ Total Time: ${elapsed}ms (${(elapsed/1000).toFixed(1)}s)`);
      console.log(`📊 Success Rate: ${result.extractionRate}`);
      console.log(`📝 Fields: ${result.fieldsExtracted}/${result.totalFields}`);
      
      console.log('\n🔑 Key Data:');
      console.log(`  Buyers: ${result.data?.buyers?.join(', ')}`);
      console.log(`  Property: ${result.data?.property_address}`);
      console.log(`  Type: ${result.data?.purchase_type}`);
      console.log(`  Amount: $${result.data?.purchase_price || result.data?.cash_amount}`);
      
      // Save results
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const outputFile = `gpt5_extraction_${timestamp}.json`;
      await fs.writeFile(outputFile, JSON.stringify(result.data, null, 2));
      console.log(`\n💾 Full results saved to: ${outputFile}`);
      
      // Cost estimate
      const tokensPerPage = 2500; // Approximate from our tests
      const pages = result.fieldsExtracted > 30 ? 16 : 8; // Estimate pages processed
      const totalTokens = pages * tokensPerPage;
      const gpt5Cost = (totalTokens / 1000000) * 0.25 + (totalTokens / 1000000) * 2;
      const gpt4Cost = (totalTokens / 1000000) * 2.50 + (totalTokens / 1000000) * 10;
      
      console.log('\n💰 Cost Analysis:');
      console.log(`  GPT-5-mini cost: ~$${gpt5Cost.toFixed(4)}`);
      console.log(`  GPT-4o cost: ~$${gpt4Cost.toFixed(4)}`);
      console.log(`  Savings: ~$${(gpt4Cost - gpt5Cost).toFixed(4)} (${Math.round((1 - gpt5Cost/gpt4Cost) * 100)}% cheaper)`);
      
    } else {
      console.error('❌ Extraction failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main().catch(console.error);