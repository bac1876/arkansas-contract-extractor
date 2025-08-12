/**
 * OpenAI-Powered Arkansas Contract Field Extractor
 * Uses GPT-4 for intelligent field extraction
 */

const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';
import { ArkansasContractFields } from '../schemas/arkansas-specific-fields.schema';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

export class OpenAIExtractor {
  private openai: OpenAI;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable or pass it to constructor.');
    }

    this.openai = new OpenAI({ apiKey: key });
    this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
    this.maxTokens = parseInt(process.env.MAX_TOKENS || '4000');
    this.temperature = parseFloat(process.env.TEMPERATURE || '0.1');
  }

  // Parse PDF to text
  async parsePDF(filePath: string): Promise<{ text: string; pages: number }> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      
      return {
        text: pdfData.text,
        pages: pdfData.numpages
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to parse PDF: ${errorMsg}`);
    }
  }

  // Extract fields using GPT-4
  async extractFields(contractText: string): Promise<ArkansasContractFields> {
    console.log('Sending contract to GPT-4 for extraction...');
    
    // Split into chunks if text is too long
    const chunks = this.splitIntoChunks(contractText, 30000);
    const allExtractions: any[] = [];

    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1} of ${chunks.length}...`);
      const extraction = await this.extractFromChunk(chunks[i], i + 1, chunks.length);
      allExtractions.push(extraction);
    }

    // Merge results from all chunks
    let mergedResults = this.mergeExtractions(allExtractions);
    
    // Post-processing: Check for FHA indicators in the original text
    if (contractText.includes('FHA. (Continues on Page') || 
        contractText.includes('FHA NOTICE TO BUYER')) {
      // Strong indicator that FHA is selected
      if (mergedResults.paragraph3_loan_type.type === 'Conventional' || 
          !mergedResults.paragraph3_loan_type.type) {
        console.log('Detected FHA loan type based on FHA notices in document');
        mergedResults.paragraph3_loan_type.type = 'FHA';
        mergedResults.paragraph3_loan_type.confidence = 95;
      }
    }
    
    return mergedResults;
  }

  private async extractFromChunk(chunkText: string, chunkNumber: number, totalChunks: number): Promise<any> {
    const systemPrompt = `You are an expert at extracting specific information from Arkansas real estate contracts. 
    You must extract ONLY the requested fields from specific paragraph numbers. 
    Look for paragraph numbers, checkboxes (marked with [X], [✓], or similar), and fill-in blanks.
    IMPORTANT: Many fields use "A. Yes" and "B. No" format - look for which option is selected.
    Return data in JSON format with confidence scores (0-100) for each field.`;

    const userPrompt = `Extract these EXACT fields from this Arkansas real estate contract (Chunk ${chunkNumber}/${totalChunks}):

CONTRACT TEXT:
${chunkText}

EXTRACT THESE SPECIFIC FIELDS:

1. From Paragraph 1 (PARTIES): 
   - Extract all buyer names (look for "Buyer" or "Purchaser")
   - Extract property address

2. From Paragraph 3: 
   - Purchase price amount (numeric value)
   - Loan type: Look for the selected loan type. Common options are:
     • CONVENTIONAL
     • VA
     • FHA  
     • USDA-RD
     IMPORTANT: In Arkansas contracts, if you see "FHA. (Continues on Page 2, for 'FHA NOTICE TO BUYER')" with additional FHA-specific language following, then FHA is selected.
     Look for checkbox marks like [✖], [X], [✓], (✖), (X), (✓) or ✖ next to the options.
     If unclear, check which loan type has the most detailed information or notices following it.

3. From Paragraph 5: 
   - Extract ALL data from fill-in blanks (anything filled in on blank lines)

4. From Paragraph 7 (EARNEST MONEY): 
   - Look for options like "A. Yes" or "B. No"
   - Is there earnest money? (Yes/No)
   - May reference "Earnest Money Addendum" if Yes

5. From Paragraph 8: 
   - Is the deposit non-refundable? (Yes/No)

6. From Paragraph 10 (TITLE): 
   - Which checkbox is selected: A, B, or C?

7. From Paragraph 11 (SURVEY):
   - Is a survey required?
   - Who pays: Buyer, Seller, or Split equally?

8. From Paragraph 13: 
   - Any custom text written in the fill-in section

9. From Paragraph 14: 
   - Is there a contingency? (Yes/No)

10. From Paragraph 15 (HOME WARRANTY):
    - Is there a home warranty? (Yes/No)
    - Is checkbox B selected?
    - If checkbox B is selected, what data is typed in?

11. From Paragraph 16: Which checkbox is selected (A or B)?

12. From Paragraph 18: Which checkbox is selected?

13. From Paragraph 19: Which checkbox is selected?

14. From Paragraph 20: Which checkbox is selected?

15. From Paragraph 22: What date is inserted?

16. From Paragraph 23 (POSSESSION): Which checkbox is selected?

17. From Paragraph 32: Extract any data from the fill-in section

18. From Paragraph 37: Which checkbox is selected?

19. From Paragraph 38: What date is shown?

20. From Paragraph 39: What is the contract serial number?

Return as JSON with this structure:
{
  "paragraph1": {
    "buyer_names": ["name1", "name2"],
    "property_address": "address",
    "confidence": 0-100
  },
  "paragraph3_price": {
    "amount": number or null,
    "confidence": 0-100
  },
  "paragraph3_loan": {
    "type": "FHA" | "VA" | "CONVENTIONAL" | "USDA-RD" | "Cash" | null,
    "raw_text": "include the checkbox and text exactly as shown",
    "confidence": 0-100
  },
  // ... continue for all fields
}

If a field is not found in this chunk, mark it as null with confidence 0.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(content);
    } catch (error: any) {
      console.error('Error calling OpenAI:', error);
      
      // Check if it's a quota error
      if (error.code === 'insufficient_quota') {
        console.error('OpenAI quota exceeded. Please check your billing at https://platform.openai.com/account/billing');
        // Return default structure with error message
        return {
          error: 'OpenAI quota exceeded',
          message: 'Please add credits to your OpenAI account or use a different API key'
        };
      }
      
      throw error;
    }
  }

  private splitIntoChunks(text: string, maxChunkSize: number): string[] {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  private mergeExtractions(extractions: any[]): ArkansasContractFields {
    // Start with the first extraction as base
    const merged = extractions[0] || {};

    // Merge other extractions, preferring non-null values with higher confidence
    for (let i = 1; i < extractions.length; i++) {
      const current = extractions[i];
      
      for (const key in current) {
        if (current[key] && typeof current[key] === 'object') {
          const currentConfidence = current[key].confidence || 0;
          const mergedConfidence = merged[key]?.confidence || 0;
          
          // Use the field with higher confidence or non-null value
          if (currentConfidence > mergedConfidence || 
              (current[key].amount !== null && merged[key]?.amount === null) ||
              (current[key].type !== null && merged[key]?.type === null)) {
            merged[key] = current[key];
          }
        }
      }
    }

    // Convert to our schema format
    return this.convertToSchema(merged);
  }

  private convertToSchema(rawData: any): ArkansasContractFields {
    return {
      paragraph1_parties: {
        raw_text: rawData.paragraph1?.raw_text || '',
        buyer_names: rawData.paragraph1?.buyer_names || [],
        property_address: rawData.paragraph1?.property_address || '',
        confidence: rawData.paragraph1?.confidence || 0
      },
      paragraph3_purchase_price: {
        amount: rawData.paragraph3_price?.amount || null,
        raw_text: rawData.paragraph3_price?.raw_text || '',
        confidence: rawData.paragraph3_price?.confidence || 0
      },
      paragraph3_loan_type: {
        type: rawData.paragraph3_loan?.type || null,
        raw_text: rawData.paragraph3_loan?.raw_text || '',
        confidence: rawData.paragraph3_loan?.confidence || 0
      },
      paragraph5_blanks: {
        all_filled_data: rawData.paragraph5?.all_filled_data || [],
        raw_text: rawData.paragraph5?.raw_text || '',
        confidence: rawData.paragraph5?.confidence || 0
      },
      paragraph7_earnest_money: {
        has_earnest_money: rawData.paragraph7?.has_earnest_money || false,
        amount: rawData.paragraph7?.amount,
        raw_text: rawData.paragraph7?.raw_text || '',
        confidence: rawData.paragraph7?.confidence || 0
      },
      paragraph8_nonrefundable: {
        is_nonrefundable: rawData.paragraph8?.is_nonrefundable || false,
        raw_text: rawData.paragraph8?.raw_text || '',
        confidence: rawData.paragraph8?.confidence || 0
      },
      paragraph10_title: {
        selected_option: rawData.paragraph10?.selected_option || null,
        description: rawData.paragraph10?.description || '',
        raw_text: rawData.paragraph10?.raw_text || '',
        confidence: rawData.paragraph10?.confidence || 0
      },
      paragraph11_survey: {
        survey_required: rawData.paragraph11?.survey_required || false,
        who_pays: rawData.paragraph11?.who_pays || null,
        raw_text: rawData.paragraph11?.raw_text || '',
        confidence: rawData.paragraph11?.confidence || 0
      },
      paragraph13_custom: {
        filled_text: rawData.paragraph13?.filled_text || null,
        raw_text: rawData.paragraph13?.raw_text || '',
        confidence: rawData.paragraph13?.confidence || 0
      },
      paragraph14_contingency: {
        has_contingency: rawData.paragraph14?.has_contingency || false,
        type: rawData.paragraph14?.type,
        raw_text: rawData.paragraph14?.raw_text || '',
        confidence: rawData.paragraph14?.confidence || 0
      },
      paragraph15_warranty: {
        has_warranty: rawData.paragraph15?.has_warranty || false,
        checkbox_b_selected: rawData.paragraph15?.checkbox_b_selected || false,
        checkbox_b_data: rawData.paragraph15?.checkbox_b_data,
        raw_text: rawData.paragraph15?.raw_text || '',
        confidence: rawData.paragraph15?.confidence || 0
      },
      paragraph16_checkbox: {
        selected_option: rawData.paragraph16?.selected_option || null,
        raw_text: rawData.paragraph16?.raw_text || '',
        confidence: rawData.paragraph16?.confidence || 0
      },
      paragraph18_checkbox: {
        selected_option: rawData.paragraph18?.selected_option || null,
        raw_text: rawData.paragraph18?.raw_text || '',
        confidence: rawData.paragraph18?.confidence || 0
      },
      paragraph19_checkbox: {
        selected_option: rawData.paragraph19?.selected_option || null,
        raw_text: rawData.paragraph19?.raw_text || '',
        confidence: rawData.paragraph19?.confidence || 0
      },
      paragraph20_checkbox: {
        selected_option: rawData.paragraph20?.selected_option || null,
        raw_text: rawData.paragraph20?.raw_text || '',
        confidence: rawData.paragraph20?.confidence || 0
      },
      paragraph22_date: {
        date: rawData.paragraph22?.date || null,
        raw_text: rawData.paragraph22?.raw_text || '',
        confidence: rawData.paragraph22?.confidence || 0
      },
      paragraph23_possession: {
        selected_option: rawData.paragraph23?.selected_option || null,
        details: rawData.paragraph23?.details,
        raw_text: rawData.paragraph23?.raw_text || '',
        confidence: rawData.paragraph23?.confidence || 0
      },
      paragraph32_custom: {
        filled_text: rawData.paragraph32?.filled_text || null,
        has_data: rawData.paragraph32?.has_data || false,
        raw_text: rawData.paragraph32?.raw_text || '',
        confidence: rawData.paragraph32?.confidence || 0
      },
      paragraph37_checkbox: {
        selected_option: rawData.paragraph37?.selected_option || null,
        raw_text: rawData.paragraph37?.raw_text || '',
        confidence: rawData.paragraph37?.confidence || 0
      },
      paragraph38_date: {
        date: rawData.paragraph38?.date || null,
        raw_text: rawData.paragraph38?.raw_text || '',
        confidence: rawData.paragraph38?.confidence || 0
      },
      paragraph39_serial: {
        serial_number: rawData.paragraph39?.serial_number || null,
        raw_text: rawData.paragraph39?.raw_text || '',
        confidence: rawData.paragraph39?.confidence || 0
      },
      extraction_metadata: {
        document_name: 'sample_contract.pdf',
        extraction_date: new Date().toISOString(),
        total_pages: 0,
        extraction_method: 'OpenAI GPT-4',
        overall_confidence: this.calculateOverallConfidence(rawData),
        missing_fields: this.identifyMissingFields(rawData),
        warnings: []
      }
    };
  }

  private calculateOverallConfidence(data: any): number {
    const confidences: number[] = [];
    
    for (const key in data) {
      if (data[key] && typeof data[key] === 'object' && 'confidence' in data[key]) {
        confidences.push(data[key].confidence);
      }
    }
    
    if (confidences.length === 0) return 0;
    return Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length);
  }

  private identifyMissingFields(data: any): string[] {
    const missing: string[] = [];
    const requiredFields = [
      'paragraph1', 'paragraph3_price', 'paragraph7',
      'paragraph22', 'paragraph38', 'paragraph39'
    ];
    
    requiredFields.forEach(field => {
      if (!data[field] || (data[field].confidence && data[field].confidence < 30)) {
        missing.push(field);
      }
    });
    
    return missing;
  }

  // Export results
  exportResults(fields: ArkansasContractFields, format: 'json' | 'csv' | 'summary' = 'json'): string {
    switch (format) {
      case 'csv':
        return this.toCSV(fields);
      case 'summary':
        return this.toSummary(fields);
      default:
        return JSON.stringify(fields, null, 2);
    }
  }

  private toCSV(fields: ArkansasContractFields): string {
    const rows = [
      ['Field', 'Value', 'Confidence'],
      ['Buyer Names', fields.paragraph1_parties.buyer_names?.join('; ') || '', fields.paragraph1_parties.confidence.toString()],
      ['Property Address', fields.paragraph1_parties.property_address || '', fields.paragraph1_parties.confidence.toString()],
      ['Purchase Price', fields.paragraph3_purchase_price.amount?.toString() || '', fields.paragraph3_purchase_price.confidence.toString()],
      ['Loan Type', fields.paragraph3_loan_type.type || '', fields.paragraph3_loan_type.confidence.toString()],
      ['Paragraph 5 Data', fields.paragraph5_blanks.all_filled_data.join('; ') || '', fields.paragraph5_blanks.confidence.toString()],
      ['Earnest Money', fields.paragraph7_earnest_money.has_earnest_money ? `Yes - $${fields.paragraph7_earnest_money.amount || 'N/A'}` : 'No', fields.paragraph7_earnest_money.confidence.toString()],
      ['Non-refundable', fields.paragraph8_nonrefundable.is_nonrefundable ? 'Yes' : 'No', fields.paragraph8_nonrefundable.confidence.toString()],
      ['Title Option', fields.paragraph10_title.selected_option || '', fields.paragraph10_title.confidence.toString()],
      ['Survey Pays', fields.paragraph11_survey.who_pays || '', fields.paragraph11_survey.confidence.toString()],
      ['Para 13 Custom', fields.paragraph13_custom.filled_text || '', fields.paragraph13_custom.confidence.toString()],
      ['Contingency', fields.paragraph14_contingency.has_contingency ? 'Yes' : 'No', fields.paragraph14_contingency.confidence.toString()],
      ['Home Warranty', fields.paragraph15_warranty.has_warranty ? 'Yes' : 'No', fields.paragraph15_warranty.confidence.toString()],
      ['Para 16 Checkbox', fields.paragraph16_checkbox.selected_option || '', fields.paragraph16_checkbox.confidence.toString()],
      ['Para 18 Checkbox', fields.paragraph18_checkbox.selected_option || '', fields.paragraph18_checkbox.confidence.toString()],
      ['Para 19 Checkbox', fields.paragraph19_checkbox.selected_option || '', fields.paragraph19_checkbox.confidence.toString()],
      ['Para 20 Checkbox', fields.paragraph20_checkbox.selected_option || '', fields.paragraph20_checkbox.confidence.toString()],
      ['Para 22 Date', fields.paragraph22_date.date || '', fields.paragraph22_date.confidence.toString()],
      ['Possession', fields.paragraph23_possession.selected_option || '', fields.paragraph23_possession.confidence.toString()],
      ['Para 32 Custom', fields.paragraph32_custom.filled_text || '', fields.paragraph32_custom.confidence.toString()],
      ['Para 37 Checkbox', fields.paragraph37_checkbox.selected_option || '', fields.paragraph37_checkbox.confidence.toString()],
      ['Para 38 Date', fields.paragraph38_date.date || '', fields.paragraph38_date.confidence.toString()],
      ['Contract Serial', fields.paragraph39_serial.serial_number || '', fields.paragraph39_serial.confidence.toString()]
    ];

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  private toSummary(fields: ArkansasContractFields): string {
    return `
ARKANSAS CONTRACT EXTRACTION SUMMARY (OpenAI GPT-4)
===================================================
Document: ${fields.extraction_metadata.document_name}
Extracted: ${fields.extraction_metadata.extraction_date}
Method: ${fields.extraction_metadata.extraction_method}
Overall Confidence: ${fields.extraction_metadata.overall_confidence}%

KEY FIELDS EXTRACTED:
--------------------
1. PARTIES (Para 1):
   • Buyers: ${fields.paragraph1_parties.buyer_names?.join(', ') || 'Not found'}
   • Property: ${fields.paragraph1_parties.property_address || 'Not found'}
   • Confidence: ${fields.paragraph1_parties.confidence}%

2. FINANCIAL TERMS:
   • Purchase Price (Para 3): $${fields.paragraph3_purchase_price.amount?.toLocaleString() || 'Not found'}
   • Loan Type: ${fields.paragraph3_loan_type.type || 'Not specified'}
   • Earnest Money (Para 7): ${fields.paragraph7_earnest_money.has_earnest_money ? `Yes - $${fields.paragraph7_earnest_money.amount?.toLocaleString() || 'N/A'}` : 'No'}

3. PARAGRAPH 5 FILL-INS:
${fields.paragraph5_blanks.all_filled_data.length > 0 
  ? fields.paragraph5_blanks.all_filled_data.map((item, i) => `   ${i + 1}. ${item}`).join('\n')
  : '   No data found'}

4. CONTRACT TERMS:
   • Non-refundable (Para 8): ${fields.paragraph8_nonrefundable.is_nonrefundable ? 'Yes' : 'No'}
   • Title Option (Para 10): ${fields.paragraph10_title.selected_option || 'Not selected'}
   • Survey (Para 11): ${fields.paragraph11_survey.who_pays ? `${fields.paragraph11_survey.who_pays} pays` : 'Not specified'}
   • Contingency (Para 14): ${fields.paragraph14_contingency.has_contingency ? 'Yes' : 'No'}
   • Home Warranty (Para 15): ${fields.paragraph15_warranty.has_warranty ? 'Yes' : 'No'}
   ${fields.paragraph15_warranty.checkbox_b_selected ? `   • Checkbox B Data: ${fields.paragraph15_warranty.checkbox_b_data}` : ''}

5. CUSTOM TEXT:
   • Para 13: ${fields.paragraph13_custom.filled_text || 'None'}
   • Para 32: ${fields.paragraph32_custom.filled_text || 'None'}

6. CHECKBOX SELECTIONS:
   • Para 16: ${fields.paragraph16_checkbox.selected_option || 'None'}
   • Para 18: ${fields.paragraph18_checkbox.selected_option || 'None'}
   • Para 19: ${fields.paragraph19_checkbox.selected_option || 'None'}
   • Para 20: ${fields.paragraph20_checkbox.selected_option || 'None'}
   • Para 37: ${fields.paragraph37_checkbox.selected_option || 'None'}

7. IMPORTANT DATES:
   • Para 22 Date: ${fields.paragraph22_date.date || 'Not found'}
   • Para 38 Date: ${fields.paragraph38_date.date || 'Not found'}

8. OTHER:
   • Possession (Para 23): ${fields.paragraph23_possession.selected_option || 'Not specified'}
   • Contract Serial (Para 39): ${fields.paragraph39_serial.serial_number || 'Not found'}

MISSING FIELDS: ${fields.extraction_metadata.missing_fields.length > 0 ? fields.extraction_metadata.missing_fields.join(', ') : 'None'}
    `;
  }
}