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
  propertyAddress: string | null;
  loanType: string | null;
  sellingAgentName: string | null;
  sellingAgentPhone: string | null;
  otherTerms: string | null;
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
        buyerNames: fullResult.data.buyers?.join(' and ') || null,
        purchasePrice: fullResult.data.purchase_price || fullResult.data.cash_amount || null,
        closeDate: fullResult.data.closing_date || null,
        sellerConcessions: fullResult.data.seller_concessions ? 
          parseFloat(fullResult.data.seller_concessions.replace(/[^0-9.]/g, '')) : null,
        earnestMoney: fullResult.data.earnest_money === 'YES' ? 'Yes - See Addendum' : 'No',
        nonRefundableDeposit: fullResult.data.non_refundable === 'YES' ?
          `Yes - $${fullResult.data.non_refundable_amount ? fullResult.data.non_refundable_amount.toLocaleString() : 'Amount not specified'}` : 'No',
        contingency: fullResult.data.contingency === 'YES' ? 
          fullResult.data.contingency_details || 'Yes' : null,
        itemsToConvey: fullResult.data.personal_property || null,
        homeWarranty: fullResult.data.home_warranty === 'YES' ?
          `Yes - ${[
            fullResult.data.warranty_details,
            fullResult.data.home_warranty_cost ? `$${fullResult.data.home_warranty_cost}` : null,
            fullResult.data.home_warranty_paid_by ? `Paid by ${fullResult.data.home_warranty_paid_by}` : null
          ].filter(Boolean).join(' - ') || 'See contract for details'}` : 'No',
        survey: fullResult.data.survey_option === 'B' ? null : // B = No survey
                fullResult.data.survey_option === 'A' ? 
                  (fullResult.data.survey_details ? 
                    `Survey Required - ${fullResult.data.survey_details}` : 
                    'Survey Required - Paid by Seller') :
                fullResult.data.survey_option === 'C' ? 'Other (see contract)' :
                fullResult.data.survey_option || null,
        propertyAddress: (() => {
          // Clean property address - remove anything after ZIP code
          let cleanAddress = fullResult.data.property_address || null;
          if (cleanAddress) {
            // Match up to and including ZIP code (12345 or 12345-6789 format)
            const zipMatch = cleanAddress.match(/^(.+?\d{5}(?:-\d{4})?)/);
            if (zipMatch) {
              cleanAddress = zipMatch[1].trim();
            }
          }
          return cleanAddress;
        })(),
        loanType: fullResult.data.loan_type || null,
        sellingAgentName: fullResult.data.selling_agent_name || null,
        sellingAgentPhone: fullResult.data.selling_agent_phone || null,
        otherTerms: fullResult.data.para32_additional_terms || fullResult.data.para32_other_terms || fullResult.data.additional_terms || null
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