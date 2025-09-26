/**
 * Offer Sheet Extractor
 * Extracts only the specific fields needed for the offer sheet email
 * Now uses GPT-5 via HybridExtractor for improved accuracy
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { HybridExtractor } from '../extraction-hybrid';

dotenv.config();

export interface OfferSheetData {
  // Required fields
  buyerNames: string | null;
  purchasePrice: number | null;
  closeDate: string | null;
  
  // Optional fields (may be null or not applicable)
  sellerConcessions: number | null;
  earnestMoney: boolean;
  nonRefundableDeposit: {
    exists: boolean;
    amount: number | null;
  };
  contingency: string | null;
  itemsToConvey: string | null;
  homeWarranty: {
    included: boolean;
    amount: number | null;
  };
  survey: {
    required: boolean;
    details: string | null;
  };
}

export class OfferSheetExtractor {
  private openai: OpenAI;
  private hybridExtractor: HybridExtractor;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    // Initialize HybridExtractor for GPT-5 support
    this.hybridExtractor = new HybridExtractor();
  }
  
  /**
   * Extract offer sheet data from a contract PDF
   * @param useFullExtraction - If true, uses HybridExtractor for complete extraction
   */
  async extractFromPDF(pdfPath: string, useFullExtraction: boolean = true): Promise<OfferSheetData> {
    console.log('📄 Extracting offer sheet data from:', pdfPath);
    console.log('🤖 Using:', useFullExtraction ? 'HybridExtractor with GPT-4' : 'Direct GPT-4-mini vision calls');
    
    // Option 1: Use HybridExtractor for complete extraction (DEFAULT for Railway)
    if (useFullExtraction) {
      const result = await this.hybridExtractor.extractFromPDF(pdfPath, {
        model: 'auto',  // Will automatically select GPT-5-mini if available
        verbose: true
      });
      
      if (result.success && result.data) {
        // Map the full extraction result to our OfferSheetData format
        return this.mapFullExtractionToOfferSheet(result.data);
      } else {
        console.warn('⚠️ Full extraction failed, falling back to page-by-page');
      }
    }
    
    // Option 2: Page-by-page extraction with GPT-5-mini
    // Convert PDF to base64 images (reusing existing logic)
    const base64Images = await this.convertPDFToImages(pdfPath);
    
    // Extract data from specific pages with bounds checking
    const results = await Promise.all([
      base64Images[0] ? this.extractPage1(base64Images[0]) : {},  // Buyer names, purchase price
      base64Images[3] ? this.extractPage4(base64Images[3]) : {},  // Seller concessions, EMD, NRD
      base64Images[5] ? this.extractPage6(base64Images[5]) : {},  // Items to convey, survey
      base64Images[7] ? this.extractPage8(base64Images[7]) : {},  // Home warranty
      base64Images[11] ? this.extractPage12(base64Images[11]) : {}, // Close date
      base64Images[13] ? this.extractPage14(base64Images[13]) : {}  // Additional info/contingency
    ]);
    
    // Combine results
    return this.combineResults(results);
  }
  
  private async convertPDFToImages(pdfPath: string): Promise<string[]> {
    const { spawn } = require('child_process');
    const path = require('path');
    const fs = require('fs').promises;
    
    // Create temp folder for images
    const timestamp = Date.now().toString();
    const tempFolder = path.resolve(`offer_sheet_temp_${timestamp}`);
    await fs.mkdir(tempFolder, { recursive: true });
    
    console.log('🖼️ Converting PDF to images...');
    
    try {
      // Use ImageMagick to convert PDF to PNG
      const outputPattern = path.join(tempFolder, 'page-%d.png');
      const isWindows = process.platform === 'win32';
      
      const magickExecutable = isWindows 
        ? 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe'
        : 'convert';
      
      const args = isWindows ? [
        'convert',
        '-density', '150',
        pdfPath,
        '-alpha', 'remove',
        '-background', 'white',
        '-resize', '1224x1584',
        '-depth', '8',
        outputPattern
      ] : [
        '-density', '150',
        pdfPath,
        '-alpha', 'remove',
        '-background', 'white',
        '-resize', '1224x1584',
        '-depth', '8',
        outputPattern
      ];
      
      // Run ImageMagick
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(magickExecutable, args);
        
        let stderr = '';
        proc.stderr.on('data', (data: any) => {
          stderr += data.toString();
        });
        
        proc.on('close', (code: number) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`ImageMagick failed with code ${code}: ${stderr}`));
          }
        });
        
        proc.on('error', (err: any) => {
          reject(new Error(`Failed to spawn ImageMagick: ${err.message}`));
        });
      });
      
      // Read generated PNG files and convert to base64
      const files = await fs.readdir(tempFolder);
      const pngFiles = files
        .filter((f: string) => f.endsWith('.png'))
        .sort((a: string, b: string) => {
          const numA = parseInt(a.match(/page-(\d+)\.png/)?.[1] || '0');
          const numB = parseInt(b.match(/page-(\d+)\.png/)?.[1] || '0');
          return numA - numB;
        });
      
      const base64Images: string[] = [];
      for (const pngFile of pngFiles) {
        const imagePath = path.join(tempFolder, pngFile);
        const imageBuffer = await fs.readFile(imagePath);
        base64Images.push(imageBuffer.toString('base64'));
      }
      
      // Clean up temp folder
      for (const file of files) {
        await fs.unlink(path.join(tempFolder, file));
      }
      await fs.rmdir(tempFolder);
      
      console.log(`✅ Converted ${base64Images.length} pages to images`);
      return base64Images;
      
    } catch (error) {
      console.error('Error converting PDF to images:', error);
      // Clean up temp folder on error
      try {
        const files = await fs.readdir(tempFolder);
        for (const file of files) {
          await fs.unlink(path.join(tempFolder, file));
        }
        await fs.rmdir(tempFolder);
      } catch {}
      
      throw error;
    }
  }
  
  private async extractPage1(imageBase64: string): Promise<any> {
    const prompt = `Extract from this Arkansas real estate contract page 1:
    
1. BUYER NAMES from Paragraph 1 (all buyers listed)
2. PURCHASE PRICE from Paragraph 3 (total dollar amount)

Return as JSON:
{
  "buyerNames": "First Last, First Last",
  "purchasePrice": 000000
}`;
    
    return this.callVisionAPI(imageBase64, prompt);
  }
  
  private async extractPage4(imageBase64: string): Promise<any> {
    const prompt = `Extract from this Arkansas real estate contract page 4:
    
1. SELLER CONCESSIONS from Paragraph 5 (dollar amount or null if none)
2. EARNEST MONEY from Paragraph 7 (true if ANY box is checked)
3. NON-REFUNDABLE DEPOSIT from Paragraph 8 (check if exists and amount)

Return as JSON:
{
  "sellerConcessions": 0000 or null,
  "earnestMoney": true/false,
  "nonRefundableDeposit": {
    "exists": true/false,
    "amount": 0000 or null
  }
}`;
    
    return this.callVisionAPI(imageBase64, prompt);
  }
  
  private async extractPage6(imageBase64: string): Promise<any> {
    const prompt = `Extract from this Arkansas real estate contract page 6:
    
1. ITEMS TO CONVEY from Paragraph 13 (list any items mentioned)
2. SURVEY from Paragraph 11 (check if required and any details)

Return as JSON:
{
  "itemsToConvey": "item1, item2" or null,
  "survey": {
    "required": true/false,
    "details": "text" or null
  }
}`;
    
    return this.callVisionAPI(imageBase64, prompt);
  }
  
  private async extractPage8(imageBase64: string): Promise<any> {
    const prompt = `Extract from this Arkansas real estate contract page 8:
    
Extract HOME WARRANTY from Paragraph 15:
- Is it included? (check the boxes)
- If yes, what is the amount?

Return as JSON:
{
  "homeWarranty": {
    "included": true/false,
    "amount": 0000 or null
  }
}`;
    
    return this.callVisionAPI(imageBase64, prompt);
  }
  
  private async extractPage12(imageBase64: string): Promise<any> {
    const prompt = `Extract from this Arkansas real estate contract page 12:
    
Extract CLOSING DATE from Paragraph 22 (the date when closing will occur)

Return as JSON:
{
  "closeDate": "MM/DD/YYYY"
}`;
    
    return this.callVisionAPI(imageBase64, prompt);
  }
  
  private async extractPage14(imageBase64: string): Promise<any> {
    const prompt = `Extract from this Arkansas real estate contract page 14:
    
Extract from Paragraph 32 (OTHER):
Look for any contingencies, especially "sale of house" or property sale contingencies.
Also check for any buyer agency fee information.

Return as JSON:
{
  "contingency": "description of contingency" or null,
  "additionalInfo": "any other relevant info" or null
}`;
    
    return this.callVisionAPI(imageBase64, prompt);
  }
  
  private async callVisionAPI(imageBase64: string, prompt: string): Promise<any> {
    try {
      // Try GPT-5-mini first, fallback to GPT-4 if it fails
      let response;
      try {
        // GPT-5-mini with proper parameters like the main app
        response = await this.openai.chat.completions.create({
          model: "gpt-5-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${imageBase64}`,
                    detail: "high"
                  }
                }
              ]
            }
          ],
          max_completion_tokens: 8192,  // Higher budget for GPT-5 like main app
          // temperature: 0.1,  // GPT-5 doesn't support temperature yet
          response_format: { type: 'json_object' }  // Required for GPT-5 JSON responses
        });
        console.log('✅ Using GPT-5-mini');
      } catch (error: any) {
        // Fallback to GPT-4 if GPT-5 fails
        console.log('⚠️ GPT-5 error:', error.message);
        console.log('🔄 Falling back to GPT-4o...');
        response = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${imageBase64}`,
                    detail: "high"
                  }
                }
              ]
            }
          ],
          max_tokens: 500,
          temperature: 0.1
        });
      }
      
      let content = response.choices[0]?.message?.content || '{}';
      
      // Clean up markdown formatting if present
      if (content.includes('```json')) {
        content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      } else if (content.includes('```')) {
        content = content.replace(/```\s*/g, '');
      }
      
      // Trim whitespace
      content = content.trim();
      
      return JSON.parse(content);
    } catch (error) {
      console.error('Vision API error:', error);
      return {};
    }
  }
  
  private combineResults(results: any[]): OfferSheetData {
    return {
      buyerNames: results[0]?.buyerNames || null,
      purchasePrice: results[0]?.purchasePrice || null,
      sellerConcessions: results[1]?.sellerConcessions || null,
      earnestMoney: results[1]?.earnestMoney || false,
      nonRefundableDeposit: results[1]?.nonRefundableDeposit || { exists: false, amount: null },
      itemsToConvey: results[2]?.itemsToConvey || null,
      survey: results[2]?.survey || { required: false, details: null },
      homeWarranty: results[3]?.homeWarranty || { included: false, amount: null },
      closeDate: results[4]?.closeDate || null,
      contingency: results[5]?.contingency || null
    };
  }
  
  private mapFullExtractionToOfferSheet(data: any): OfferSheetData {
    // Map the full extraction data to our simplified offer sheet format
    return {
      buyerNames: data.buyers ? data.buyers.join(', ') : null,
      
      // Handle both purchase_price (financed) and cash_amount (cash)
      purchasePrice: data.purchase_price || data.cash_amount || null,
      
      // Parse seller concessions (handle percentage-based concessions)
      sellerConcessions: (() => {
        // Check if we have a calculated value from percentage
        if (data.seller_concessions_calculated) {
          return data.seller_concessions_calculated;
        }

        // Check for percentage in the text
        const concessionText = data.seller_concessions || data.para5_custom_text || '';
        if (concessionText && typeof concessionText === 'string') {
          const percentMatch = concessionText.match(/(\d+\.?\d*)\s*%/);
          if (percentMatch && purchasePrice) {
            const percent = parseFloat(percentMatch[1]) / 100;
            return Math.round(purchasePrice * percent);
          }
          // Otherwise try to extract dollar amount
          const amount = parseInt(concessionText.replace(/[^0-9]/g, ''));
          return amount || null;
        }

        return data.seller_concessions || null;
      })(),
      
      // Earnest money
      earnestMoney: data.earnest_money === 'YES',
      
      // Non-refundable deposit
      nonRefundableDeposit: {
        exists: data.non_refundable === 'YES',
        amount: data.non_refundable_amount || null
      },
      
      // Parse contingency from para32_other_terms or contingency_details
      contingency: data.para32_other_terms || data.contingency_details || null,
      
      // Items to convey
      itemsToConvey: data.para13_items_included || null,
      
      // Home warranty
      homeWarranty: {
        included: data.home_warranty === 'YES',
        amount: data.warranty_amount || null
      },
      
      // Survey
      survey: {
        required: data.survey_option && data.survey_option !== 'NO_SURVEY',
        details: data.survey_details || null
      },
      
      // Closing date
      closeDate: data.closing_date || null
    };
  }
}