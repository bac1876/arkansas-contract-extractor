/**
 * ImageMagick-based extraction module for Arkansas Contract Extraction
 * This will work perfectly once ImageMagick is installed
 * Uses GPT-4 Vision API for all extraction
 */

import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { spawn } from 'child_process';
dotenv.config();

export interface ContractExtractionResult {
  buyers: string[];
  sellers: string[];
  property_address: string;
  property_type: string;
  purchase_type: 'FINANCED' | 'CASH' | 'LOAN_ASSUMPTION';
  para3_option_checked: string;
  purchase_price: number | null;
  cash_amount: number | null;
  loan_type: string | null;
  para5_amounts: string[];
  para5_custom_text: string;
  seller_concessions: string;
  appraisal_option: string;
  appraisal_details: string;
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
  // Page 3 Agency fields
  agency_option: string;
  agency_type: string;
}

export class ImageMagickExtractor {
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
      // Normalize the path to handle case inconsistencies on Windows
      pdfPath = path.resolve(pdfPath);
      console.log(`🔍 ImageMagick Extractor: Starting extraction for: ${pdfPath}`);
      
      // Verify the file exists - handle case sensitivity issues
      try {
        await fs.access(pdfPath);
      } catch (err) {
        // Try different case variations
        const variations = [
          pdfPath.replace(/claude code projects/i, 'Claude Code Projects'),
          pdfPath.replace(/claude code projects/i, 'claude code projects'),
          pdfPath.replace(/smthosexp/i, 'SmthosExp'),
          pdfPath.replace(/smthosexp/i, 'smthosexp')
        ];
        
        let found = false;
        for (const variant of variations) {
          try {
            await fs.access(variant);
            pdfPath = variant;
            console.log(`📝 Using path variant: ${pdfPath}`);
            found = true;
            break;
          } catch {
            // Continue trying
          }
        }
        
        if (!found) {
          throw new Error(`PDF file not found. Tried: ${pdfPath} and ${variations.length} variations`);
        }
      }
      
      // Create temp folder
      const timestamp = Date.now().toString();
      tempFolder = path.resolve(`magick_temp_${timestamp}`);
      await fs.mkdir(tempFolder, { recursive: true });
      
      console.log(`📁 Created temp folder: ${tempFolder}`);
      console.log('🖼️ Converting PDF to PNG using ImageMagick...');
      
      // Use ImageMagick to convert PDF to PNG at 300 DPI (recommended for OCR/Vision)
      const outputPattern = path.join(tempFolder, 'page-%d.png');
      
      // Detect OS and use appropriate command
      const isWindows = process.platform === 'win32';
      
      // Use spawn to avoid cmd /c wrapper issues on Windows
      const magickExecutable = isWindows 
        ? 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe'
        : 'magick';
      
      // Use parameters that work with GPT-4o vision
      // CRITICAL: Must remove alpha and use white background for proper rendering
      const args = isWindows ? [
        'convert',                    // Use convert command for proper rendering
        '-density', '150',            // 150 DPI works well
        pdfPath,
        '-alpha', 'remove',           // Remove alpha channel - CRITICAL!
        '-background', 'white',        // White background
        '-resize', '1224x1584',        // Resize to standard dimensions
        '-depth', '8',                 // 8-bit depth
        outputPattern
      ] : [
        // Linux/Unix version
        '-density', '150',
        pdfPath,
        '-alpha', 'remove',
        '-background', 'white',
        '-resize', '1224x1584',
        '-depth', '8',
        outputPattern
      ];
      
      console.log('Running ImageMagick:', magickExecutable);
      console.log('With args:', args);
      console.log('PDF exists at:', pdfPath, '?', require('fs').existsSync(pdfPath));
      
      // Run ImageMagick using spawn
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(magickExecutable, args);
        
        let stderr = '';
        proc.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        proc.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`ImageMagick failed with code ${code}: ${stderr}`));
          }
        });
        
        proc.on('error', (err) => {
          reject(new Error(`Failed to spawn ImageMagick: ${err.message}`));
        });
      });
      
      // Get list of generated PNG files
      const files = await fs.readdir(tempFolder);
      // Sort files numerically, not alphabetically!
      const pngFiles = files
        .filter(f => f.endsWith('.png'))
        .sort((a, b) => {
          // Extract number from filename (page-0.png -> 0)
          const numA = parseInt(a.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.match(/\d+/)?.[0] || '0');
          return numA - numB;
        });
      
      console.log(`✅ Converted ${pngFiles.length} pages to PNG`);
      
      // Extract from each page using GPT-4 Vision API
      const extractedData: any = {};
      
      // Page 1 - Parties, Property, Purchase
      if (pngFiles.length >= 1) {
        console.log('📄 Extracting Page 1 - Parties & Property...');
        const page1Path = path.join(tempFolder, pngFiles[0]);
        const page1Data = await this.extractPage1(page1Path);
        Object.assign(extractedData, page1Data);
      }
      
      // Page 3 - Agency (MISSING FROM ORIGINAL!)
      if (pngFiles.length >= 3) {
        console.log('📄 Extracting Page 3 - Agency...');
        const page3Path = path.join(tempFolder, pngFiles[2]);
        const page3Data = await this.extractPage3(page3Path);
        Object.assign(extractedData, page3Data);
      }
      
      // Page 4 - Financial Terms
      if (pngFiles.length >= 4) {
        console.log('📄 Extracting Page 4 - Financial Terms...');
        const page4Path = path.join(tempFolder, pngFiles[3]);
        const page4Data = await this.extractPage4(page4Path);
        Object.assign(extractedData, page4Data);
      }
      
      // Page 5 - Title
      if (pngFiles.length >= 5) {
        console.log('📄 Extracting Page 5 - Title...');
        const page5Path = path.join(tempFolder, pngFiles[4]);
        const page5Data = await this.extractPage5(page5Path);
        Object.assign(extractedData, page5Data);
      }
      
      // Page 6 - Survey AND Para 13
      if (pngFiles.length >= 6) {
        console.log('📄 Extracting Page 6 - Survey & Para 13...');
        const page6Path = path.join(tempFolder, pngFiles[5]);
        const page6Data = await this.extractPage6(page6Path);
        Object.assign(extractedData, page6Data);
      }
      
      // Page 7 - Contingencies
      if (pngFiles.length >= 7) {
        console.log('📄 Extracting Page 7 - Contingencies...');
        const page7Path = path.join(tempFolder, pngFiles[6]);
        const page7Data = await this.extractPage7(page7Path);
        Object.assign(extractedData, page7Data);
      }
      
      // Page 8 - Warranty & Inspection
      if (pngFiles.length >= 8) {
        console.log('📄 Extracting Page 8 - Warranty & Inspection...');
        const page8Path = path.join(tempFolder, pngFiles[7]);
        const page8Data = await this.extractPage8(page8Path);
        Object.assign(extractedData, page8Data);
      }
      
      // Pages 10-16 - Remaining terms (COMPREHENSIVE)
      if (pngFiles.length >= 10) {
        console.log('📄 Extracting Pages 10-16 - All Remaining Terms...');
        const otherData = await this.extractPages10to16(tempFolder, pngFiles);
        Object.assign(extractedData, otherData);
      }
      
      // Clean up temp files
      console.log('🧹 Cleaning up temp files...');
      await fs.rm(tempFolder, { recursive: true, force: true }).catch(err => {
        console.warn('⚠️ Could not clean up temp folder:', err.message);
      });
      
      // Calculate extraction rate - match original system  
      const totalFields = 41; // Same as original working system
      const fieldsExtracted = Object.values(extractedData).filter(v => v !== null && v !== undefined && v !== '').length;
      const extractionRate = Math.round((fieldsExtracted / totalFields) * 100);
      
      console.log(`✅ Extraction complete: ${fieldsExtracted}/${totalFields} fields (${extractionRate}%)`);
      
      // Log key fields to verify extraction
      console.log('🔑 Key Fields Extracted:');
      console.log('  - Buyers:', extractedData.buyers || 'NOT FOUND');
      console.log('  - Property:', extractedData.property_address || 'NOT FOUND');
      console.log('  - Purchase Type:', extractedData.purchase_type || 'NOT FOUND');
      console.log('  - Amount:', extractedData.cash_amount || extractedData.purchase_price || 'NOT FOUND');
      
      return {
        success: true,
        data: extractedData as ContractExtractionResult,
        extractionRate: `${extractionRate}%`,
        fieldsExtracted,
        totalFields
      };
      
    } catch (error) {
      console.error('❌ Extraction Error:', error);
      
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

  // GPT-4 Vision API extraction methods - same as before but with real images!
  private async extractPage1(imagePath: string): Promise<Partial<ContractExtractionResult>> {
    const img = await fs.readFile(imagePath);
    
    console.log('📸 Processing Page 1 image:', imagePath);
    console.log('📏 Image size:', img.length, 'bytes');
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",  // GPT-5 returns empty responses, using GPT-4o
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract ALL information from this Arkansas contract page 1:

1. PARAGRAPH 1 - PARTIES:
   - All buyer names (full names)
   - All seller names if visible
   - Property address (complete)

2. PARAGRAPH 2 - PROPERTY TYPE:
   - Which checkbox is marked? (Single family detached, One-to-four attached, Manufactured/Mobile, Condo/Town, Builder Owned)

3. PARAGRAPH 3 - PURCHASE DETAILS:
   CRITICAL: Check which section is marked:
   - 3A: "PURCHASE PURSUANT TO NEW FINANCING" (has purchase price and loan type)
   - 3B: "PURCHASE PURSUANT TO LOAN ASSUMPTION"
   - 3C: "PURCHASE PURSUANT TO CASH" (has cash amount, no loan)
   
   If 3A is checked, extract:
   - Purchase price amount (number after $ sign)
   - Loan type (CONVENTIONAL/VA/FHA/USDA-RD/OTHER)
   
   If 3C is checked, extract:
   - Cash amount (number after "exact sum of $")
   - Note: loan_type should be "CASH" or null

Return JSON:
{
  "buyers": ["name1", "name2"],
  "sellers": ["names"] or [],
  "property_address": "full address",
  "property_type": "exact type selected",
  "purchase_type": "FINANCED" or "CASH" or "LOAN_ASSUMPTION",
  "para3_option_checked": "3A" or "3B" or "3C",
  "purchase_price": number (if 3A),
  "cash_amount": number (if 3C),
  "loan_type": "FHA/VA/CONVENTIONAL/USDA-RD/OTHER/CASH" or null
}`
          },
          { type: "image_url", image_url: { url: `data:image/png;base64,${img.toString('base64')}`, detail: "high" } }
        ]
      }],
      max_tokens: 600,
      temperature: 0.1
    });

    const content = response.choices[0].message.content || '{}';
    console.log('🔍 GPT-4o Page 1 Raw Response:', content.substring(0, 500)); // Log first 500 chars
    console.log('📊 Full Page 1 Response Length:', content.length, 'characters');
    
    const result = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    try {
      const parsed = JSON.parse(result);
      console.log('✅ Parsed Page 1 Data:', JSON.stringify(parsed, null, 2));
      
      // Alert if we see test data
      if (parsed.buyers && parsed.buyers.includes('John Doe')) {
        console.error('⚠️ WARNING: Test data detected! This should be real extraction!');
      }
      return parsed;
    } catch (err) {
      console.error('❌ Failed to parse Page 1 response:', err);
      console.error('Raw content:', content);
      return {};
    }
  }

  private async extractPage3(imagePath: string): Promise<Partial<ContractExtractionResult>> {
    const img = await fs.readFile(imagePath);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",  // GPT-5 returns empty responses, using GPT-4o
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract PARAGRAPH 4 - AGENCY information:
Which option is checked (look for X or filled checkbox):
A. LISTING FIRM AND SELLING FIRM REPRESENT SELLER
B. LISTING FIRM REPRESENTS SELLER AND SELLING FIRM REPRESENTS BUYER
C. LISTING FIRM AND SELLING FIRM REPRESENT BOTH BUYER AND SELLER
D. Other arrangement

Return JSON:
{
  "agency_option": "A" or "B" or "C" or "D",
  "agency_type": "description of what this means"
}`
          },
          { type: "image_url", image_url: { url: `data:image/png;base64,${img.toString('base64')}`, detail: "high" } }
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

  private async extractPage4(imagePath: string): Promise<Partial<ContractExtractionResult>> {
    const img = await fs.readFile(imagePath);
    console.log('📸 Processing Page 4 image:', imagePath);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",  // GPT-5 returns empty responses, using GPT-4o
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract ALL information from paragraphs 5-8:

PARAGRAPH 5 - LOAN AND CLOSING COSTS:
- Any dollar amounts in blanks
- Any custom text about seller paying costs
- Complete text from all filled blanks

PARAGRAPH 6 - APPRAISAL:
- Which option is checked (A or B)?
- A: Property must appraise OR Buyer pays difference
- B: Property MUST appraise for purchase price

PARAGRAPH 7 - EARNEST MONEY:
- Is there earnest money? (A. Yes or B. No)
- If Yes, what is the AMOUNT? (look for $ amount after "in the amount of $")
- WHO holds it? (look for "held by" or broker/title company name)
- NOTE: If it says "see Earnest Money Addendum", return amount and holder as null

PARAGRAPH 8 - NON-REFUNDABLE DEPOSIT:
- Which option is checked?
- A: "The Deposit is not applicable" (means NO non-refundable deposit)
- B: "Buyer will pay to Seller the Deposit" (means YES, look for amount and timing)
- If B is checked, what AMOUNT and WHEN?

Return JSON:
{
  "para5_amounts": ["all amounts found"],
  "para5_custom_text": "complete custom text",
  "seller_concessions": "seller pays text if any",
  "appraisal_option": "A" or "B",
  "appraisal_details": "what the option means",
  "earnest_money": "YES" or "NO",
  "earnest_money_amount": number or null,
  "earnest_money_held_by": "holder name" or null,
  "earnest_money_addendum": true or false,
  "non_refundable": "YES" or "NO",
  "non_refundable_amount": number or null,
  "non_refundable_when": "when it becomes non-refundable" or null
}`
          },
          { type: "image_url", image_url: { url: `data:image/png;base64,${img.toString('base64')}`, detail: "high" } }
        ]
      }],
      max_tokens: 500,
      temperature: 0.1
    });

    const content = response.choices[0].message.content || '{}';
    console.log('🔍 Page 4 Raw Response:', content.substring(0, 200));
    const result = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    try {
      const parsed = JSON.parse(result);
      console.log('✅ Page 4 Parsed:', Object.keys(parsed).length, 'fields');
      return parsed;
    } catch (err) {
      console.error('❌ Page 4 Parse Error:', err.message);
      console.error('Raw content:', content.substring(0, 200));
      return {};
    }
  }

  private async extractPage5(imagePath: string): Promise<Partial<ContractExtractionResult>> {
    const img = await fs.readFile(imagePath);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",  // GPT-5 returns empty responses, using GPT-4o
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract PARAGRAPH 10 - TITLE option (A, B, or C)

Return JSON with title_option`
          },
          { type: "image_url", image_url: { url: `data:image/png;base64,${img.toString('base64')}`, detail: "high" } }
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
      model: "gpt-4o",  // GPT-5 returns empty responses, using GPT-4o
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract information from this page:

PARAGRAPH 11 - SURVEY:
- Who pays for survey or what is written?
- Look for checkboxes: A (Buyer), B (Seller), C (Split)
- Or text like "Buyer declines survey"

PARAGRAPH 13 - FIXTURES AND ATTACHED EQUIPMENT:
IMPORTANT: There are TWO blanks to fill:
1. FIRST BLANK (after the list of standard fixtures like "garage door openers..."): Look for handwritten text showing items that CONVEY/are INCLUDED with the property
2. SECOND BLANK (after "Buyer is aware the following items are not owned by Seller or do not convey with the Property:"): Look for handwritten text showing items that DO NOT convey/are EXCLUDED

Look for any handwritten or typed text in these blanks (like "fridge" or "curtains").

Return JSON:
{
  "survey_option": "A" or "B" or "C" or "text",
  "survey_details": "exact text if custom or decline",
  "para13_items_included": "items in first blank that convey" or null,
  "para13_items_excluded": "items in second blank that don't convey" or null
}`
          },
          { type: "image_url", image_url: { url: `data:image/png;base64,${img.toString('base64')}`, detail: "high" } }
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
      model: "gpt-4o",  // GPT-5 returns empty responses, using GPT-4o
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract PARAGRAPH 14 - CONTINGENCY:
Which option is checked (A=No or B=Yes)?
If B, what is the contingency text?

Look carefully at which option is checked:
- Option A means NO contingency
- Option B means YES contingency (look for details in the blank)

Return JSON:
{
  "contingency": "YES" or "NO",
  "contingency_details": "text from blank" or null
}`
          },
          { type: "image_url", image_url: { url: `data:image/png;base64,${img.toString('base64')}`, detail: "high" } }
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
      model: "gpt-4o",  // GPT-5 returns empty responses, using GPT-4o
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract:
PARAGRAPH 15 - HOME WARRANTY (YES/NO and details)
PARAGRAPH 16 - INSPECTION option (A, B, C, or D)

Return JSON:
{
  "home_warranty": "YES" or "NO",
  "warranty_details": "any warranty details",
  "warranty_paid_by": "who pays (Buyer/Seller/Split)" or null,
  "inspection_option": "A" or "B" or "C" or "D",
  "inspection_details": "details about inspection terms"
}`
          },
          { type: "image_url", image_url: { url: `data:image/png;base64,${img.toString('base64')}`, detail: "high" } }
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

  private async extractPages10to16(tempFolder: string, pngFiles: string[]): Promise<Partial<ContractExtractionResult>> {
    const results: any = {};

    // Page 10 - Wood/Termite
    if (pngFiles.length >= 10) {
      try {
        console.log('  📄 Processing Page 10 - Wood/Termite...');
        const page10Path = path.join(tempFolder, pngFiles[9]);
        const img = await fs.readFile(page10Path);
        const resp = await this.openai.chat.completions.create({
          model: "gpt-4o",  // Using GPT-4o for vision tasks
          messages: [{
            role: "user",
            content: [
              { type: "text", text: `Extract Para 18 Wood Infestation (A/B/C/D) and Para 19 Termite (A/B/C). Return: {"wood_infestation": "letter", "termite_option": "letter"}` },
              { type: "image_url", image_url: { url: `data:image/png;base64,${img.toString('base64')}`, detail: "high" } }
            ]
          }],
          max_tokens: 100
        });
        Object.assign(results, JSON.parse(resp.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
      } catch (e) { console.log('  ⚠️ Page 10 error:', e instanceof Error ? e.message : 'Unknown'); }
    }

    // Page 11 - Lead Paint (MISSING!)
    if (pngFiles.length >= 11) {
      try {
        console.log('  📄 Processing Page 11 - Lead Paint...');
        const page11Path = path.join(tempFolder, pngFiles[10]);
        const img = await fs.readFile(page11Path);
        const resp = await this.openai.chat.completions.create({
          model: "gpt-4o",  // Using GPT-4o for vision tasks
          messages: [{
            role: "user",
            content: [
              { type: "text", text: `Extract Para 20 Lead Paint option (A=not pre-1978, B=10-day inspection, C=waive, D=other). Return: {"lead_paint_option": "letter"}` },
              { type: "image_url", image_url: { url: `data:image/png;base64,${img.toString('base64')}`, detail: "high" } }
            ]
          }],
          max_tokens: 100
        });
        Object.assign(results, JSON.parse(resp.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
      } catch (e) { console.log('  ⚠️ Page 11 error:', e instanceof Error ? e.message : 'Unknown'); }
    }

    // Page 12 - Contract Date AND Closing Date
    if (pngFiles.length >= 12) {
      try {
        console.log('  📄 Processing Page 12 - Dates...');
        const page12Path = path.join(tempFolder, pngFiles[11]);
        const img = await fs.readFile(page12Path);
        const resp = await this.openai.chat.completions.create({
          model: "gpt-4o",  // Using GPT-4o for vision tasks
          messages: [{
            role: "user",
            content: [
              { type: "text", text: `Extract from this page:
1. Paragraph 22 - Contract date (look for date after "executed this")  
2. CLOSING DATE - Look for "Closing shall be on or before" followed by a date
Return: {"contract_date": "date", "closing_date": "date"}` },
              { type: "image_url", image_url: { url: `data:image/png;base64,${img.toString('base64')}`, detail: "high" } }
            ]
          }],
          max_tokens: 150
        });
        Object.assign(results, JSON.parse(resp.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
      } catch (e) { console.log('  ⚠️ Page 12 error:', e instanceof Error ? e.message : 'Unknown'); }
    }

    // Page 13 - Possession
    if (pngFiles.length >= 13) {
      try {
        console.log('  📄 Processing Page 13 - Possession...');
        const page13Path = path.join(tempFolder, pngFiles[12]);
        const img = await fs.readFile(page13Path);
        const resp = await this.openai.chat.completions.create({
          model: "gpt-4o",  // Using GPT-4o for vision tasks
          messages: [{
            role: "user",
            content: [
              { type: "text", text: `Extract Paragraph 23 - POSSESSION details. Look for which option is checked and any possession details. Return: {"possession_option": "letter", "possession_details": "text"}` },
              { type: "image_url", image_url: { url: `data:image/png;base64,${img.toString('base64')}`, detail: "high" } }
            ]
          }],
          max_tokens: 200
        });
        Object.assign(results, JSON.parse(resp.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
      } catch (e) { console.log('  ⚠️ Page 13 error:', e instanceof Error ? e.message : 'Unknown'); }
    }

    // Page 14 - Additional Terms
    if (pngFiles.length >= 14) {
      try {
        console.log('  📄 Processing Page 14 - Additional Terms...');
        const page14Path = path.join(tempFolder, pngFiles[13]);
        const img = await fs.readFile(page14Path);
        const resp = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: `Extract any additional terms and look for serial number at bottom of page. Return: {"additional_terms": "text", "serial_number": "number"}` },
              { type: "image_url", image_url: { url: `data:image/png;base64,${img.toString('base64')}`, detail: "high" } }
            ]
          }],
          max_tokens: 300
        });
        Object.assign(results, JSON.parse(resp.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
      } catch (e) { console.log('  ⚠️ Page 14 error:', e instanceof Error ? e.message : 'Unknown'); }
    }

    // Page 15 - Para 37 (License Disclosure)
    if (pngFiles.length >= 15) {
      try {
        console.log('  📄 Processing Page 15 - Para 37...');
        const page15Path = path.join(tempFolder, pngFiles[14]);
        const img = await fs.readFile(page15Path);
        const resp = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: `Look for PARAGRAPH 37 - Which option is checked (A, B, C, or D)? Return: {"para37_option": "letter"}` },
              { type: "image_url", image_url: { url: `data:image/png;base64,${img.toString('base64')}`, detail: "high" } }
            ]
          }],
          max_tokens: 100
        });
        Object.assign(results, JSON.parse(resp.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
      } catch (e) { console.log('  ⚠️ Page 15 error:', e instanceof Error ? e.message : 'Unknown'); }
    }

    // Page 16 - Acceptance Date (Signatures)
    if (pngFiles.length >= 16) {
      try {
        console.log('  📄 Processing Page 16 - Acceptance/Signatures...');
        const page16Path = path.join(tempFolder, pngFiles[15]);
        const img = await fs.readFile(page16Path);
        const resp = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: `Look for any signatures with dates. Find the earliest date which is the acceptance date. Return: {"acceptance_date": "date found"}` },
              { type: "image_url", image_url: { url: `data:image/png;base64,${img.toString('base64')}`, detail: "high" } }
            ]
          }],
          max_tokens: 100
        });
        Object.assign(results, JSON.parse(resp.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
      } catch (e) { console.log('  ⚠️ Page 16 error:', e instanceof Error ? e.message : 'Unknown'); }
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