/**
 * Offer Sheet Vision Extractor
 * Uses the SAME approach as the working main app
 * Extends ImageMagickExtractor for PDF conversion
 * Uses GPT-5-mini or GPT-4o for vision extraction
 */

import { ImageMagickExtractor } from '../extraction-imagemagick';
import * as dotenv from 'dotenv';
dotenv.config();

export interface OfferSheetData {
  buyerNames: string | null;
  purchasePrice: number | null;
  closeDate: string | null;
  sellerConcessions: number | null;
  earnestMoney: string | null;
  nonRefundableDeposit: string | null;
  contingency: string | null;
  itemsToConvey: string | null;
  homeWarranty: string | null;
  survey: string | null;
}

export class OfferSheetVisionExtractor {
  private imagemagickExtractor: ImageMagickExtractor;
  
  constructor() {
    this.imagemagickExtractor = new ImageMagickExtractor();
  }
  
  async extractFromPDF(pdfPath: string): Promise<OfferSheetData> {
    console.log('📄 Starting Offer Sheet extraction...');
    
    try {
      // Convert PDF to images using ImageMagick (same as main app)
      const images = await this.imagemagickExtractor.convertPDFToImages(pdfPath);
      console.log(`✅ Converted to ${images.length} images`);
      
      // Extract specific pages for offer sheet data
      const results = await Promise.all([
        this.extractPage1(images[0]),   // Buyer names, purchase price
        this.extractPage4(images[3]),   // Seller concessions, earnest money
        this.extractPage6(images[5]),   // Items to convey, survey
        this.extractPage8(images[7]),   // Home warranty
        this.extractPage12(images[11]), // Close date
        this.extractPage14(images[13])  // Contingency
      ]);
      
      // Combine results
      const combined: OfferSheetData = {
        buyerNames: results[0].buyerNames || null,
        purchasePrice: results[0].purchasePrice || null,
        sellerConcessions: results[1].sellerConcessions || null,
        earnestMoney: results[1].earnestMoney || null,
        nonRefundableDeposit: results[1].nonRefundableDeposit || null,
        itemsToConvey: results[2].itemsToConvey || null,
        survey: results[2].survey || null,
        homeWarranty: results[3].homeWarranty || null,
        closeDate: results[4].closeDate || null,
        contingency: results[5].contingency || null
      };
      
      // Cleanup temp images
      await this.imagemagickExtractor.cleanupTempFiles(images);
      
      console.log('✅ Offer sheet extraction complete');
      return combined;
      
    } catch (error) {
      console.error('❌ Extraction error:', error);
      return {
        buyerNames: null,
        purchasePrice: null,
        closeDate: null,
        sellerConcessions: null,
        earnestMoney: null,
        nonRefundableDeposit: null,
        contingency: null,
        itemsToConvey: null,
        homeWarranty: null,
        survey: null
      };
    }
  }
  
  private async extractPage1(imagePath: string): Promise<any> {
    const fs = require('fs').promises;
    const img = await fs.readFile(imagePath);
    const base64Image = img.toString('base64');
    
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    console.log('📄 Extracting Page 1 (Buyers, Price)...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Can switch to gpt-5-mini if available
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extract from this Arkansas contract page:
1. BUYER NAMES - Look for "Buyer" section, extract all full names
2. PURCHASE PRICE - Look for paragraph 3A or "Purchase Price", extract dollar amount

Return JSON:
{
  "buyerNames": "Full names of all buyers",
  "purchasePrice": numeric value only
}`
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
      max_tokens: 500,
      temperature: 0.1
    });
    
    try {
      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content.replace(/```json\n?/g, '').replace(/```/g, '').trim());
    } catch {
      return {};
    }
  }
  
  private async extractPage4(imagePath: string): Promise<any> {
    const fs = require('fs').promises;
    const img = await fs.readFile(imagePath);
    const base64Image = img.toString('base64');
    
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    console.log('📄 Extracting Page 4 (Financial Terms)...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extract financial terms from this contract page:
1. SELLER CONCESSIONS - Look for paragraph 5, any dollar amounts
2. EARNEST MONEY - Look for paragraph 7, is there earnest money? (Yes/No and amount if yes)
3. NON-REFUNDABLE DEPOSIT - Look for paragraph 8, any amounts

Return JSON:
{
  "sellerConcessions": numeric value or null,
  "earnestMoney": "Yes - $amount" or "No",
  "nonRefundableDeposit": "Yes - $amount" or "No"
}`
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
      max_tokens: 500,
      temperature: 0.1
    });
    
    try {
      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content.replace(/```json\n?/g, '').replace(/```/g, '').trim());
    } catch {
      return {};
    }
  }
  
  private async extractPage6(imagePath: string): Promise<any> {
    const fs = require('fs').promises;
    const img = await fs.readFile(imagePath);
    const base64Image = img.toString('base64');
    
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    console.log('📄 Extracting Page 6 (Items, Survey)...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extract from this contract page:
1. ITEMS TO CONVEY - Look for paragraph 13, what items are included/excluded
2. SURVEY - Look for paragraph 11, is a survey required? (Yes/No and details)

Return JSON:
{
  "itemsToConvey": "list of items or null",
  "survey": "Yes/No and any details"
}`
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
      max_tokens: 500,
      temperature: 0.1
    });
    
    try {
      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content.replace(/```json\n?/g, '').replace(/```/g, '').trim());
    } catch {
      return {};
    }
  }
  
  private async extractPage8(imagePath: string): Promise<any> {
    const fs = require('fs').promises;
    const img = await fs.readFile(imagePath);
    const base64Image = img.toString('base64');
    
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    console.log('📄 Extracting Page 8 (Home Warranty)...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extract HOME WARRANTY information from paragraph 15:
Is a home warranty included? (Yes/No)
If yes, who pays and what amount?

Return JSON:
{
  "homeWarranty": "Yes - details" or "No"
}`
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
      max_tokens: 300,
      temperature: 0.1
    });
    
    try {
      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content.replace(/```json\n?/g, '').replace(/```/g, '').trim());
    } catch {
      return {};
    }
  }
  
  private async extractPage12(imagePath: string): Promise<any> {
    const fs = require('fs').promises;
    const img = await fs.readFile(imagePath);
    const base64Image = img.toString('base64');
    
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    console.log('📄 Extracting Page 12 (Close Date)...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extract CLOSING DATE from paragraph 22:
Look for the closing/settlement date.

Return JSON:
{
  "closeDate": "date as string or null"
}`
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
      max_tokens: 200,
      temperature: 0.1
    });
    
    try {
      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content.replace(/```json\n?/g, '').replace(/```/g, '').trim());
    } catch {
      return {};
    }
  }
  
  private async extractPage14(imagePath: string): Promise<any> {
    const fs = require('fs').promises;
    const img = await fs.readFile(imagePath);
    const base64Image = img.toString('base64');
    
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    console.log('📄 Extracting Page 14 (Contingency)...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extract CONTINGENCY information from paragraph 32 (OTHER):
Look for any contingencies, special terms, or buyer agency fees.

Return JSON:
{
  "contingency": "description of contingency or null"
}`
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
      max_tokens: 300,
      temperature: 0.1
    });
    
    try {
      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content.replace(/```json\n?/g, '').replace(/```/g, '').trim());
    } catch {
      return {};
    }
  }
}