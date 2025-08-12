/**
 * Standalone Arkansas Contract Field Extractor
 * Can work independently or integrate with SmythOS
 */

const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';
import { ArkansasContractFields } from '../schemas/arkansas-specific-fields.schema';

export class StandaloneExtractor {
  private apiKey: string | undefined;
  private model: string = 'gpt-4';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
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

  // Extract specific fields from contract text
  async extractFields(contractText: string): Promise<ArkansasContractFields> {
    // For now, we'll use pattern matching and text analysis
    // In production, this would call OpenAI API or SmythOS
    
    const results: ArkansasContractFields = {
      paragraph1_parties: this.extractParagraph1(contractText),
      paragraph3_purchase_price: this.extractPurchasePrice(contractText),
      paragraph3_loan_type: this.extractLoanType(contractText),
      paragraph5_blanks: this.extractParagraph5Blanks(contractText),
      paragraph7_earnest_money: this.extractEarnestMoney(contractText),
      paragraph8_nonrefundable: this.extractNonRefundable(contractText),
      paragraph10_title: this.extractTitleOption(contractText),
      paragraph11_survey: this.extractSurvey(contractText),
      paragraph13_custom: this.extractCustomText(contractText, 13),
      paragraph14_contingency: this.extractContingency(contractText),
      paragraph15_warranty: this.extractHomeWarranty(contractText),
      paragraph16_checkbox: this.extractCheckbox(contractText, 16),
      paragraph18_checkbox: this.extractCheckbox(contractText, 18),
      paragraph19_checkbox: this.extractCheckbox(contractText, 19),
      paragraph20_checkbox: this.extractCheckbox(contractText, 20),
      paragraph22_date: this.extractDate(contractText, 22),
      paragraph23_possession: this.extractPossession(contractText),
      paragraph32_custom: this.extractCustomText(contractText, 32),
      paragraph37_checkbox: this.extractCheckbox(contractText, 37),
      paragraph38_date: this.extractDate(contractText, 38),
      paragraph39_serial: this.extractSerialNumber(contractText),
      extraction_metadata: {
        document_name: 'sample_contract.pdf',
        extraction_date: new Date().toISOString(),
        total_pages: 0,
        extraction_method: 'Pattern Matching',
        overall_confidence: 75,
        missing_fields: [],
        warnings: []
      }
    };

    return results;
  }

  // Extract parties from Paragraph 1
  private extractParagraph1(text: string): any {
    const buyerPattern = /buyer[s]?[:]\s*([^\n]+)/gi;
    const propertyPattern = /property\s*(?:address|located)?[:]\s*([^\n]+)/gi;
    
    const buyerMatch = text.match(buyerPattern);
    const propertyMatch = text.match(propertyPattern);
    
    return {
      raw_text: buyerMatch?.[0] || '',
      buyer_names: buyerMatch ? [buyerMatch[0].replace(/buyer[s]?[:]\s*/gi, '').trim()] : [],
      property_address: propertyMatch ? propertyMatch[0].replace(/property\s*(?:address|located)?[:]\s*/gi, '').trim() : '',
      confidence: (buyerMatch || propertyMatch) ? 80 : 20
    };
  }

  // Extract purchase price from Paragraph 3
  private extractPurchasePrice(text: string): any {
    const pricePattern = /purchase\s*price[:]\s*\$?([\d,]+)/gi;
    const match = text.match(pricePattern);
    
    if (match) {
      const amount = parseInt(match[0].replace(/[^\d]/g, ''));
      return {
        amount,
        raw_text: match[0],
        confidence: 90
      };
    }
    
    return {
      amount: null,
      raw_text: '',
      confidence: 0
    };
  }

  // Extract loan type from Paragraph 3
  private extractLoanType(text: string): any {
    const loanTypes = ['FHA', 'VA', 'Conventional', 'Cash'];
    let foundType = null;
    
    for (const type of loanTypes) {
      const pattern = new RegExp(`\\[\\s*[X✓]\\s*\\]\\s*${type}|\\(\\s*[X✓]\\s*\\)\\s*${type}|☑\\s*${type}`, 'gi');
      if (pattern.test(text)) {
        foundType = type;
        break;
      }
    }
    
    return {
      type: foundType,
      raw_text: foundType || '',
      confidence: foundType ? 85 : 0
    };
  }

  // Extract blanks from Paragraph 5
  private extractParagraph5Blanks(text: string): any {
    const paragraph5Pattern = /paragraph\s*5[^\n]*\n([^]*?)paragraph\s*6/gi;
    const match = text.match(paragraph5Pattern);
    
    if (match) {
      const blanksPattern = /_{3,}([^_\n]+)_{3,}/g;
      const blanks = [...match[0].matchAll(blanksPattern)].map(m => m[1].trim());
      
      return {
        all_filled_data: blanks,
        raw_text: match[0],
        confidence: blanks.length > 0 ? 70 : 30
      };
    }
    
    return {
      all_filled_data: [],
      raw_text: '',
      confidence: 0
    };
  }

  // Extract earnest money from Paragraph 7
  private extractEarnestMoney(text: string): any {
    const earnestPattern = /earnest\s*money[:]\s*\$?([\d,]+)/gi;
    const match = text.match(earnestPattern);
    
    if (match) {
      const amount = parseInt(match[0].replace(/[^\d]/g, ''));
      return {
        has_earnest_money: true,
        amount,
        raw_text: match[0],
        confidence: 85
      };
    }
    
    return {
      has_earnest_money: false,
      raw_text: '',
      confidence: 50
    };
  }

  // Extract non-refundable status from Paragraph 8
  private extractNonRefundable(text: string): any {
    const nonRefundablePattern = /non[\s-]*refundable/gi;
    const isNonRefundable = nonRefundablePattern.test(text);
    
    return {
      is_nonrefundable: isNonRefundable,
      raw_text: isNonRefundable ? 'Non-refundable' : '',
      confidence: 70
    };
  }

  // Extract title option from Paragraph 10
  private extractTitleOption(text: string): any {
    const titlePattern = /title\s*insurance[^]*?\[([X✓ ])\]\s*A[^]*?\[([X✓ ])\]\s*B[^]*?\[([X✓ ])\]\s*C/gi;
    const match = text.match(titlePattern);
    
    if (match) {
      // Check which checkbox is marked
      if (match[0].includes('[X]') || match[0].includes('[✓]')) {
        const options = ['A', 'B', 'C'];
        for (const opt of options) {
          if (new RegExp(`\\[[X✓]\\]\\s*${opt}`).test(match[0])) {
            return {
              selected_option: opt as 'A' | 'B' | 'C',
              description: opt,
              raw_text: match[0],
              confidence: 80
            };
          }
        }
      }
    }
    
    return {
      selected_option: null,
      description: '',
      raw_text: '',
      confidence: 0
    };
  }

  // Extract survey information from Paragraph 11
  private extractSurvey(text: string): any {
    const surveyPattern = /survey[^]*?buyer[^]*?seller[^]*?split/gi;
    const match = text.match(surveyPattern);
    
    if (match) {
      let whoPays: 'Buyer' | 'Seller' | 'Split' | null = null;
      
      if (/\[[X✓]\]\s*buyer/gi.test(match[0])) whoPays = 'Buyer';
      else if (/\[[X✓]\]\s*seller/gi.test(match[0])) whoPays = 'Seller';
      else if (/\[[X✓]\]\s*split/gi.test(match[0])) whoPays = 'Split';
      
      return {
        survey_required: true,
        who_pays: whoPays,
        raw_text: match[0],
        confidence: whoPays ? 75 : 40
      };
    }
    
    return {
      survey_required: false,
      who_pays: null,
      raw_text: '',
      confidence: 0
    };
  }

  // Extract custom text from specified paragraph
  private extractCustomText(text: string, paragraphNum: number): any {
    const pattern = new RegExp(`paragraph\\s*${paragraphNum}[^]*?([^\\n]{10,})`, 'gi');
    const match = text.match(pattern);
    
    if (match) {
      const customText = match[0].replace(new RegExp(`paragraph\\s*${paragraphNum}`, 'gi'), '').trim();
      return {
        filled_text: customText,
        has_data: customText.length > 10,
        raw_text: match[0],
        confidence: 60
      };
    }
    
    return {
      filled_text: null,
      has_data: false,
      raw_text: '',
      confidence: 0
    };
  }

  // Extract contingency from Paragraph 14
  private extractContingency(text: string): any {
    const contingencyPattern = /contingency|contingent/gi;
    const hasContingency = contingencyPattern.test(text);
    
    return {
      has_contingency: hasContingency,
      type: hasContingency ? 'Standard' : '',
      raw_text: '',
      confidence: 60
    };
  }

  // Extract home warranty from Paragraph 15
  private extractHomeWarranty(text: string): any {
    const warrantyPattern = /home\s*warranty/gi;
    const hasWarranty = warrantyPattern.test(text);
    
    return {
      has_warranty: hasWarranty,
      checkbox_b_selected: false,
      raw_text: '',
      confidence: 60
    };
  }

  // Extract checkbox selection from specified paragraph
  private extractCheckbox(text: string, paragraphNum: number): any {
    const pattern = new RegExp(`paragraph\\s*${paragraphNum}[^]*?\\[([X✓ ])\\]`, 'gi');
    const match = text.match(pattern);
    
    if (match && (match[0].includes('X') || match[0].includes('✓'))) {
      return {
        selected_option: 'A',
        raw_text: match[0],
        confidence: 70
      };
    }
    
    return {
      selected_option: null,
      raw_text: '',
      confidence: 0
    };
  }

  // Extract date from specified paragraph
  private extractDate(text: string, paragraphNum: number): any {
    const pattern = new RegExp(`paragraph\\s*${paragraphNum}[^]*?(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})`, 'gi');
    const match = text.match(pattern);
    
    if (match) {
      const dateMatch = match[0].match(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/);
      return {
        date: dateMatch ? dateMatch[0] : null,
        raw_text: match[0],
        confidence: 75
      };
    }
    
    return {
      date: null,
      raw_text: '',
      confidence: 0
    };
  }

  // Extract possession from Paragraph 23
  private extractPossession(text: string): any {
    const possessionPattern = /possession[^]*?closing[^]*?other/gi;
    const match = text.match(possessionPattern);
    
    if (match) {
      let option = null;
      if (/\[[X✓]\]\s*closing/gi.test(match[0])) option = 'At Closing';
      else if (/\[[X✓]\]\s*other/gi.test(match[0])) option = 'Other';
      
      return {
        selected_option: option,
        raw_text: match[0],
        confidence: option ? 70 : 30
      };
    }
    
    return {
      selected_option: null,
      raw_text: '',
      confidence: 0
    };
  }

  // Extract serial number from Paragraph 39
  private extractSerialNumber(text: string): any {
    const serialPattern = /serial\s*(?:number|#)?[:]\s*([A-Z0-9-]+)/gi;
    const match = text.match(serialPattern);
    
    if (match) {
      const serial = match[0].replace(/serial\s*(?:number|#)?[:]\s*/gi, '').trim();
      return {
        serial_number: serial,
        raw_text: match[0],
        confidence: 80
      };
    }
    
    return {
      serial_number: null,
      raw_text: '',
      confidence: 0
    };
  }

  // Export results in different formats
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
      ['Parties', fields.paragraph1_parties.raw_text, fields.paragraph1_parties.confidence.toString()],
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
ARKANSAS CONTRACT EXTRACTION SUMMARY
=====================================
Document: ${fields.extraction_metadata.document_name}
Extracted: ${fields.extraction_metadata.extraction_date}
Overall Confidence: ${fields.extraction_metadata.overall_confidence}%

KEY FIELDS EXTRACTED:
--------------------
• Parties (Para 1): ${fields.paragraph1_parties.buyer_names?.join(', ') || 'Not found'}
• Property: ${fields.paragraph1_parties.property_address || 'Not found'}
• Purchase Price (Para 3): $${fields.paragraph3_purchase_price.amount || 'Not found'}
• Loan Type: ${fields.paragraph3_loan_type.type || 'Not specified'}
• Earnest Money (Para 7): ${fields.paragraph7_earnest_money.has_earnest_money ? 'Yes' : 'No'}
• Non-refundable (Para 8): ${fields.paragraph8_nonrefundable.is_nonrefundable ? 'Yes' : 'No'}
• Title Option (Para 10): ${fields.paragraph10_title.selected_option || 'Not selected'}
• Survey Payment (Para 11): ${fields.paragraph11_survey.who_pays || 'Not specified'}
• Contingency (Para 14): ${fields.paragraph14_contingency.has_contingency ? 'Yes' : 'No'}
• Home Warranty (Para 15): ${fields.paragraph15_warranty.has_warranty ? 'Yes' : 'No'}
• Contract Serial (Para 39): ${fields.paragraph39_serial.serial_number || 'Not found'}

Note: This is a pattern-matching extraction. For more accurate results, 
integrate with OpenAI API or SmythOS platform.
    `;
  }
}