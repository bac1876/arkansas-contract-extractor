/**
 * Arkansas Contract Specific Field Extractor
 * Extracts only the specific fields requested from standard Arkansas RE contracts
 */

import { Agent, Skill } from '@smythos/sdk';
import { ArkansasContractFields, ExtractionHints } from '../schemas/arkansas-specific-fields.schema';
import * as pdfParse from 'pdf-parse';
import * as fs from 'fs/promises';

export class ArkansasSpecificExtractor {
  private agent: Agent;

  constructor() {
    this.agent = new Agent({
      name: 'ArkansasFieldExtractor',
      model: 'gpt-4o',
      behavior: `You are an expert at extracting specific fields from Arkansas real estate contracts.
        You focus ONLY on the requested paragraph numbers and checkboxes.
        You identify checkbox selections (A, B, C, etc.) accurately.
        You extract fill-in data exactly as written.
        You recognize dates, amounts, and serial numbers precisely.`,
      temperature: 0.1, // Very low for accuracy
      maxTokens: 4000
    });

    this.setupSkills();
  }

  private setupSkills() {
    // Main extraction skill
    this.agent.addSkill({
      name: 'extractSpecificFields',
      description: 'Extract only the specific requested fields from Arkansas contract',
      parameters: {
        contractText: {
          type: 'string',
          description: 'Full text of the contract',
          required: true
        }
      },
      process: async ({ contractText }) => {
        const prompt = `
          Extract ONLY these specific fields from this Arkansas real estate contract.
          Look for paragraph numbers and checkbox selections.
          
          CONTRACT TEXT:
          ${contractText}
          
          EXTRACT THESE EXACT FIELDS:
          
          1. From Paragraph 1 (PARTIES): Extract buyer names and property address
          
          2. From Paragraph 3: 
             - Purchase price amount
             - Loan type (FHA/VA/Conventional/Cash/Other)
          
          3. From Paragraph 5: Extract ALL data from blank fill-in lines
          
          4. From Paragraph 7: Is there earnest money? (Yes/No) and amount if yes
          
          5. From Paragraph 8: Is deposit non-refundable? (Yes/No)
          
          6. From Paragraph 10 (TITLE): Which checkbox - A, B, or C?
          
          7. From Paragraph 11 (SURVEY):
             - Is survey required?
             - Who pays: Buyer, Seller, or Split equally?
          
          8. From Paragraph 13: Any text in fill-in section
          
          9. From Paragraph 14: Is there a contingency? (Yes/No)
          
          10. From Paragraph 15 (HOME WARRANTY):
              - Is there a warranty? (Yes/No)
              - If checkbox B is selected, what data is typed in?
          
          11. From Paragraph 16: Which checkbox is selected (A or B)?
          
          12. From Paragraph 18: Which checkbox is selected?
          
          13. From Paragraph 19: Which checkbox is selected?
          
          14. From Paragraph 20: Which checkbox is selected?
          
          15. From Paragraph 22: What date is inserted?
          
          16. From Paragraph 23 (POSSESSION): Which checkbox is selected?
          
          17. From Paragraph 32: Extract data from fill-in section if present
          
          18. From Paragraph 37: Which checkbox is selected?
          
          19. From Paragraph 38: What date is shown?
          
          20. From Paragraph 39: What is the contract serial number?
          
          Return as structured JSON with confidence scores for each field.
          For checkboxes, indicate which option (A, B, C, etc.) is selected.
          For yes/no questions, return boolean true/false.
          For fill-in sections, return the exact text as written.
        `;

        const extraction = await this.agent.prompt(prompt);
        return this.parseExtraction(extraction);
      }
    });

    // PDF parsing skill
    this.agent.addSkill({
      name: 'parsePDF',
      description: 'Extract text from PDF contract',
      parameters: {
        filePath: {
          type: 'string',
          description: 'Path to PDF file',
          required: true
        }
      },
      process: async ({ filePath }) => {
        try {
          const dataBuffer = await fs.readFile(filePath);
          const pdfData = await pdfParse(dataBuffer);
          
          return {
            text: pdfData.text,
            pages: pdfData.numpages,
            info: pdfData.info
          };
        } catch (error) {
          throw new Error(`Failed to parse PDF: ${error.message}`);
        }
      }
    });

    // Checkbox detection skill
    this.agent.addSkill({
      name: 'detectCheckboxes',
      description: 'Identify which checkboxes are selected in a paragraph',
      parameters: {
        paragraphText: {
          type: 'string',
          description: 'Text from a specific paragraph',
          required: true
        },
        paragraphNumber: {
          type: 'number',
          description: 'Paragraph number',
          required: true
        }
      },
      process: async ({ paragraphText, paragraphNumber }) => {
        const prompt = `
          In paragraph ${paragraphNumber}, identify which checkbox is selected:
          
          Text: ${paragraphText}
          
          Look for:
          - [X] or [✓] indicating selected checkbox
          - ( ) vs (X) for radio buttons
          - □ vs ☑ for checkboxes
          - Words like "Option A", "Choice B", etc.
          
          Return: { selected: "A" | "B" | "C" | null, confidence: 0-100 }
        `;

        const result = await this.agent.prompt(prompt);
        return JSON.parse(result);
      }
    });

    // Date extraction skill
    this.agent.addSkill({
      name: 'extractDates',
      description: 'Extract dates from specific paragraphs',
      parameters: {
        text: {
          type: 'string',
          description: 'Text containing dates',
          required: true
        }
      },
      process: async ({ text }) => {
        const prompt = `
          Extract all dates from this text:
          ${text}
          
          Look for formats like:
          - MM/DD/YYYY
          - MM-DD-YYYY
          - Month DD, YYYY
          - Written dates
          
          Return as array of dates in MM/DD/YYYY format.
        `;

        const dates = await this.agent.prompt(prompt);
        return JSON.parse(dates);
      }
    });
  }

  private parseExtraction(extraction: string): ArkansasContractFields {
    try {
      const parsed = JSON.parse(extraction);
      
      // Map the extraction to our schema
      return {
        paragraph1_parties: parsed.paragraph1 || { raw_text: '', confidence: 0 },
        paragraph3_purchase_price: parsed.paragraph3_price || { amount: null, raw_text: '', confidence: 0 },
        paragraph3_loan_type: parsed.paragraph3_loan || { type: null, raw_text: '', confidence: 0 },
        paragraph5_blanks: parsed.paragraph5 || { all_filled_data: [], raw_text: '', confidence: 0 },
        paragraph7_earnest_money: parsed.paragraph7 || { has_earnest_money: false, raw_text: '', confidence: 0 },
        paragraph8_nonrefundable: parsed.paragraph8 || { is_nonrefundable: false, raw_text: '', confidence: 0 },
        paragraph10_title: parsed.paragraph10 || { selected_option: null, description: '', raw_text: '', confidence: 0 },
        paragraph11_survey: parsed.paragraph11 || { survey_required: false, who_pays: null, raw_text: '', confidence: 0 },
        paragraph13_custom: parsed.paragraph13 || { filled_text: null, raw_text: '', confidence: 0 },
        paragraph14_contingency: parsed.paragraph14 || { has_contingency: false, raw_text: '', confidence: 0 },
        paragraph15_warranty: parsed.paragraph15 || { has_warranty: false, checkbox_b_selected: false, raw_text: '', confidence: 0 },
        paragraph16_checkbox: parsed.paragraph16 || { selected_option: null, raw_text: '', confidence: 0 },
        paragraph18_checkbox: parsed.paragraph18 || { selected_option: null, raw_text: '', confidence: 0 },
        paragraph19_checkbox: parsed.paragraph19 || { selected_option: null, raw_text: '', confidence: 0 },
        paragraph20_checkbox: parsed.paragraph20 || { selected_option: null, raw_text: '', confidence: 0 },
        paragraph22_date: parsed.paragraph22 || { date: null, raw_text: '', confidence: 0 },
        paragraph23_possession: parsed.paragraph23 || { selected_option: null, raw_text: '', confidence: 0 },
        paragraph32_custom: parsed.paragraph32 || { filled_text: null, has_data: false, raw_text: '', confidence: 0 },
        paragraph37_checkbox: parsed.paragraph37 || { selected_option: null, raw_text: '', confidence: 0 },
        paragraph38_date: parsed.paragraph38 || { date: null, raw_text: '', confidence: 0 },
        paragraph39_serial: parsed.paragraph39 || { serial_number: null, raw_text: '', confidence: 0 },
        extraction_metadata: {
          document_name: parsed.document_name || 'unknown',
          extraction_date: new Date().toISOString(),
          total_pages: parsed.total_pages || 0,
          extraction_method: 'SmythOS AI Agent',
          overall_confidence: this.calculateOverallConfidence(parsed),
          missing_fields: this.identifyMissingFields(parsed),
          warnings: parsed.warnings || []
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse extraction results: ${error.message}`);
    }
  }

  private calculateOverallConfidence(data: any): number {
    const confidences = [];
    Object.values(data).forEach(field => {
      if (field && typeof field === 'object' && 'confidence' in field) {
        confidences.push(field.confidence);
      }
    });
    
    if (confidences.length === 0) return 0;
    return Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length);
  }

  private identifyMissingFields(data: any): string[] {
    const missing = [];
    const requiredFields = [
      'paragraph1', 'paragraph3_price', 'paragraph7',
      'paragraph22', 'paragraph38', 'paragraph39'
    ];
    
    requiredFields.forEach(field => {
      if (!data[field] || (data[field].confidence && data[field].confidence < 50)) {
        missing.push(field);
      }
    });
    
    return missing;
  }

  // Main processing method
  async processContract(filePath: string): Promise<ArkansasContractFields> {
    // Parse PDF
    const pdfData = await this.agent.execute('parsePDF', { filePath });
    
    // Extract specific fields
    const extractedFields = await this.agent.execute('extractSpecificFields', {
      contractText: pdfData.text
    });
    
    return extractedFields;
  }

  // Export method for simple results
  async exportResults(fields: ArkansasContractFields, format: 'json' | 'csv' | 'summary' = 'json'): Promise<string> {
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
      ['Parties', fields.paragraph1_parties.raw_text, fields.paragraph1_parties.confidence],
      ['Purchase Price', fields.paragraph3_purchase_price.amount?.toString() || '', fields.paragraph3_purchase_price.confidence],
      ['Loan Type', fields.paragraph3_loan_type.type || '', fields.paragraph3_loan_type.confidence],
      ['Earnest Money', fields.paragraph7_earnest_money.has_earnest_money ? 'Yes' : 'No', fields.paragraph7_earnest_money.confidence],
      ['Non-refundable', fields.paragraph8_nonrefundable.is_nonrefundable ? 'Yes' : 'No', fields.paragraph8_nonrefundable.confidence],
      ['Title Option', fields.paragraph10_title.selected_option || '', fields.paragraph10_title.confidence],
      ['Survey Pays', fields.paragraph11_survey.who_pays || '', fields.paragraph11_survey.confidence],
      ['Contingency', fields.paragraph14_contingency.has_contingency ? 'Yes' : 'No', fields.paragraph14_contingency.confidence],
      ['Home Warranty', fields.paragraph15_warranty.has_warranty ? 'Yes' : 'No', fields.paragraph15_warranty.confidence],
      ['Closing Date', fields.paragraph22_date.date || '', fields.paragraph22_date.confidence],
      ['Contract Date', fields.paragraph38_date.date || '', fields.paragraph38_date.confidence],
      ['Serial Number', fields.paragraph39_serial.serial_number || '', fields.paragraph39_serial.confidence]
    ];

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  private toSummary(fields: ArkansasContractFields): string {
    return `
ARKANSAS CONTRACT EXTRACTION SUMMARY
=====================================
Document: ${fields.extraction_metadata.document_name}
Extracted: ${fields.extraction_metadata.extraction_date}
Overall Confidence: ${fields.extraction_metadata.overall_confidence}%

KEY FIELDS:
-----------
• Parties (Para 1): ${fields.paragraph1_parties.raw_text}
• Purchase Price (Para 3): $${fields.paragraph3_purchase_price.amount || 'Not found'}
• Loan Type: ${fields.paragraph3_loan_type.type || 'Not specified'}
• Earnest Money (Para 7): ${fields.paragraph7_earnest_money.has_earnest_money ? 'Yes' : 'No'}
• Non-refundable (Para 8): ${fields.paragraph8_nonrefundable.is_nonrefundable ? 'Yes' : 'No'}
• Title Option (Para 10): ${fields.paragraph10_title.selected_option || 'Not selected'}
• Survey Payment (Para 11): ${fields.paragraph11_survey.who_pays || 'Not specified'}
• Contingency (Para 14): ${fields.paragraph14_contingency.has_contingency ? 'Yes' : 'No'}
• Home Warranty (Para 15): ${fields.paragraph15_warranty.has_warranty ? 'Yes' : 'No'}
• Possession (Para 23): ${fields.paragraph23_possession.selected_option || 'Not specified'}
• Contract Date (Para 38): ${fields.paragraph38_date.date || 'Not found'}
• Serial Number (Para 39): ${fields.paragraph39_serial.serial_number || 'Not found'}

MISSING FIELDS: ${fields.extraction_metadata.missing_fields.join(', ') || 'None'}
WARNINGS: ${fields.extraction_metadata.warnings.join(', ') || 'None'}
    `;
  }

  getAgent(): Agent {
    return this.agent;
  }
}