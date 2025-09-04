/**
 * Offer Sheet ImageMagick Extractor
 * Extends ImageMagickExtractor like GPT5MiniExtractor does
 * Extracts only offer sheet fields
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

export class OfferSheetImageMagickExtractor extends ImageMagickExtractor {
  constructor() {
    super();
  }
  
  /**
   * Override to extract only offer sheet data
   */
  async extractFromPDF(pdfPath: string): Promise<{
    success: boolean;
    data?: OfferSheetData;
    error?: string;
  }> {
    console.log('📄 Starting Offer Sheet extraction...');
    
    try {
      // Call parent's extractFromPDF which handles all the ImageMagick conversion
      const fullResult = await super.extractFromPDF(pdfPath);
      
      if (!fullResult.success || !fullResult.data) {
        return {
          success: false,
          error: fullResult.error || 'Extraction failed'
        };
      }
      
      // Extract just the fields we need for offer sheet
      const offerData: OfferSheetData = {
        buyerNames: fullResult.data.buyers?.join(', ') || null,
        purchasePrice: fullResult.data.purchase_price || fullResult.data.cash_amount || null,
        closeDate: fullResult.data.close_date || null,
        sellerConcessions: fullResult.data.seller_concessions ? 
          parseFloat(fullResult.data.seller_concessions.replace(/[^0-9.]/g, '')) : null,
        earnestMoney: fullResult.data.earnest_money === 'YES' ? 
          `Yes - $${fullResult.data.earnest_money_amount || 'Amount not specified'}` : 'No',
        nonRefundableDeposit: fullResult.data.non_refundable_deposit === 'YES' ?
          `Yes - $${fullResult.data.non_refundable_amount || 'Amount not specified'}` : 'No',
        contingency: fullResult.data.contingency === 'YES' ? 
          fullResult.data.contingency_details || 'Yes' : null,
        itemsToConvey: fullResult.data.personal_property || null,
        homeWarranty: fullResult.data.home_warranty === 'YES' ?
          `Yes - ${fullResult.data.warranty_details || 'Details not specified'}` : 'No',
        survey: fullResult.data.survey_option || null
      };
      
      console.log('✅ Offer sheet extraction complete');
      console.log(`  Extracted ${Object.values(offerData).filter(v => v !== null).length}/10 fields`);
      
      return {
        success: true,
        data: offerData
      };
      
    } catch (error) {
      console.error('❌ Extraction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}