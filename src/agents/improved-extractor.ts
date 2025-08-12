/**
 * Improved Arkansas Contract Field Extractor
 * Handles A/B checkbox formats and other specific patterns
 */

const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';
import { ArkansasContractFields } from '../schemas/arkansas-specific-fields.schema';
import OpenAI from 'openai';

export class ImprovedExtractor {
  private openai: OpenAI;
  private model: string;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OpenAI API key is required');
    }

    this.openai = new OpenAI({ apiKey: key });
    this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
  }

  async parsePDF(filePath: string): Promise<{ text: string; pages: number }> {
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdfParse(dataBuffer);
    
    return {
      text: pdfData.text,
      pages: pdfData.numpages
    };
  }

  async extractFields(contractText: string): Promise<ArkansasContractFields> {
    console.log('Starting improved extraction with A/B checkbox handling...\n');
    
    // Extract all fields with improved prompts
    const results = await this.extractAllFields(contractText);
    
    return results;
  }

  private async extractAllFields(contractText: string): Promise<ArkansasContractFields> {
    const systemPrompt = `You are an expert at extracting information from Arkansas real estate contracts.
    
IMPORTANT PATTERNS TO RECOGNIZE:
1. Many fields use "A. Yes" and "B. No" format - identify which option appears first or is marked
2. Look for checkboxes: [ ], [X], [✓], ( ), (X), (✓), ☐, ☑
3. If you see "A. Yes, see [document name]" that means Yes is selected
4. If a line starts with A. or B. without a checkbox, the first one listed is typically selected
5. Paragraph numbers may be written as "7." or "Paragraph 7" or "PARAGRAPH 7"

Return structured JSON with confidence scores.`;

    const userPrompt = `Extract these specific fields from this Arkansas real estate contract:

CONTRACT TEXT:
${contractText.substring(0, 30000)} ${contractText.length > 30000 ? '...[truncated]' : ''}

EXTRACT THESE EXACT FIELDS:

1. PARAGRAPH 1 (PARTIES):
   - All buyer names
   - Property address

2. PARAGRAPH 3 (PURCHASE PRICE):
   - Purchase price amount
   - Loan type (Look for: FHA, VA, Conventional, Cash, Other)

3. PARAGRAPH 5:
   - ALL filled-in data from blanks

4. PARAGRAPH 7 (EARNEST MONEY):
   - Look for "A. Yes" or "B. No" format
   - Which option is selected?
   - If A (Yes), may reference "Earnest Money Addendum"

5. PARAGRAPH 8 (NON-REFUNDABLE DEPOSIT):
   - Look for "A. Yes" or "B. No" format
   - Is the deposit non-refundable?

6. PARAGRAPH 10 (TITLE):
   - Which option: A, B, or C?

7. PARAGRAPH 11 (SURVEY):
   - Is survey required?
   - Who pays: Buyer, Seller, or Split?

8. PARAGRAPH 13:
   - Any custom filled-in text

9. PARAGRAPH 14 (CONTINGENCY):
   - Is there a contingency? (May use A/B format)

10. PARAGRAPH 15 (HOME WARRANTY):
    - Look for "A. Yes" or "B. No" format
    - Is there a warranty?
    - If checkbox B is selected, what's the data?

11. PARAGRAPH 16:
    - Which checkbox: A or B?

12. PARAGRAPH 18:
    - Which checkbox is selected?

13. PARAGRAPH 19:
    - Which checkbox is selected?

14. PARAGRAPH 20:
    - Which checkbox is selected?

15. PARAGRAPH 22:
    - What date is inserted?

16. PARAGRAPH 23 (POSSESSION):
    - Which option is selected?

17. PARAGRAPH 32:
    - Any custom filled-in text

18. PARAGRAPH 37:
    - Which checkbox is selected?

19. PARAGRAPH 38:
    - What date?

20. PARAGRAPH 39:
    - Contract serial number

Return as JSON with this structure for each field:
{
  "field_name": {
    "value": "extracted value",
    "raw_text": "exact text from contract",
    "confidence": 0-100
  }
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      });

      const extraction = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      // Now run specific extractors for problem fields
      const improvedResults = await this.runSpecificExtractors(contractText, extraction);
      
      return this.formatResults(improvedResults);
    } catch (error) {
      console.error('Error in extraction:', error);
      throw error;
    }
  }

  private async runSpecificExtractors(contractText: string, initialExtraction: any): Promise<any> {
    console.log('Running specific extractors for A/B format fields...\n');
    
    // Fields that commonly use A/B format
    const abFields = [
      { para: 7, name: 'earnest_money', question: 'Is there earnest money? Look for A.Yes or B.No' },
      { para: 8, name: 'nonrefundable', question: 'Is deposit non-refundable? Look for A.Yes or B.No' },
      { para: 15, name: 'home_warranty', question: 'Is there a home warranty? Look for A.Yes or B.No' }
    ];

    for (const field of abFields) {
      console.log(`Checking Paragraph ${field.para} (${field.name})...`);
      
      // Find the paragraph in the text
      const paraPattern = new RegExp(`${field.para}\\.[^]*?(?=\\d+\\.|$)`, 'gi');
      const matches = contractText.match(paraPattern);
      
      if (matches && matches[0]) {
        const paraText = matches[0];
        
        // Check for A/B pattern
        const hasAYes = /A\.\s*Yes/i.test(paraText);
        const hasBNo = /B\.\s*No/i.test(paraText);
        
        if (hasAYes || hasBNo) {
          // Determine which comes first (that's typically the selected one)
          const aIndex = paraText.search(/A\.\s*Yes/i);
          const bIndex = paraText.search(/B\.\s*No/i);
          
          let value = false;
          if (aIndex !== -1 && (bIndex === -1 || aIndex < bIndex)) {
            value = true; // A (Yes) comes first or is only option
            console.log(`  ✓ Found: A. Yes`);
          } else {
            value = false; // B (No) comes first or is only option
            console.log(`  ✓ Found: B. No`);
          }
          
          // Update the extraction
          initialExtraction[`paragraph${field.para}_${field.name}`] = {
            value: value,
            raw_text: paraText.substring(0, 200),
            confidence: 95
          };
        }
      }
    }
    
    // Special handling for Title (Para 10) - A/B/C format
    console.log('Checking Paragraph 10 (Title) for A/B/C options...');
    const titlePattern = /10\.[^]*?(?=11\.|$)/gi;
    const titleMatch = contractText.match(titlePattern);
    
    if (titleMatch && titleMatch[0]) {
      const titleText = titleMatch[0];
      
      // Look for which option appears first
      const optionA = titleText.search(/A\./i);
      const optionB = titleText.search(/B\./i);
      const optionC = titleText.search(/C\./i);
      
      let selected = null;
      if (optionA !== -1 && (optionB === -1 || optionA < optionB) && (optionC === -1 || optionA < optionC)) {
        selected = 'A';
      } else if (optionB !== -1 && (optionC === -1 || optionB < optionC)) {
        selected = 'B';
      } else if (optionC !== -1) {
        selected = 'C';
      }
      
      if (selected) {
        console.log(`  ✓ Found: Option ${selected}`);
        initialExtraction['paragraph10_title'] = {
          value: selected,
          raw_text: titleText.substring(0, 200),
          confidence: 90
        };
      }
    }
    
    // Special handling for Survey (Para 11)
    console.log('Checking Paragraph 11 (Survey) for payment options...');
    const surveyPattern = /11\.[^]*?(?=12\.|$)/gi;
    const surveyMatch = contractText.match(surveyPattern);
    
    if (surveyMatch && surveyMatch[0]) {
      const surveyText = surveyMatch[0];
      
      // Look for Buyer/Seller/Split options
      const buyerOption = /\[\s*[X✓]\s*\]\s*Buyer|Buyer\s*\[\s*[X✓]\s*\]/i.test(surveyText);
      const sellerOption = /\[\s*[X✓]\s*\]\s*Seller|Seller\s*\[\s*[X✓]\s*\]/i.test(surveyText);
      const splitOption = /\[\s*[X✓]\s*\]\s*Split|Split\s*\[\s*[X✓]\s*\]|Equally/i.test(surveyText);
      
      let whoPays = null;
      if (buyerOption) whoPays = 'Buyer';
      else if (sellerOption) whoPays = 'Seller';
      else if (splitOption) whoPays = 'Split';
      
      if (whoPays) {
        console.log(`  ✓ Found: ${whoPays} pays`);
        initialExtraction['paragraph11_survey'] = {
          who_pays: whoPays,
          raw_text: surveyText.substring(0, 200),
          confidence: 85
        };
      }
    }
    
    return initialExtraction;
  }

  private formatResults(extraction: any): ArkansasContractFields {
    return {
      paragraph1_parties: {
        raw_text: extraction.paragraph1?.raw_text || '',
        buyer_names: extraction.paragraph1?.buyer_names || extraction.paragraph1?.value?.split(',').map((n: string) => n.trim()) || [],
        property_address: extraction.paragraph1?.property_address || extraction.paragraph1?.property || '',
        confidence: extraction.paragraph1?.confidence || 0
      },
      paragraph3_purchase_price: {
        amount: extraction.paragraph3_price?.value || extraction.paragraph3_price?.amount || null,
        raw_text: extraction.paragraph3_price?.raw_text || '',
        confidence: extraction.paragraph3_price?.confidence || 0
      },
      paragraph3_loan_type: {
        type: extraction.paragraph3_loan?.value || extraction.paragraph3_loan?.type || null,
        raw_text: extraction.paragraph3_loan?.raw_text || '',
        confidence: extraction.paragraph3_loan?.confidence || 0
      },
      paragraph5_blanks: {
        all_filled_data: extraction.paragraph5?.value || extraction.paragraph5?.data || [],
        raw_text: extraction.paragraph5?.raw_text || '',
        confidence: extraction.paragraph5?.confidence || 0
      },
      paragraph7_earnest_money: {
        has_earnest_money: extraction.paragraph7_earnest_money?.value || extraction.paragraph7?.value || false,
        raw_text: extraction.paragraph7_earnest_money?.raw_text || extraction.paragraph7?.raw_text || '',
        confidence: extraction.paragraph7_earnest_money?.confidence || extraction.paragraph7?.confidence || 0
      },
      paragraph8_nonrefundable: {
        is_nonrefundable: extraction.paragraph8_nonrefundable?.value || extraction.paragraph8?.value || false,
        raw_text: extraction.paragraph8_nonrefundable?.raw_text || extraction.paragraph8?.raw_text || '',
        confidence: extraction.paragraph8_nonrefundable?.confidence || extraction.paragraph8?.confidence || 0
      },
      paragraph10_title: {
        selected_option: extraction.paragraph10_title?.value || extraction.paragraph10?.value || null,
        description: '',
        raw_text: extraction.paragraph10_title?.raw_text || extraction.paragraph10?.raw_text || '',
        confidence: extraction.paragraph10_title?.confidence || extraction.paragraph10?.confidence || 0
      },
      paragraph11_survey: {
        survey_required: extraction.paragraph11_survey?.survey_required || extraction.paragraph11?.survey_required || false,
        who_pays: extraction.paragraph11_survey?.who_pays || extraction.paragraph11?.who_pays || null,
        raw_text: extraction.paragraph11_survey?.raw_text || extraction.paragraph11?.raw_text || '',
        confidence: extraction.paragraph11_survey?.confidence || extraction.paragraph11?.confidence || 0
      },
      paragraph13_custom: {
        filled_text: extraction.paragraph13?.value || extraction.paragraph13?.text || null,
        raw_text: extraction.paragraph13?.raw_text || '',
        confidence: extraction.paragraph13?.confidence || 0
      },
      paragraph14_contingency: {
        has_contingency: extraction.paragraph14?.value || extraction.paragraph14?.has_contingency || false,
        raw_text: extraction.paragraph14?.raw_text || '',
        confidence: extraction.paragraph14?.confidence || 0
      },
      paragraph15_warranty: {
        has_warranty: extraction.paragraph15_home_warranty?.value || extraction.paragraph15?.value || false,
        checkbox_b_selected: extraction.paragraph15?.checkbox_b || false,
        checkbox_b_data: extraction.paragraph15?.checkbox_b_data,
        raw_text: extraction.paragraph15_home_warranty?.raw_text || extraction.paragraph15?.raw_text || '',
        confidence: extraction.paragraph15_home_warranty?.confidence || extraction.paragraph15?.confidence || 0
      },
      paragraph16_checkbox: {
        selected_option: extraction.paragraph16?.value || null,
        raw_text: extraction.paragraph16?.raw_text || '',
        confidence: extraction.paragraph16?.confidence || 0
      },
      paragraph18_checkbox: {
        selected_option: extraction.paragraph18?.value || null,
        raw_text: extraction.paragraph18?.raw_text || '',
        confidence: extraction.paragraph18?.confidence || 0
      },
      paragraph19_checkbox: {
        selected_option: extraction.paragraph19?.value || null,
        raw_text: extraction.paragraph19?.raw_text || '',
        confidence: extraction.paragraph19?.confidence || 0
      },
      paragraph20_checkbox: {
        selected_option: extraction.paragraph20?.value || null,
        raw_text: extraction.paragraph20?.raw_text || '',
        confidence: extraction.paragraph20?.confidence || 0
      },
      paragraph22_date: {
        date: extraction.paragraph22?.value || extraction.paragraph22?.date || null,
        raw_text: extraction.paragraph22?.raw_text || '',
        confidence: extraction.paragraph22?.confidence || 0
      },
      paragraph23_possession: {
        selected_option: extraction.paragraph23?.value || extraction.paragraph23?.option || null,
        raw_text: extraction.paragraph23?.raw_text || '',
        confidence: extraction.paragraph23?.confidence || 0
      },
      paragraph32_custom: {
        filled_text: extraction.paragraph32?.value || extraction.paragraph32?.text || null,
        has_data: extraction.paragraph32?.has_data || false,
        raw_text: extraction.paragraph32?.raw_text || '',
        confidence: extraction.paragraph32?.confidence || 0
      },
      paragraph37_checkbox: {
        selected_option: extraction.paragraph37?.value || null,
        raw_text: extraction.paragraph37?.raw_text || '',
        confidence: extraction.paragraph37?.confidence || 0
      },
      paragraph38_date: {
        date: extraction.paragraph38?.value || extraction.paragraph38?.date || null,
        raw_text: extraction.paragraph38?.raw_text || '',
        confidence: extraction.paragraph38?.confidence || 0
      },
      paragraph39_serial: {
        serial_number: extraction.paragraph39?.value || extraction.paragraph39?.serial || null,
        raw_text: extraction.paragraph39?.raw_text || '',
        confidence: extraction.paragraph39?.confidence || 0
      },
      extraction_metadata: {
        document_name: 'sample_contract.pdf',
        extraction_date: new Date().toISOString(),
        total_pages: 0,
        extraction_method: 'Improved OpenAI GPT-4 with A/B handling',
        overall_confidence: this.calculateConfidence(extraction),
        missing_fields: this.findMissingFields(extraction),
        warnings: []
      }
    };
  }

  private calculateConfidence(data: any): number {
    const confidences: number[] = [];
    for (const key in data) {
      if (data[key]?.confidence) {
        confidences.push(data[key].confidence);
      }
    }
    return confidences.length > 0 ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length) : 0;
  }

  private findMissingFields(data: any): string[] {
    const missing: string[] = [];
    const required = ['paragraph1', 'paragraph3_price', 'paragraph7', 'paragraph38', 'paragraph39'];
    
    for (const field of required) {
      if (!data[field] || data[field].confidence < 30) {
        missing.push(field);
      }
    }
    return missing;
  }

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
      ['Earnest Money', fields.paragraph7_earnest_money.has_earnest_money ? 'Yes' : 'No', fields.paragraph7_earnest_money.confidence.toString()],
      ['Non-refundable', fields.paragraph8_nonrefundable.is_nonrefundable ? 'Yes' : 'No', fields.paragraph8_nonrefundable.confidence.toString()],
      ['Title Option', fields.paragraph10_title.selected_option || '', fields.paragraph10_title.confidence.toString()],
      ['Survey Pays', fields.paragraph11_survey.who_pays || '', fields.paragraph11_survey.confidence.toString()],
      ['Contingency', fields.paragraph14_contingency.has_contingency ? 'Yes' : 'No', fields.paragraph14_contingency.confidence.toString()],
      ['Home Warranty', fields.paragraph15_warranty.has_warranty ? 'Yes' : 'No', fields.paragraph15_warranty.confidence.toString()],
      ['Contract Serial', fields.paragraph39_serial.serial_number || '', fields.paragraph39_serial.confidence.toString()]
    ];

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  private toSummary(fields: ArkansasContractFields): string {
    return `
IMPROVED ARKANSAS CONTRACT EXTRACTION
======================================
Extraction Method: ${fields.extraction_metadata.extraction_method}
Overall Confidence: ${fields.extraction_metadata.overall_confidence}%

KEY FIELDS:
-----------
• Buyers: ${fields.paragraph1_parties.buyer_names?.join(', ') || 'Not found'}
• Property: ${fields.paragraph1_parties.property_address || 'Not found'}
• Purchase Price: $${fields.paragraph3_purchase_price.amount?.toLocaleString() || 'Not found'}
• Loan Type: ${fields.paragraph3_loan_type.type || 'Not found'}
• Earnest Money (Para 7): ${fields.paragraph7_earnest_money.has_earnest_money ? 'YES' : 'NO'} [${fields.paragraph7_earnest_money.confidence}% conf]
• Non-refundable (Para 8): ${fields.paragraph8_nonrefundable.is_nonrefundable ? 'YES' : 'NO'} [${fields.paragraph8_nonrefundable.confidence}% conf]
• Title Option (Para 10): ${fields.paragraph10_title.selected_option || 'Not selected'} [${fields.paragraph10_title.confidence}% conf]
• Survey (Para 11): ${fields.paragraph11_survey.who_pays ? `${fields.paragraph11_survey.who_pays} pays` : 'Not specified'} [${fields.paragraph11_survey.confidence}% conf]
• Home Warranty (Para 15): ${fields.paragraph15_warranty.has_warranty ? 'YES' : 'NO'} [${fields.paragraph15_warranty.confidence}% conf]
• Contract Date: ${fields.paragraph38_date.date || 'Not found'}
• Serial Number: ${fields.paragraph39_serial.serial_number || 'Not found'}

Missing Fields: ${fields.extraction_metadata.missing_fields.join(', ') || 'None'}
    `;
  }
}