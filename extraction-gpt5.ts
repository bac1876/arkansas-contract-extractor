/**
 * GPT-5 Responses API extraction module for Arkansas Contract Extraction
 * Uses the new /v1/responses endpoint with reasoning support
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { spawn } from 'child_process';
import OpenAI from 'openai';
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
      
      // Verify file exists
      await fs.access(pdfPath);
      
      // Create temp folder for PNG conversion
      const timestamp = Date.now().toString();
      tempFolder = path.resolve(`gpt5_temp_${timestamp}`);
      await fs.mkdir(tempFolder, { recursive: true });
      
      console.log('🖼️ Converting PDF to PNG using ImageMagick...');
      
      // Convert PDF to PNG pages (same as GPT-4o version)
      const outputPattern = path.join(tempFolder, 'page-%d.png');
      const isWindows = process.platform === 'win32';
      const magickExecutable = isWindows 
        ? 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe'
        : 'magick';
      
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
      
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(magickExecutable, args);
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`ImageMagick failed with code ${code}`));
        });
        proc.on('error', reject);
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
      console.log('🤖 Using GPT-5 Responses API for extraction...');
      
      // Extract from each page using GPT-5
      const extractedData: any = {};
      let totalReasoningTokens = 0;
      
      // Process each page
      for (let i = 0; i < pngFiles.length; i++) {
        const pagePath = path.join(tempFolder, pngFiles[i]);
        console.log(`📄 Processing page ${i + 1}...`);
        
        const pageData = await this.extractPage(
          pagePath, 
          i + 1,
          i === 0 ? 'high' : 'medium' // Higher reasoning for page 1
        );
        
        if (pageData.data) {
          Object.assign(extractedData, pageData.data);
        }
        if (pageData.reasoningTokens) {
          totalReasoningTokens += pageData.reasoningTokens;
        }
      }
      
      // Clean up temp files
      console.log('🧹 Cleaning up temp files...');
      await fs.rm(tempFolder, { recursive: true, force: true }).catch(() => {});
      
      // Calculate extraction rate
      const totalFields = 41;
      const fieldsExtracted = Object.values(extractedData)
        .filter(v => v !== null && v !== undefined && v !== '').length;
      const extractionRate = Math.round((fieldsExtracted / totalFields) * 100);
      
      console.log(`✅ GPT-5 Extraction complete: ${fieldsExtracted}/${totalFields} fields (${extractionRate}%)`);
      console.log(`💭 Total reasoning tokens used: ${totalReasoningTokens}`);
      
      return {
        success: true,
        data: extractedData,
        extractionRate: `${extractionRate}%`,
        fieldsExtracted,
        totalFields,
        reasoningTokens: totalReasoningTokens
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
    const img = await fs.readFile(imagePath);
    const base64Image = img.toString('base64');
    
    // Get appropriate prompt for page number
    const prompt = this.getPromptForPage(pageNumber);
    
    try {
      // Make request using OpenAI SDK with proper GPT-5 parameters
      const response = await this.openai.chat.completions.create({
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
   - Find SELLER names if filled in after "Seller" label
   - Property address - the complete filled-in address

2. PARAGRAPH 2 - PROPERTY TYPE:
   - Which checkbox is marked (X)?

3. PARAGRAPH 3 - PURCHASE DETAILS:
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
  "sellers": ["actual seller names if any"],
  "property_address": "actual address from form",
  "property_type": "which box is checked",
  "para3_option_checked": "3A" or "3C" or "3B",
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
   - Also: "buyer's closing costs, prepaids" <- often has amount after it
   - The filled amount might be after phrases like "up to" or "maximum of"
   - IGNORE the pre-printed form text, FIND the typed/filled values!

PARAGRAPH 6 - APPRAISAL:
   - Which option box is checked (A or B)?

PARAGRAPH 7 - EARNEST MONEY:
   - Is the YES or NO box checked?
   - If YES, find filled-in amount and holder name

PARAGRAPH 8 - NON-REFUNDABLE:
   - Is a box checked for non-refundable?
   - If YES, find filled-in amount and date

Return JSON with ACTUAL FILLED-IN values:
{
  "para5_custom_text": "the actual filled amount like '10k' or '$10,000'",
  "para5_seller_pays_text": "complete text including filled amount",
  "earnest_money": "YES or NO based on checkbox",
  "earnest_money_amount": "filled amount if YES",
  "earnest_money_holder": "filled holder name if YES",
  "non_refundable": "YES or NO",
  "non_refundable_amount": "filled amount if YES",
  "non_refundable_when": "filled date if YES"
}`;

      case 5:
        return `Extract information from PARAGRAPH 10 (TITLE INSURANCE):

Look for which box is checked:
- Box A: Seller shall furnish at Seller's cost
- Box B: Buyer and Seller will equally share the cost
- Box C: Other arrangement

Return valid JSON with keys:
{
  "para10_title_option": "A, B, or C",
  "para10_details": "any additional text if Box C"
}`;

      case 6:
        return `Extract information from PARAGRAPH 11 (SURVEY) and PARAGRAPH 13 (FIXTURES):

Para 11: Survey option
- Box A: A new survey (check who pays: Seller, Buyer, or Equally split)
- Box B: Buyer declines survey
- Box C: Other

Para 13: Items included in first blank (after standard fixtures)
Para 13: Items excluded in second blank

Return valid JSON with keys:
{
  "para11_survey_option": "A, B, or C",
  "para11_survey_paid_by": "Seller, Buyer, or Equally split (if A)",
  "para13_items_included": "items in first blank",
  "para13_items_excluded": "items in second blank"
}`;

      case 7:
        return `Extract information from PARAGRAPH 15 (HOME WARRANTY):

Look for which box is checked:
- Box A: No Home Warranty provided
- Box B: One-year limited Home Warranty Plan provided by [company]
- Box C: One-year limited Home Warranty Plan provided by a Home Warranty Company
- Box D: Other

If warranty is provided, who pays for it?

Return valid JSON with keys:
{
  "para15_home_warranty": "A (None), B, C, or D",
  "para15_warranty_company": "company name if B or C",
  "para15_warranty_paid_by": "Seller or Buyer if warranty provided",
  "para15_warranty_cost": "cost if specified"
}`;

      case 8:
        return `Extract information from PARAGRAPH 19 (TERMITE CONTROL):

Look for which box is checked:
- Box A: None
- Box B: A Letter of Clearance (Wood Infestation Report) with 1-year warranty
- Box C: Other

Return valid JSON with keys:
{
  "para19_termite_option": "A, B, or C",
  "para19_termite_details": "additional details if any"
}`;

      case 13:
        return `Extract the CLOSING DATE from this page.

Look for the date when closing will occur.

Return valid JSON with keys:
{
  "closing_date": "MM/DD/YYYY format"
}`;

      case 14:
        return `Extract information from PARAGRAPH 32 (ADDITIONAL TERMS):

Look for any additional terms, especially:
- Buyer agency compensation (e.g., "Buyer to pay 3% buyer agency fee")  
- Commission arrangements
- Any other special agreements or terms

Return valid JSON with keys:
{
  "para32_additional_terms": "full text of all additional terms",
  "buyer_agency_fee": "percentage or amount if mentioned",
  "other_terms": "any other important terms"
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
      case 17:
        return `Extract AGENT and CLOSING information from signature page:

Look for:
- Selling Agent name
- AREC License # of agent
- Agent email
- Agent cell phone
- Closing date (if shown)

Return valid JSON with keys:
{
  "selling_agent_name": "agent name",
  "agent_arec_license": "license number",
  "agent_email": "email address",
  "agent_cell": "phone number",
  "closing_date": "MM/DD/YYYY if found"
}`;

      // Add other pages as needed
      default:
        return `Extract all relevant contract information from this page and return as valid JSON.`;
    }
  }
}