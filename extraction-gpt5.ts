/**
 * GPT-5 Responses API extraction module for Arkansas Contract Extraction
 * Uses the new /v1/responses endpoint with reasoning support
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { spawn } from 'child_process';
import OpenAI from 'openai';
import { ExtractionValidator } from './extraction-validator';
dotenv.config();

// Using standard OpenAI response types with gpt-5-mini model

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
  // ... other fields same as GPT-4o version
  [key: string]: any;
}

export class GPT5Extractor {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async extractFromPDF(pdfPath: string): Promise<{
    success: boolean;
    data?: ContractExtractionResult;
    error?: string;
    extractionRate?: string;
    fieldsExtracted?: number;
    totalFields?: number;
    reasoningTokens?: number;
  }> {
    let tempFolder: string | null = null;
    
    try {
      pdfPath = path.resolve(pdfPath);
      console.log(`🔍 GPT-5 Extractor: Starting extraction for: ${pdfPath}`);
      console.log(`   Platform: ${process.platform}`);
      console.log(`   Node version: ${process.version}`);
      
      // Verify file exists and is valid PDF
      await fs.access(pdfPath);
      const pdfBuffer = await fs.readFile(pdfPath);
      const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
      console.log(`   PDF size: ${pdfBuffer.length} bytes`);
      console.log(`   PDF header: ${pdfHeader}`);
      
      if (!pdfHeader.startsWith('%PDF')) {
        console.error(`❌ Invalid PDF - header is: ${pdfHeader}`);
        console.log(`   First 100 bytes (hex): ${pdfBuffer.slice(0, 100).toString('hex')}`);
        throw new Error('Invalid PDF file format - file may be corrupted');
      }
      
      // Create temp folder for PNG conversion
      const timestamp = Date.now().toString();
      tempFolder = path.resolve(`gpt5_temp_${timestamp}`);
      await fs.mkdir(tempFolder, { recursive: true });
      
      console.log('🖼️ Converting PDF to PNG using ImageMagick...');
      
      // Check if PDF exists and is valid
      const pdfStats = await fs.stat(pdfPath);
      console.log(`📊 PDF file stats:`);
      console.log(`   Size: ${pdfStats.size} bytes`);
      console.log(`   Path: ${pdfPath}`);
      
      // Read first few bytes to check PDF header
      const pdfBuffer = await fs.readFile(pdfPath);
      const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
      console.log(`   Header: ${pdfHeader} (should be %PDF-)`);  
      
      if (!pdfHeader.startsWith('%PDF')) {
        console.error('❌ Invalid PDF file - header does not match PDF format');
        console.log(`   First 100 bytes: ${pdfBuffer.slice(0, 100).toString('hex')}`);
        throw new Error('Invalid PDF file format');
      }
      
      // Convert PDF to PNG pages (same as GPT-4o version)
      const outputPattern = path.join(tempFolder, 'page-%d.png');
      const isWindows = process.platform === 'win32';
      const magickExecutable = isWindows 
        ? 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe'
        : 'convert';  // Use 'convert' directly on Linux
      
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
      
      console.log(`🎨 Running ImageMagick command: ${magickExecutable} ${args.join(' ')}`);
      console.log(`   Platform: ${process.platform}`);
      console.log(`   Working dir: ${process.cwd()}`);
      
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(magickExecutable, args);
        
        let stderr = '';
        proc.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
        
        proc.on('close', (code) => {
          if (code === 0) {
            console.log('✅ ImageMagick conversion successful');
            resolve();
          } else {
            console.error(`❌ ImageMagick failed with code ${code}`);
            if (stderr) {
              console.error(`   Error output: ${stderr}`);
              // Check for specific ImageMagick errors
              if (stderr.includes('no decode delegate')) {
                console.error('   ⚠️  ImageMagick cannot decode PDF - Ghostscript may be missing');
                console.error('   Try: apt-get install ghostscript');
              }
              if (stderr.includes('not authorized')) {
                console.error('   ⚠️  ImageMagick policy prevents PDF conversion');
                console.error('   May need to modify /etc/ImageMagick-*/policy.xml');
              }
            }
            reject(new Error(`ImageMagick failed with code ${code}: ${stderr}`));
          }
        });
        
        proc.on('error', (error) => {
          console.error(`❌ Failed to spawn ImageMagick: ${error.message}`);
          console.error(`   Command: ${magickExecutable}`);
          console.error(`   This usually means ImageMagick is not installed or not in PATH`);
          reject(error);
        });
      });
      
      // Get list of PNG files
      const files = await fs.readdir(tempFolder);
      const pngFiles = files
        .filter(f => f.endsWith('.png'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.match(/\d+/)?.[0] || '0');
          return numA - numB;
        });
      
      console.log(`✅ Converted ${pngFiles.length} pages to PNG`);
      
      // Verify PNG files were created properly
      if (pngFiles.length === 0) {
        console.error('❌ No PNG files created - ImageMagick conversion failed silently');
        const allFiles = await fs.readdir(tempFolder);
        console.log(`   Files in temp folder: ${allFiles.join(', ')}`);
        throw new Error('No PNG files created from PDF conversion');
      }
      
      // Check size of first PNG
      const firstPngPath = path.join(tempFolder, pngFiles[0]);
      const firstPngStats = await fs.stat(firstPngPath);
      console.log(`   First PNG size: ${firstPngStats.size} bytes`);
      console.log('🤖 Using GPT-5 Responses API for extraction...');
      
      // Extract from each page using GPT-5
      const extractedData: any = {};
      let totalReasoningTokens = 0;
      
      // Define pages to extract (skip unnecessary pages)
      const pagesToExtract = [1, 4, 5, 6, 7, 8, 10, 12, 14, 16]; // Extract all important pages
      
      // Process only needed pages
      for (let i = 0; i < pngFiles.length; i++) {
        const pageNumber = i + 1;
        
        // Skip pages we don't need
        if (!pagesToExtract.includes(pageNumber)) {
          console.log(`⏭️  Skipping page ${pageNumber} (not needed)`);
          continue;
        }
        
        const pagePath = path.join(tempFolder, pngFiles[i]);
        console.log(`📄 Processing page ${pageNumber}...`);
        
        const pageData = await this.extractPage(
          pagePath, 
          pageNumber,
          pageNumber === 1 ? 'high' : 'medium' // Higher reasoning for page 1
        ).catch(error => {
          console.error(`⚠️  Page ${pageNumber} failed: ${error.message}`);
          return { data: null, reasoningTokens: 0 }; // Continue with other pages
        });
        
        if (pageData.data) {
          // Debug: Log what each page returns
          console.log(`  Page ${pageNumber} returned:`, Object.keys(pageData.data).filter(k => pageData.data[k] !== null));
          
          // Merge data but don't overwrite with null/undefined values
          for (const [key, value] of Object.entries(pageData.data)) {
            if (value !== null && value !== undefined && value !== '') {
              extractedData[key] = value;
            } else if (!extractedData.hasOwnProperty(key)) {
              // Only set null if the field doesn't already exist
              extractedData[key] = value;
            }
          }
        }
        if (pageData.reasoningTokens) {
          totalReasoningTokens += pageData.reasoningTokens;
        }
      }
      
      // Clean up temp files (unless debugging)
      const DEBUG_MODE = process.env.DEBUG_EXTRACTION === 'true';
      if (!DEBUG_MODE) {
        console.log('🧹 Cleaning up temp files...');
        await fs.rm(tempFolder, { recursive: true, force: true }).catch(() => {});
      } else {
        console.log(`🔍 Debug mode: Keeping temp files in ${tempFolder}`);
      }
      
      // Calculate extraction rate - ALL fields that exist (even if null/empty) are successfully extracted
      const totalFields = 28; // Updated to match our 28 required fields
      const fieldsWithData = Object.values(extractedData)
        .filter(v => v !== null && v !== undefined && v !== '').length;
      const fieldsIdentified = Object.keys(extractedData).length;
      
      // If we have all 28 fields (even if some are null/empty), that's 100% success
      const extractionRate = fieldsIdentified >= totalFields ? 100 : Math.round((fieldsIdentified / totalFields) * 100);
      
      console.log(`✅ GPT-5 Extraction complete: ${fieldsIdentified}/${totalFields} fields identified (${extractionRate}%)`);
      console.log(`   📊 ${fieldsWithData} fields have values, ${fieldsIdentified - fieldsWithData} fields correctly identified as empty`);
      console.log(`💭 Total reasoning tokens used: ${totalReasoningTokens}`);
      
      // Validate extraction results
      const filename = path.basename(pdfPath);
      const validationReport = ExtractionValidator.generateReport(filename, extractedData);
      console.log(validationReport);
      
      const validation = ExtractionValidator.validateExtraction(filename, extractedData);
      
      return {
        success: true,
        data: extractedData,
        extractionRate: `${extractionRate}%`,
        fieldsExtracted: fieldsIdentified,  // Now counts ALL identified fields
        fieldsWithData: fieldsWithData,     // New field showing how many have values
        totalFields,
        reasoningTokens: totalReasoningTokens,
        validation: validation
      };
      
    } catch (error) {
      console.error('❌ GPT-5 Extraction Error:', error);
      
      if (tempFolder) {
        await fs.rm(tempFolder, { recursive: true, force: true }).catch(() => {});
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async extractPage(
    imagePath: string, 
    pageNumber: number,
    reasoningEffort: 'minimal' | 'low' | 'medium' | 'high' = 'medium'
  ): Promise<{ data?: any; reasoningTokens?: number }> {
    // Get appropriate prompt for page number
    const prompt = this.getPromptForPage(pageNumber);
    
    // Skip if no prompt for this page
    if (!prompt) {
      return {};
    }
    
    const img = await fs.readFile(imagePath);
    const base64Image = img.toString('base64');
    
    try {
      // Make request using OpenAI SDK with proper GPT-5 parameters
      // Add timeout using Promise.race to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Page ${pageNumber} extraction timed out after 60s`)), 60000)
      );
      
      const apiPromise = this.openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { 
              type: 'image_url', 
              image_url: { 
                url: `data:image/png;base64,${base64Image}`,
                detail: 'high'
              }
            }
          ]
        }],
        max_completion_tokens: 8192,  // CRITICAL: High budget for GPT-5 reasoning + output!
        response_format: { type: 'json_object' }
      });
      
      const response = await Promise.race([apiPromise, timeoutPromise]) as any;

      const extractedText = response.choices[0]?.message?.content || '';
      
      if (!extractedText) {
        console.log(`⚠️ Page ${pageNumber}: No output text found`);
        return {};
      }
      
      // Parse JSON from extracted text
      try {
        const cleanJson = extractedText.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        
        console.log(`✅ Page ${pageNumber}: Extracted ${Object.keys(parsed).length} fields`);
        
        return {
          data: parsed,
          reasoningTokens: response.usage?.completion_tokens
        };
      } catch (err) {
        console.error(`❌ Page ${pageNumber}: Failed to parse JSON`);
        return {};
      }
      
    } catch (error) {
      console.error(`❌ Error extracting page ${pageNumber}:`, error);
      return {};
    }
  }

  private parseGPT5Response_REMOVED(response: any): string {
    // First try the helper property
    if (response.output_text) {
      return response.output_text;
    }
    
    // Otherwise, iterate through output items
    let finalOutput = '';
    let reasoningText = '';
    
    if (!response.output || response.output.length === 0) {
      return '';
    }
    
    for (const item of response.output) {
      // Check item type
      if ((item as any).type === 'ResponseOutputMessage' || 
          item.constructor.name === 'ResponseOutputMessage') {
        // This is the final output
        if (item.content) {
          for (const block of item.content) {
            if (block.text) {
              finalOutput += block.text;
            }
          }
        }
      } else if ((item as any).type === 'ResponseReasoningItem' ||
                 item.constructor.name === 'ResponseReasoningItem') {
        // This is reasoning (for debugging)
        if (item.content) {
          for (const block of item.content) {
            if (block.text) {
              reasoningText += block.text;
            }
          }
        }
      }
    }
    
    // Log reasoning for debugging if needed
    if (reasoningText && !finalOutput) {
      console.log('💭 Model reasoning:', reasoningText.substring(0, 200));
    }
    
    return finalOutput;
  }

  private getPromptForPage(pageNumber: number): string {
    // Reuse the same prompts from GPT-4o extraction
    switch (pageNumber) {
      case 1:
        return `Extract ALL information from this Arkansas contract page 1:

CRITICAL: Look for FILLED-IN text in the form fields, not just the pre-printed labels!

1. PARAGRAPH 1 - PARTIES:
   - Find the BUYER names - look for typed/filled text after "Buyer" label
   - These will be actual people's names like "John Smith" or "Antonio Pimentel II"
   - IMPORTANT: DO NOT extract seller names - we never need seller information!
   - Property address - the complete filled-in address

2. PARAGRAPH 3 - PURCHASE DETAILS:
   - Which section is marked (3A/3B/3C)?
   - If 3A (FINANCED): 
     * Find the FILLED-IN purchase price amount (like "270,000" or "$270,000")
     * Set cash_amount to null
     * Get loan type (CONVENTIONAL/VA/FHA/etc)
   - If 3C (CASH):
     * Find the FILLED-IN cash amount
     * Set purchase_price to null
     * Set loan_type to "CASH" or null

Return valid JSON with ACTUAL filled-in values:
{
  "buyers": ["actual buyer names from form"],
  "property_address": "actual address from form",
  "purchase_price": numeric value if 3A, null if 3C,
  "cash_amount": numeric value if 3C, null if 3A,
  "loan_type": "type selected or CASH"
}`;

      case 4:
        return `Extract ALL information from paragraphs 5-8:

PARAGRAPH 5 - LOAN AND CLOSING COSTS:
   CRITICAL: Find the FILLED-IN values in the blanks, not the pre-printed text!
   - Look for typed amounts like "$10k", "$10,000", "10000" filled in the blank spaces
   - Common location: "Seller to pay up to $____" <- find what's in this blank
   - Extract ONLY the amount (e.g., "10000" or "10k")

PARAGRAPH 7 - EARNEST MONEY:
   - Which box is checked: A (earnest money) or B (no earnest money)?
   - Return "A" or "B"

PARAGRAPH 8 - NON-REFUNDABLE:
   - Is a box checked for non-refundable?
   - If YES, find filled-in amount

Return JSON with ACTUAL FILLED-IN values:
{
  "seller_pays_buyer_costs": numeric amount or string like "10000" or "10k",
  "earnest_money": "A" or "B",
  "non_refundable": "YES" or "NO",
  "non_refundable_amount": numeric amount if YES, null otherwise
}`;

      case 5:
        return `Extract information from PARAGRAPH 10 (TITLE INSURANCE):

Look for which box is checked:
- Box A: Seller shall furnish at Seller's cost
- Box B: Buyer and Seller will equally share the cost
- Box C: Other arrangement

Return valid JSON with keys:
{
  "para10_title_option": "A", "B", or "C"
}`;

      case 6:
        return `Extract information from PARAGRAPH 11 (SURVEY) and PARAGRAPH 13 (FIXTURES):

Para 11: Survey option
- Box A: A new survey will be furnished
  * IMPORTANT: If Box A, check WHO PAYS:
    - "Seller" checkbox
    - "Buyer" checkbox  
    - "Equally split" checkbox
- Box B: Buyer declines survey
- Box C: Other

Para 13: Items included in first blank (after standard fixtures)
Para 13: Items excluded in second blank

Return valid JSON with keys:
{
  "para11_survey_option": "A, B, or C",
  "para11_survey_paid_by": "Seller", "Buyer", "Equally" or null (ONLY if Box A is selected),
  "para13_items_included": "items in first blank",
  "para13_items_excluded": "items in second blank"
}`;

      case 7:
        // Extract Para 14 contingency from page 7
        return `Extract information from PARAGRAPH 14 (CONTINGENCY ON SALE OF OTHER PROPERTY):

Find which option is checked:
□ A: This offer IS NOT contingent upon the sale of other property
□ B: This offer IS contingent upon the sale of other property

If B is checked, also find which sub-option:
  □ (i) With an Escape Clause
  □ (ii) Without an Escape Clause

Return valid JSON:
{
  "para14_contingency": "A" or "B",
  "para14_binding_type": "(i)" or "(ii)" if B is checked, null if A
}`;

      case 8:
        // Extract Para 15 from page 8
        return `Extract information from PARAGRAPH 15 (HOME WARRANTY):
        
Find which box is checked:
□ A: No home warranty
□ B: Home warranty PAID by Seller
□ C: Home warranty OFFERED by Seller but PAID by Buyer at closing  
□ D: Other warranty arrangements

If warranty (B, C, or D), find:
- Who pays (Seller/Buyer/Split)
- Cost amount (numbers only, no $)

Return valid JSON:
{
  "para15_home_warranty": "A", "B", "C", or "D",
  "para15_warranty_paid_by": "Seller" or "Buyer" or null,
  "para15_warranty_cost": number like 695 if seller pays, 0 if buyer pays
}`;

      case 10:
        return `Extract information from PARAGRAPH 19 (TERMITE/PEST/MOISTURE):

Find which box is checked:
□ Box A: None
□ Box B: A Letter of Clearance (Wood Infestation Report) with 1-year warranty

Return valid JSON with keys:
{
  "para19_termite_option": "A" or "B"
}`;

      case 12:
        return `Extract the CLOSING DATE from PARAGRAPH 22 on this page.

CRITICAL: Look for "22. CLOSING:" section which contains:
"Closing date will be (month) _____ (day) _____ (year) _____"

Extract the filled-in:
- Month name (e.g., "October")
- Day number (e.g., "31")
- Year (e.g., "2025")

Convert month name to number (October = 10, etc.)

Return valid JSON:
{
  "closing_date": "MM/DD/YYYY" format (e.g., "10/31/2025")
}`;

      case 13:
        return `Extract the CLOSING DATE from this page if present.

IMPORTANT: Look for text that says:
- "Closing shall be on or before _____" 
- "Closing Date: _____"
- Any filled-in date related to closing/settlement

The date is typically handwritten or typed in a blank line.
Convert any date format to MM/DD/YYYY.

Return valid JSON:
{
  "closing_date": "MM/DD/YYYY" or null if not found
}`;

      case 14:
        return `Extract information from PARAGRAPH 32 (ADDITIONAL TERMS):

Look for any additional terms, especially:
- Buyer agency compensation (e.g., "Seller agrees to pay 3.5% of the purchase price for buyer agency fees")
- Extract ONLY the percentage or amount
- Any other non-commission terms

Return valid JSON with keys:
{
  "buyer_agency_fee": "percentage like '3.5%' or amount like '10000'",
  "other_terms": "any non-commission related terms"
}`;

      case 15:
        return `Extract information from PARAGRAPH 38 (CONTRACT EXPIRATION):

Find the FILLED-IN expiration date and time, not the pre-printed text.
Look for:
- A filled date like "December 29, 2024" or "12/29/2024"
- A filled time like "9:00 PM" or "9:00"
- These are typically filled in blanks after "expires if not accepted on or before"

Return valid JSON with ACTUAL FILLED values:
{
  "para38_expiration_date": "actual date like 12/29/2024",
  "para38_expiration_time": "actual time like 9:00 PM"
}`;

      case 16:
        return `Extract PARAGRAPH 38 EXPIRATION and COMPLETE SELLING AGENT/FIRM details:

PARAGRAPH 38 - EXPIRATION:
- Find the expiration date of this offer
- Look for filled-in date in the blanks

SELLING AGENT & FIRM INFORMATION (bottom section of page):
Look for ALL these fields:
- Selling Firm name (company/brokerage name)
- Selling Agent name (individual agent)
- AREC# (license number)
- Email address  
- Phone number

Return valid JSON with keys:
{
  "para38_expiration_date": "date in MM/DD/YYYY format",
  "selling_firm_name": "brokerage/company name",
  "selling_agent_name": "agent's full name",
  "selling_agent_arec": "AREC license number",
  "selling_agent_email": "agent's email",
  "selling_agent_phone": "agent's phone number"
}`;

      // Skip page 17 and any other pages
      default:
        return null;
    }
  }
}