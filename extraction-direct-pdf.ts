/**
 * Direct PDF Extraction using OpenAI Vision API
 * This version sends PDF pages directly as base64 without needing ImageMagick conversion
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { PDFDocument } from 'pdf-lib';

dotenv.config();

export interface ContractExtractionResult {
  buyers: string[];
  property_address: string;
  purchase_type: 'FINANCED' | 'CASH' | 'LOAN_ASSUMPTION';
  purchase_price: number | null;
  cash_amount: number | null;
  closing_date?: string;
  seller_concessions?: string | number;
  buyer_agency_fee?: string;
  home_warranty?: string;
  warranty_amount?: number;
  [key: string]: any;
}

export class DirectPDFExtractor {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Extract a single page from PDF and convert to base64 PNG
   */
  private async extractPageAsBase64(pdfBuffer: Buffer, pageNumber: number): Promise<string> {
    try {
      // For now, we'll use the entire PDF as base64
      // OpenAI can handle PDF files directly in base64 format
      return pdfBuffer.toString('base64');
    } catch (error) {
      console.error(`Error extracting page ${pageNumber}:`, error);
      throw error;
    }
  }

  /**
   * Extract contract data directly from PDF without ImageMagick
   */
  async extractFromPDF(pdfPath: string): Promise<{
    success: boolean;
    data?: ContractExtractionResult;
    error?: string;
    extractionRate?: string;
    fieldsExtracted?: number;
    totalFields?: number;
  }> {
    try {
      pdfPath = path.resolve(pdfPath);
      console.log(`🔍 Direct PDF Extractor: Starting extraction for: ${pdfPath}`);
      
      // Read PDF file
      const pdfBuffer = await fs.readFile(pdfPath);
      console.log(`   PDF size: ${pdfBuffer.length} bytes`);
      
      // Verify it's a valid PDF
      const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
      if (!pdfHeader.startsWith('%PDF')) {
        throw new Error('Invalid PDF file format');
      }

      // Convert entire PDF to base64
      const base64Pdf = pdfBuffer.toString('base64');
      
      console.log('📤 Sending PDF directly to OpenAI Vision API...');
      
      // Extract contract data using Vision API with the PDF
      const prompt = `Extract ALL contract data from this Arkansas real estate contract PDF. Return a JSON object with these fields:

REQUIRED FIELDS:
- buyers: Array of buyer names
- property_address: Full property address
- purchase_type: "CASH", "FINANCED", or "LOAN_ASSUMPTION"
- purchase_price: Total purchase price (number)
- cash_amount: Cash amount if CASH purchase (number or null)
- closing_date: Closing date (string)
- seller_concessions: Amount seller pays for buyer costs
- buyer_agency_fee: Buyer agency fee amount or percentage
- home_warranty: "YES" or "NO"
- warranty_amount: Home warranty amount if YES

Extract any paragraph 32 "OTHER" terms that mention buyer agency fees.
For Para 5, check if custom terms box is checked and extract the text.
Return ONLY valid JSON, no markdown or explanation.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Pdf}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content || '';
      console.log('📥 Received response from OpenAI');
      
      // Parse the JSON response
      let extractedData: any;
      try {
        // Clean up the response to extract JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse response:', content);
        throw new Error('Failed to parse extraction response');
      }

      // Count extracted fields
      const fieldsExtracted = Object.keys(extractedData).filter(k => 
        extractedData[k] !== null && extractedData[k] !== undefined
      ).length;

      console.log(`✅ Extraction complete: ${fieldsExtracted} fields extracted`);

      return {
        success: true,
        data: extractedData as ContractExtractionResult,
        extractionRate: `${fieldsExtracted}/10 core fields`,
        fieldsExtracted,
        totalFields: 10
      };

    } catch (error) {
      console.error('❌ Direct PDF extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        fieldsExtracted: 0,
        totalFields: 10
      };
    }
  }
}

// Export for use in other modules
export default DirectPDFExtractor;