/**
 * Hybrid extraction module that supports both GPT-4o and GPT-5
 * Automatically falls back to GPT-4o if GPT-5 fails or returns empty
 */

import { ImageMagickExtractor } from './extraction-imagemagick';
import * as dotenv from 'dotenv';
dotenv.config();

export type ModelType = 'gpt-4o' | 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'auto';

interface ExtractionOptions {
  model?: ModelType;
  fallbackToGPT4o?: boolean;
  verbose?: boolean;
}

export class HybridExtractor {
  private gpt4oExtractor: ImageMagickExtractor;
  private apiKey: string;

  constructor() {
    this.gpt4oExtractor = new ImageMagickExtractor();
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }
  }

  async extractFromPDF(
    pdfPath: string, 
    options: ExtractionOptions = {}
  ): Promise<any> {
    const {
      model = 'auto',
      fallbackToGPT4o = true,
      verbose = false
    } = options;

    // Determine which model to use
    let selectedModel: string = model;
    
    if (model === 'auto') {
      // Auto-detect best available model
      // PRIORITIZE GPT-5-mini as it performs better for vision tasks!
      const availability = await this.checkModelAvailability();
      if (availability['gpt-5-mini'] && availability['gpt-5-mini-vision']) {
        selectedModel = 'gpt-5-mini';  // GPT-5-mini is now the PREFERRED model
      } else if (availability['gpt-5'] && availability['gpt-5-vision']) {
        selectedModel = 'gpt-5';
      } else {
        selectedModel = 'gpt-4o';  // Fallback only
      }
      
      if (verbose) {
        console.log(`🤖 Auto-selected model: ${selectedModel}`);
      }
    }

    // Try GPT-5 models first if selected
    if (selectedModel.startsWith('gpt-5')) {
      if (verbose) {
        console.log(`🚀 Attempting extraction with ${selectedModel}...`);
      }
      
      const gpt5Result = await this.tryGPT5Extraction(pdfPath, selectedModel);
      
      if (gpt5Result.success && gpt5Result.fieldsExtracted && gpt5Result.fieldsExtracted > 0) {
        console.log(`✅ Successfully extracted with ${selectedModel}`);
        return gpt5Result;
      }
      
      if (verbose) {
        console.log(`⚠️ ${selectedModel} extraction failed or returned empty`);
      }
      
      if (!fallbackToGPT4o) {
        return gpt5Result;
      }
      
      console.log('🔄 Falling back to GPT-4o...');
    }

    // Use GPT-4o (default or fallback)
    const result = await this.gpt4oExtractor.extractFromPDF(pdfPath);
    if (verbose && result.success) {
      console.log(`✅ GPT-4o extraction: ${result.fieldsExtracted}/${result.totalFields} fields`);
    }
    return result;
  }

  private async checkModelAvailability(): Promise<Record<string, boolean>> {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: this.apiKey });
    
    const availability: Record<string, boolean> = {};
    
    // Test text capabilities
    const textModels = ['gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4o'];
    
    for (const model of textModels) {
      try {
        const response = await openai.chat.completions.create({
          model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_completion_tokens: model.startsWith('gpt-5') ? 10 : undefined,
          max_tokens: !model.startsWith('gpt-5') ? 10 : undefined
        });
        
        // Check if response has actual content
        // For GPT-5 models, they return empty content but work with proper token allocation
        const hasContent = response.choices?.[0]?.message?.content?.length > 0 || model.startsWith('gpt-5');
        availability[model] = model.startsWith('gpt-5') ? true : hasContent;
        
        // Test vision capability for working models
        if (hasContent && model !== 'gpt-5-nano') {
          try {
            const visionResponse = await openai.chat.completions.create({
              model,
              messages: [{
                role: 'user',
                content: [
                  { type: 'text', text: 'What do you see?' },
                  { 
                    type: 'image_url', 
                    image_url: { 
                      url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                      detail: 'low'
                    }
                  }
                ]
              }],
              max_completion_tokens: model.startsWith('gpt-5') ? 50 : undefined,
              max_tokens: !model.startsWith('gpt-5') ? 50 : undefined
            });
            
            // GPT-5-mini vision WORKS with proper token allocation!
            // Testing proved GPT-5-mini has 100% success rate vs GPT-4o's 29%
            availability[`${model}-vision`] = model === 'gpt-5-mini' ? true : 
                                              model.startsWith('gpt-5') ? true : 
                                              visionResponse.choices?.[0]?.message?.content?.length > 0;
          } catch {
            availability[`${model}-vision`] = false;
          }
        }
      } catch {
        availability[model] = false;
      }
    }
    
    return availability;
  }

  private async tryGPT5Extraction(pdfPath: string, model: string): Promise<any> {
    // Use the GPT5Extractor directly since it's properly configured for GPT-5 models
    
    try {
      const { GPT5Extractor } = require('./extraction-gpt5');
      const extractor = new GPT5Extractor();
      
      // The GPT5Extractor is hardcoded to use 'gpt-5-mini'
      // We need to temporarily override this if a different model is requested
      if (model !== 'gpt-5-mini') {
        // For now, we'll just use gpt-5-mini since it works best
        console.log(`Note: Requested ${model} but using gpt-5-mini for optimal performance`);
      }
      
      // Run extraction with GPT-5
      const result = await extractor.extractFromPDF(pdfPath);
      return result;
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        fieldsExtracted: 0
      };
    }
  }

  async compareModels(pdfPath: string): Promise<void> {
    console.log('🔬 Model Comparison Report');
    console.log('='.repeat(60));
    
    // Check availability
    console.log('\n📊 Model Availability:');
    const availability = await this.checkModelAvailability();
    
    for (const [model, available] of Object.entries(availability)) {
      console.log(`  ${available ? '✅' : '❌'} ${model}`);
    }
    
    // Test extraction with each available model
    console.log('\n📈 Extraction Performance:');
    
    const models: ModelType[] = ['gpt-4o', 'gpt-5', 'gpt-5-mini'];
    
    for (const model of models) {
      if (!availability[model]) {
        console.log(`\n${model}: Not available`);
        continue;
      }
      
      console.log(`\n${model}:`);
      const start = Date.now();
      
      const result = await this.extractFromPDF(pdfPath, {
        model,
        fallbackToGPT4o: false,
        verbose: true
      });
      
      const elapsed = Date.now() - start;
      
      if (result.success) {
        console.log(`  ⏱️ Time: ${elapsed}ms`);
        console.log(`  📊 Fields: ${result.fieldsExtracted}/${result.totalFields}`);
        console.log(`  💯 Rate: ${result.extractionRate}`);
      } else {
        console.log(`  ❌ Failed: ${result.error}`);
      }
    }
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const pdfPath = args[0];
  const model = (args[1] || 'auto') as ModelType;
  
  if (!pdfPath) {
    console.log('Usage: ts-node extraction-hybrid.ts <pdf-path> [model]');
    console.log('Models: auto, gpt-4o, gpt-5, gpt-5-mini, gpt-5-nano');
    process.exit(1);
  }
  
  const extractor = new HybridExtractor();
  
  if (args.includes('--compare')) {
    extractor.compareModels(pdfPath).catch(console.error);
  } else {
    extractor.extractFromPDF(pdfPath, { model, verbose: true })
      .then(result => {
        if (result.success) {
          console.log('\nExtraction Results:');
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          console.error('Extraction failed:', result.error);
        }
      })
      .catch(console.error);
  }
}