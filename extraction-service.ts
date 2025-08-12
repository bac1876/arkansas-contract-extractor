/**
 * Arkansas Contract Extraction Service
 * Core extraction logic as a reusable service
 */

const pdfParse = require('pdf-parse');
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

export interface ExtractedContract {
  para1_buyers: string[];
  para1_property: string;
  para3_price: number;
  para3_loan: string;
  para5_blanks: string[];
  para7_earnest: boolean;
  para8_nonrefundable: boolean;
  para10_title: string;
  para11_survey: string;
  para13_custom: string;
  para14_contingency: boolean;
  para15_warranty: boolean;
  para16: string;
  para19: string | null;
  para20: string;
  para22_date: string;
  para23_possession: string;
  para32_custom: string;
  para37: string;
  para38_date: string;
  para39_serial: string;
}

export class ContractExtractionService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
  }

  async extractFromBuffer(pdfBuffer: Buffer): Promise<ExtractedContract> {
    console.log('Starting extraction...');
    
    // Parse PDF
    const pdfData = await pdfParse(pdfBuffer);
    console.log(`PDF parsed: ${pdfData.numpages} pages, ${pdfData.text.length} chars`);

    // Split into chunks for better extraction
    const textChunks = [];
    const chunkSize = 10000;
    for (let i = 0; i < pdfData.text.length; i += chunkSize) {
      textChunks.push(pdfData.text.substring(i, i + chunkSize));
    }

    // Extract from each chunk using GPT-4
    const allExtractions = [];
    for (let i = 0; i < textChunks.length; i++) {
      const extraction = await this.extractChunk(textChunks[i], i + 1, textChunks.length);
      allExtractions.push(extraction);
    }

    // Merge results
    const merged = this.mergeExtractions(allExtractions);
    
    // Apply fixes and pattern detection for Para 19
    const fixed = await this.applyFixes(merged, pdfData.text);
    
    return fixed;
  }

  private async extractChunk(text: string, chunkNum: number, totalChunks: number): Promise<any> {
    const systemPrompt = `You are extracting specific fields from an Arkansas real estate contract.
IMPORTANT: Look for paragraph numbers (1, 2, 3... or "Paragraph 1", etc.)
Many fields use "A. Yes" and "B. No" format - identify which appears FIRST (that's the selected one).
Return ONLY valid JSON with the requested data.`;

    const userPrompt = `Extract these fields from this contract text (chunk ${chunkNum}/${totalChunks}):

TEXT (first 8000 chars):
${text.substring(0, 8000)}

EXTRACT THESE FIELD GROUPS and return as valid JSON:
{
  "para1_buyers": ["array of buyer names"],
  "para1_property": "property address string",
  "para3_price": number or 0,
  "para3_loan": "loan type string",
  "para5_blanks": ["array of fill-in data"],
  "para7_earnest": "Yes or No",
  "para8_nonrefundable": "Yes or No",
  "para10_title": "A, B, or C",
  "para11_survey": "Buyer, Seller, or Split",
  "para13_custom": "custom text or empty string",
  "para14_contingency": "Yes or No",
  "para15_warranty": "Yes or No",
  "para16": "A or B",
  "para19": "A, B, or C",
  "para20": "A or B",
  "para22_date": "date string",
  "para23_possession": "possession details",
  "para32_custom": "custom text or empty string",
  "para37": "checkbox option",
  "para38_date": "date string",
  "para39_serial": "serial number"
}

Use empty string "" for text fields not found, empty array [] for arrays not found, 0 for numbers not found.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content || '{}';
      
      // Try to parse the JSON
      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.error('JSON parse error, attempting to fix:', parseError);
        
        // Try to fix common JSON issues
        let fixedContent = content
          .replace(/,\s*}/g, '}')  // Remove trailing commas
          .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
          .replace(/([^"\\])"/g, '$1\\"')  // Escape unescaped quotes
          .replace(/\n/g, '\\n')  // Escape newlines
          .replace(/\r/g, '\\r')  // Escape carriage returns
          .replace(/\t/g, '\\t'); // Escape tabs
        
        try {
          return JSON.parse(fixedContent);
        } catch (secondError) {
          console.error('Could not fix JSON, returning defaults');
          // Return default structure if all else fails
          return {
            para1_buyers: [],
            para1_property: "",
            para3_price: 0,
            para3_loan: "",
            para5_blanks: [],
            para7_earnest: "No",
            para8_nonrefundable: "No",
            para10_title: "",
            para11_survey: "",
            para13_custom: "",
            para14_contingency: "No",
            para15_warranty: "No",
            para16: "",
            para19: "",
            para20: "",
            para22_date: "",
            para23_possession: "",
            para32_custom: "",
            para37: "",
            para38_date: "",
            para39_serial: ""
          };
        }
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  private mergeExtractions(extractions: any[]): any {
    const merged: any = {};
    
    for (const extraction of extractions) {
      for (const [key, value] of Object.entries(extraction)) {
        if (value !== null && value !== undefined && value !== '') {
          if (!merged[key] || 
              (typeof value === 'string' && value.length > (merged[key] as string).length) ||
              (Array.isArray(value) && value.length > 0)) {
            merged[key] = value;
          }
        }
      }
    }
    
    return merged;
  }

  private async applyFixes(merged: any, fullText: string): Promise<ExtractedContract> {
    // Fix earnest money
    if (merged.para7_earnest === "A. Yes" || merged.para7_earnest === "Yes") {
      merged.para7_earnest = true;
    } else if (merged.para7_earnest === "B. No" || merged.para7_earnest === "No") {
      merged.para7_earnest = false;
    }

    // Fix Survey to be A or B
    if (merged.para11_survey === 'Buyer') {
      merged.para11_survey = 'A';
    } else if (merged.para11_survey === 'Seller') {
      merged.para11_survey = 'B';
    } else if (merged.para11_survey === 'Split') {
      merged.para11_survey = 'C';
    }

    // Special handling for Para 19 - Apply learned pattern
    if (!merged.para19) {
      const pattern18to19 = /18\.\s*A\.\s*B\.\s*C\.\s*D\.\s*19\.\s*A\.\s*B\.\s*C\./s;
      const match = fullText.match(pattern18to19);
      
      if (match) {
        const afterPattern = fullText.substring(match.index! + match[0].length, match.index! + match[0].length + 200);
        const xMarks = (afterPattern.match(/✖/g) || []).length;
        
        if (xMarks === 2) {
          // Apply learned pattern: 2 ✖ marks = Para 19 Option B
          merged.para19 = 'B';
          console.log('Applied pattern detection for Para 19: B');
        }
      }
    }

    // Para 20 - Check for 1978 reference
    if (!merged.para20 && fullText.includes('not constructed prior to 1978')) {
      merged.para20 = 'A';
    }

    // Set defaults for missing fields
    const result: ExtractedContract = {
      para1_buyers: merged.para1_buyers || [],
      para1_property: merged.para1_property || '',
      para3_price: merged.para3_price || 0,
      para3_loan: merged.para3_loan || '',
      para5_blanks: merged.para5_blanks || [],
      para7_earnest: merged.para7_earnest === true,
      para8_nonrefundable: merged.para8_nonrefundable === true,
      para10_title: merged.para10_title || '',
      para11_survey: merged.para11_survey || '',
      para13_custom: merged.para13_custom || '',
      para14_contingency: merged.para14_contingency === true,
      para15_warranty: merged.para15_warranty === true,
      para16: merged.para16 || '',
      para19: merged.para19 || null,
      para20: merged.para20 || '',
      para22_date: merged.para22_date || '',
      para23_possession: merged.para23_possession || '',
      para32_custom: merged.para32_custom || '',
      para37: merged.para37 || '',
      para38_date: merged.para38_date || '',
      para39_serial: merged.para39_serial || ''
    };

    return result;
  }

  convertToCSV(data: ExtractedContract): string {
    const rows = [
      ['Field', 'Value'],
      ['Buyers', data.para1_buyers.join('; ')],
      ['Property', data.para1_property],
      ['Price', data.para3_price.toString()],
      ['Loan Type', data.para3_loan],
      ['Para 5 Blanks', data.para5_blanks.join('; ')],
      ['Earnest Money', data.para7_earnest ? 'YES' : 'NO'],
      ['Non-refundable', data.para8_nonrefundable ? 'YES' : 'NO'],
      ['Title Option', data.para10_title],
      ['Survey', data.para11_survey],
      ['Para 13 Custom', data.para13_custom],
      ['Contingency', data.para14_contingency ? 'YES' : 'NO'],
      ['Home Warranty', data.para15_warranty ? 'YES' : 'NO'],
      ['Para 16', data.para16],
      ['Para 19 - Termite', data.para19 || 'Manual Review'],
      ['Para 20 - Lead Paint', data.para20],
      ['Para 22 Date', data.para22_date],
      ['Possession', data.para23_possession],
      ['Para 32 Custom', data.para32_custom],
      ['Para 37', data.para37],
      ['Para 38 Date', data.para38_date],
      ['Serial Number', data.para39_serial]
    ];

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }
}