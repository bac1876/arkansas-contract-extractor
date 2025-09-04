/**
 * Simple PDF Extractor for Railway
 * Uses pdf-parse for text extraction (no ImageMagick needed)
 * Sends text to GPT-4 for extraction
 */

import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';
const pdfParse = require('pdf-parse');

dotenv.config();

export interface SimpleOfferData {
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

export class SimplePDFExtractor {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  
  async extractFromPDF(pdfPath: string): Promise<SimpleOfferData> {
    console.log('🚀 Simple PDF extraction starting...');
    
    try {
      // Read PDF buffer
      const pdfBuffer = await fs.readFile(pdfPath);
      
      // Extract text from PDF using pdf-parse
      console.log('📖 Extracting text from PDF...');
      const pdfData = await pdfParse(pdfBuffer);
      const pdfText = pdfData.text;
      
      console.log(`📄 Extracted ${pdfText.length} characters from PDF`);
      console.log('📤 Sending to GPT-4 for analysis...');
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: `Extract the following information from this Arkansas real estate contract text. Return ONLY the requested data in JSON format:
              
{
  "buyerNames": "full names of all buyers",
  "purchasePrice": numeric value only,
  "closeDate": "date as string",
  "sellerConcessions": numeric value or null,
  "earnestMoney": "amount or 'No' if none",
  "nonRefundableDeposit": "amount or 'No' if none",
  "contingency": "description or null",
  "itemsToConvey": "items listed or null",
  "homeWarranty": "Yes/No and amount if any",
  "survey": "Yes/No and details if any"
}

Look for buyer names near "Buyer" or "Purchaser" sections.
Look for purchase price near "Purchase Price" or dollar amounts.
Look for closing date near "Closing" or "Close Date".
Look for financial terms like seller concessions, earnest money.
Look for contingencies, items to convey, home warranty, survey requirements.

If you cannot extract certain information, use null.

CONTRACT TEXT:
${pdfText}`
        }],
        max_tokens: 1000,
        temperature: 0.1
      });
      
      const content = response.choices[0]?.message?.content || '{}';
      console.log('📥 Response received');
      
      // Try to parse JSON from the response
      let extractedData: any = {};
      try {
        // Find JSON in the response (might be wrapped in markdown)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        extractedData = {};
      }
      
      // Return with defaults for missing fields
      return {
        buyerNames: extractedData.buyerNames || null,
        purchasePrice: extractedData.purchasePrice ? Number(extractedData.purchasePrice) : null,
        closeDate: extractedData.closeDate || null,
        sellerConcessions: extractedData.sellerConcessions ? Number(extractedData.sellerConcessions) : null,
        earnestMoney: extractedData.earnestMoney || null,
        nonRefundableDeposit: extractedData.nonRefundableDeposit || null,
        contingency: extractedData.contingency || null,
        itemsToConvey: extractedData.itemsToConvey || null,
        homeWarranty: extractedData.homeWarranty || null,
        survey: extractedData.survey || null
      };
      
    } catch (error) {
      console.error('❌ Extraction error:', error);
      
      // Return empty data on error
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
}