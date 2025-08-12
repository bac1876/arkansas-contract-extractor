/**
 * Sharp + pdfjs-dist based extraction module for Arkansas Contract Extraction
 * No external dependencies required - pure JavaScript solution
 */

import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import * as dotenv from 'dotenv';

// Import pdfjs-dist properly for TypeScript
const pdfjsLib = require('pdfjs-dist');
const { createCanvas } = require('canvas');

dotenv.config();

export interface ContractExtractionResult {
  buyers: string[];
  sellers: string[];
  property_address: string;
  property_type: string;
  purchase_type: 'FINANCED' | 'CASH' | 'LOAN_ASSUMPTION';
  purchase_price: number | null;
  cash_amount: number | null;
  loan_type: string | null;
  para5_amounts: string[];
  para5_custom_text: string;
  seller_concessions: string;
  appraisal_option: string;
  earnest_money: 'YES' | 'NO';
  earnest_money_amount: number | null;
  earnest_money_held_by: string;
  non_refundable: 'YES' | 'NO';
  non_refundable_amount: number | null;
  non_refundable_when: string;
  title_option: string;
  survey_option: string;
  survey_details: string;
  para13_items_included: string;
  para13_items_excluded: string;
  contingency: 'YES' | 'NO';
  contingency_details: string;
  home_warranty: 'YES' | 'NO';
  warranty_details: string;
  warranty_paid_by: string;
  inspection_option: string;
  inspection_details: string;
  wood_infestation: string;
  termite_option: string;
  lead_paint_option: string;
  contract_date: string;
  closing_date: string;
  acceptance_date: string;
  possession_option: string;
  possession_details: string;
  additional_terms: string;
  para37_option: string;
  serial_number: string;
}

export class SharpPDFExtractor {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async extractFromPDF(pdfPath: string): Promise<{
    success: boolean;
    data?: ContractExtractionResult;
    error?: string;
    extractionRate?: string;
    fieldsExtracted?: number;
    totalFields?: number;
  }> {
    let tempFolder: string | null = null;
    
    try {
      console.log(`🔍 Sharp Extractor: Starting extraction for: ${pdfPath}`);
      
      // Create a unique temp folder
      const timestamp = Date.now().toString();
      tempFolder = path.join(process.cwd(), `sharp_temp_${timestamp}`);
      
      console.log(`📁 Creating temp folder: ${tempFolder}`);
      await fs.mkdir(tempFolder, { recursive: true });
      
      console.log('📄 Loading PDF document...');
      
      // Read the PDF file
      const pdfData = await fs.readFile(pdfPath);
      
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(pdfData),
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      });
      
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;
      
      console.log(`📄 PDF has ${numPages} pages`);
      
      // Convert each page to PNG using canvas and sharp
      const pagePaths: string[] = [];
      
      for (let pageNum = 1; pageNum <= Math.min(numPages, 20); pageNum++) {
        console.log(`🖼️ Converting page ${pageNum}...`);
        
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });
        
        // Create canvas
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        
        // Render PDF page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        // Convert canvas to buffer
        const buffer = canvas.toBuffer('image/png');
        
        // Save using sharp (for consistent high quality)
        const outputPath = path.join(tempFolder, `page_${pageNum}.png`);
        await sharp(buffer)
          .png({ quality: 100, compressionLevel: 0 })
          .toFile(outputPath);
        
        pagePaths.push(outputPath);
      }
      
      console.log(`✅ Converted ${pagePaths.length} pages successfully`);
      
      // Extract from each page using Vision API
      const extractedData: any = {};
      
      // Page 1 - Parties, Property, Purchase
      if (pagePaths.length >= 1) {
        const page1Data = await this.extractPage1(pagePaths[0]);
        Object.assign(extractedData, page1Data);
      }
      
      // Page 4 - Financial Terms
      if (pagePaths.length >= 4) {
        const page4Data = await this.extractPage4(pagePaths[3]);
        Object.assign(extractedData, page4Data);
      }
      
      // Page 5 - Title
      if (pagePaths.length >= 5) {
        const page5Data = await this.extractPage5(pagePaths[4]);
        Object.assign(extractedData, page5Data);
      }
      
      // Page 6 - Survey AND Para 13
      if (pagePaths.length >= 6) {
        const page6Data = await this.extractPage6(pagePaths[5]);
        Object.assign(extractedData, page6Data);
      }
      
      // Page 7 - Contingencies
      if (pagePaths.length >= 7) {
        const page7Data = await this.extractPage7(pagePaths[6]);
        Object.assign(extractedData, page7Data);
      }
      
      // Page 8 - Warranty & Inspection
      if (pagePaths.length >= 8) {
        const page8Data = await this.extractPage8(pagePaths[7]);
        Object.assign(extractedData, page8Data);
      }
      
      // Pages 10-16 - Remaining terms
      if (pagePaths.length >= 10) {
        const otherData = await this.extractPages10to16(pagePaths);
        Object.assign(extractedData, otherData);
      }
      
      // Clean up temp files
      console.log('🧹 Cleaning up temp files...');
      await fs.rm(tempFolder, { recursive: true, force: true }).catch(err => {
        console.warn('⚠️ Could not clean up temp folder:', err.message);
      });
      
      // Calculate extraction rate
      const totalFields = 41;
      const fieldsExtracted = Object.values(extractedData).filter(v => v !== null && v !== undefined && v !== '').length;
      const extractionRate = Math.round((fieldsExtracted / totalFields) * 100);
      
      return {
        success: true,
        data: extractedData as ContractExtractionResult,
        extractionRate: `${extractionRate}%`,
        fieldsExtracted,
        totalFields
      };
      
    } catch (error) {
      console.error('❌ Sharp Extractor Error:', error);
      
      // Clean up on error
      if (tempFolder) {
        await fs.rm(tempFolder, { recursive: true, force: true }).catch(() => {});
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async extractPage1(imagePath: string): Promise<Partial<ContractExtractionResult>> {
    const img = await fs.readFile(imagePath);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract ALL information from this Arkansas contract page 1:

1. PARAGRAPH 1 - PARTIES:
   - All buyer names (full names)
   - Property address (complete)

2. PARAGRAPH 2 - PROPERTY TYPE:
   - Which checkbox is marked?

3. PARAGRAPH 3 - PURCHASE DETAILS:
   Check which section is marked:
   - 3A: FINANCED (has purchase price and loan type)
   - 3C: CASH (has cash amount, no loan)

Return JSON with buyers, property_address, property_type, purchase_type, purchase_price, cash_amount, loan_type`
          },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img.toString('base64')}`, detail: "high" } }
        ]
      }],
      max_tokens: 600,
      temperature: 0.1
    });

    const content = response.choices[0].message.content || '{}';
    const result = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(result);
    } catch {
      return {};
    }
  }

  private async extractPage4(imagePath: string): Promise<Partial<ContractExtractionResult>> {
    const img = await fs.readFile(imagePath);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract financial terms from paragraphs 5-8:
PARAGRAPH 5 - Amounts and custom text
PARAGRAPH 6 - Appraisal option (A or B)
PARAGRAPH 7 - Earnest money (YES/NO)
PARAGRAPH 8 - Non-refundable deposit

Return JSON with all financial details`
          },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img.toString('base64')}`, detail: "high" } }
        ]
      }],
      max_tokens: 500,
      temperature: 0.1
    });

    const content = response.choices[0].message.content || '{}';
    const result = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(result);
    } catch {
      return {};
    }
  }

  private async extractPage5(imagePath: string): Promise<Partial<ContractExtractionResult>> {
    const img = await fs.readFile(imagePath);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract PARAGRAPH 10 - TITLE option (A, B, or C)`
          },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img.toString('base64')}`, detail: "high" } }
        ]
      }],
      max_tokens: 100,
      temperature: 0.1
    });

    const content = response.choices[0].message.content || '{}';
    const result = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(result);
    } catch {
      return {};
    }
  }

  private async extractPage6(imagePath: string): Promise<Partial<ContractExtractionResult>> {
    const img = await fs.readFile(imagePath);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract:
PARAGRAPH 11 - SURVEY option and details

PARAGRAPH 13 - FIXTURES:
1. FIRST BLANK: Items that CONVEY with property
2. SECOND BLANK: Items that DON'T convey

Return JSON with survey_option, survey_details, para13_items_included, para13_items_excluded`
          },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img.toString('base64')}`, detail: "high" } }
        ]
      }],
      max_tokens: 300,
      temperature: 0.1
    });

    const content = response.choices[0].message.content || '{}';
    const result = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(result);
    } catch {
      return {};
    }
  }

  private async extractPage7(imagePath: string): Promise<Partial<ContractExtractionResult>> {
    const img = await fs.readFile(imagePath);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract PARAGRAPH 14 - CONTINGENCY:
Which option is checked (A=No or B=Yes)?
If B, what is the contingency text?

Return JSON with contingency and contingency_details`
          },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img.toString('base64')}`, detail: "high" } }
        ]
      }],
      max_tokens: 200,
      temperature: 0.1
    });

    const content = response.choices[0].message.content || '{}';
    const result = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(result);
    } catch {
      return {};
    }
  }

  private async extractPage8(imagePath: string): Promise<Partial<ContractExtractionResult>> {
    const img = await fs.readFile(imagePath);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract:
PARAGRAPH 15 - HOME WARRANTY (YES/NO and details)
PARAGRAPH 16 - INSPECTION option (A, B, C, or D)

Return JSON with home_warranty, warranty_details, warranty_paid_by, inspection_option, inspection_details`
          },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img.toString('base64')}`, detail: "high" } }
        ]
      }],
      max_tokens: 300,
      temperature: 0.1
    });

    const content = response.choices[0].message.content || '{}';
    const result = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(result);
    } catch {
      return {};
    }
  }

  private async extractPages10to16(pagePaths: string[]): Promise<Partial<ContractExtractionResult>> {
    const results: any = {};

    // Page 10 - Wood/Termite
    if (pagePaths.length >= 10) {
      try {
        const img = await fs.readFile(pagePaths[9]);
        const resp = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: `Extract Para 18 Wood Infestation and Para 19 Termite options` },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img.toString('base64')}`, detail: "high" } }
            ]
          }],
          max_tokens: 100
        });
        Object.assign(results, JSON.parse(resp.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
      } catch {}
    }

    // Page 12 - Dates
    if (pagePaths.length >= 12) {
      try {
        const img = await fs.readFile(pagePaths[11]);
        const resp = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: `Extract contract date and closing date` },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img.toString('base64')}`, detail: "high" } }
            ]
          }],
          max_tokens: 150
        });
        Object.assign(results, JSON.parse(resp.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
      } catch {}
    }

    return results;
  }

  toCSV(data: ContractExtractionResult): string {
    const headers = [
      'Buyers', 'Property Address', 'Property Type', 'Purchase Type',
      'Purchase Price', 'Cash Amount', 'Loan Type',
      'Para 13 Items Included', 'Para 13 Items Excluded',
      'Contingency', 'Home Warranty', 'Closing Date'
    ];
    
    const values = [
      data.buyers?.join('; ') || '',
      data.property_address || '',
      data.property_type || '',
      data.purchase_type || '',
      data.purchase_price || '',
      data.cash_amount || '',
      data.loan_type || '',
      data.para13_items_included || '',
      data.para13_items_excluded || '',
      data.contingency || '',
      data.home_warranty || '',
      data.closing_date || ''
    ];
    
    return headers.join(',') + '\n' + values.map(v => `"${v}"`).join(',');
  }
}