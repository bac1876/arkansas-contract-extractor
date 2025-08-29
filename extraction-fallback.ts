/**
 * Fallback Extraction for Critical Fields
 * Used when main extraction fails to ensure we capture at least basic data
 */

import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';

dotenv.config();

export class FallbackExtractor {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Extract only critical fields from page 1
   * This is a last resort to get SOMETHING rather than nothing
   */
  async extractCriticalFields(imagePath: string): Promise<any> {
    console.log('🔧 FALLBACK: Attempting basic extraction of critical fields...');
    
    try {
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      const prompt = `Extract ONLY these critical fields from this contract page. Return JSON even if fields are empty:
      
      {
        "buyers": "buyer names",
        "property_address": "property address", 
        "purchase_price": 0,
        "cash_amount": 0,
        "closing_date": "date or null",
        "seller_pays_buyer_costs": 0,
        "extraction_status": "FALLBACK"
      }
      
      Look for:
      - Buyer names (usually after "Buyer(s):" or "Purchaser:")
      - Property address (usually at top or after "Property:")
      - Purchase price or cash amount (look for dollar amounts)
      - Closing date (look for any dates)
      - Seller concessions (look for "seller pays" or "seller contribution")
      
      Return valid JSON only.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',  // Use cheaper, faster model for fallback
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { 
              type: 'image_url', 
              image_url: { 
                url: `data:image/png;base64,${base64Image}`,
                detail: 'low'  // Use low detail for speed
              }
            }
          ]
        }],
        max_tokens: 500,
        temperature: 0
      });

      const content = response.choices[0]?.message?.content || '{}';
      const data = JSON.parse(content.replace(/```json\n?/g, '').replace(/```/g, '').trim());
      
      console.log('✅ FALLBACK: Extracted critical fields:', Object.keys(data).filter(k => data[k]));
      
      return {
        ...data,
        extraction_status: 'FALLBACK',
        extraction_complete: false,
        fallback_reason: 'Main extraction failed - used fallback'
      };
      
    } catch (error) {
      console.error('❌ FALLBACK extraction also failed:', error);
      
      // Return absolute minimum data structure
      return {
        buyers: 'EXTRACTION_FAILED',
        property_address: 'EXTRACTION_FAILED', 
        purchase_price: 0,
        cash_amount: 0,
        closing_date: null,
        seller_pays_buyer_costs: 0,
        extraction_status: 'FAILED',
        extraction_complete: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Extract basic info from all pages quickly
   * Used when we need something fast
   */
  async quickExtractAll(pdfPath: string): Promise<any> {
    console.log('🔧 FALLBACK: Quick extraction from PDF...');
    
    const extractedData: any = {
      extraction_status: 'FALLBACK_QUICK',
      extraction_complete: false
    };
    
    try {
      // For now, just try to get page 1 critical fields
      // Could expand to check other pages for specific data
      const page1Path = pdfPath.replace('.pdf', '_page1.png');
      
      // Check if we have page 1 image
      try {
        await fs.access(page1Path);
        const basicData = await this.extractCriticalFields(page1Path);
        Object.assign(extractedData, basicData);
      } catch {
        console.log('⚠️ No page 1 image available for fallback');
      }
      
    } catch (error) {
      console.error('❌ Quick extraction failed:', error);
      extractedData.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    return extractedData;
  }
}

export default FallbackExtractor;