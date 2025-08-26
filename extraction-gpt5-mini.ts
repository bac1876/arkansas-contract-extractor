/**
 * GPT-5-mini optimized extractor for Arkansas contracts
 * Uses proper token allocation (4096) for GPT-5's reasoning phase
 */

import { ImageMagickExtractor } from './extraction-imagemagick';
import * as dotenv from 'dotenv';
dotenv.config();

export class GPT5MiniExtractor extends ImageMagickExtractor {
  constructor() {
    super();
  }

  // Override the extractPage method to use GPT-5-mini
  public async extractPage(imagePath: string, pageNumber: number): Promise<any> {
    const fs = require('fs').promises;
    const img = await fs.readFile(imagePath);
    const base64Image = img.toString('base64');
    
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Get the prompt for this page
    const prompt = (this as any).getPromptForPage(pageNumber);
    
    console.log(`📄 Processing Page ${pageNumber} with GPT-5-mini...`);
    
    try {
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
        // CRITICAL: High token budget for GPT-5's reasoning phase!
        max_completion_tokens: 4096,
        response_format: { type: 'json_object' }
      });
      
      const content = response.choices[0]?.message?.content || '';
      
      if (!content) {
        console.log(`⚠️ Page ${pageNumber}: Empty response from GPT-5-mini`);
        return {};
      }
      
      try {
        const cleanJson = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        console.log(`✅ Page ${pageNumber}: Extracted ${Object.keys(parsed).length} fields`);
        return parsed;
      } catch (err) {
        console.error(`❌ Page ${pageNumber}: Failed to parse JSON`);
        return {};
      }
    } catch (error: any) {
      console.error(`❌ GPT-5-mini error on page ${pageNumber}:`, error.message);
      return {};
    }
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const pdfPath = args[0];
  
  if (!pdfPath) {
    console.log('Usage: ts-node extraction-gpt5-mini.ts <pdf-path>');
    process.exit(1);
  }
  
  console.log('🚀 GPT-5-mini Extractor');
  console.log('💰 Cost: ~67% cheaper than GPT-4o');
  console.log('⚡ Token allocation: 4096 (covers reasoning + output)');
  console.log('');
  
  const extractor = new GPT5MiniExtractor();
  extractor.extractFromPDF(pdfPath)
    .then(result => {
      if (result.success) {
        console.log('\n📊 Extraction Results:');
        console.log(`✅ Success Rate: ${result.extractionRate}`);
        console.log(`📝 Fields: ${result.fieldsExtracted}/${result.totalFields}`);
        console.log('\n🔑 Key Data:');
        console.log(`  Buyers: ${result.data?.buyers?.join(', ')}`);
        console.log(`  Property: ${result.data?.property_address}`);
        console.log(`  Type: ${result.data?.purchase_type}`);
        console.log(`  Amount: $${result.data?.purchase_price || result.data?.cash_amount}`);
        
        // Save to file
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const outputFile = `extraction_gpt5mini_${timestamp}.json`;
        const fs = require('fs');
        fs.writeFileSync(outputFile, JSON.stringify(result.data, null, 2));
        console.log(`\n💾 Full results saved to: ${outputFile}`);
      } else {
        console.error('❌ Extraction failed:', result.error);
      }
    })
    .catch(console.error);
}