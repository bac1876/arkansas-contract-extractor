/**
 * COMPLETE Arkansas Contract Extraction - ALL FIELDS
 * This extracts EVERY field from the contract using Vision API
 */

import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';

dotenv.config();

interface CompleteContractData {
  // Para 1 - Parties & Property
  buyers: string[];
  sellers: string[];
  property_address: string;
  
  // Para 2 - Property Type
  property_type: string;
  
  // Para 3 - Purchase Details
  purchase_type: 'FINANCED' | 'CASH' | 'LOAN_ASSUMPTION';
  purchase_price: number | null;
  cash_amount: number | null;
  loan_type: string | null;
  para3_option_checked: string;
  
  // Para 4 - Agency - REMOVED per user requirements
  
  // Para 5 - Loan Costs
  para5_amounts: string[];
  para5_custom_text: string;
  seller_concessions: string;
  
  // Para 6 - Appraisal
  appraisal_option: string;
  appraisal_details: string;
  
  // Para 7 - Earnest Money
  earnest_money: 'YES' | 'NO';
  earnest_money_amount: number | null;
  earnest_money_held_by: string;
  
  // Para 8 - Non-refundable
  non_refundable: 'YES' | 'NO';
  non_refundable_amount: number | null;
  non_refundable_when: string;
  
  // Para 10 - Title
  title_option: string;
  
  // Para 11 - Survey
  survey_option: string;
  survey_details: string;
  
  // Para 13 - Personal Property
  personal_property: string;
  appliances_included: string;
  
  // Para 14 - Contingencies
  contingency: 'YES' | 'NO';
  contingency_details: string;
  
  // Para 15 - Home Warranty
  home_warranty: 'YES' | 'NO';
  warranty_details: string;
  warranty_paid_by: string;
  
  // Para 16 - Inspection
  inspection_option: string;
  inspection_details: string;
  
  // Para 18 - Wood Infestation
  wood_infestation: string;
  
  // Para 19 - Termite
  termite_option: string;
  
  // Para 20 - Lead Paint
  lead_paint_option: string;
  
  // Para 22 - Contract Date
  contract_date: string;
  
  // Para 23 - Possession
  possession_option: string;
  possession_details: string;
  
  // Para 32 - Additional Terms
  additional_terms: string;
  
  // Para 37 - Checkbox
  para37_option: string;
  
  // Para 38 - Acceptance Date
  acceptance_date: string;
  
  // Para 39 - Serial
  serial_number: string;
  
  // Additional dates
  closing_date: string;
  inspection_deadline: string;
  financing_deadline: string;
}

class CompleteContractExtractor {
  private openai: OpenAI;
  private contractName: string;
  private pagesDir: string;

  constructor(contractName: string) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.contractName = contractName;
    this.pagesDir = contractName === 'test_contract2.pdf' ? './contract2_pages' : './pages';
  }

  async extractPage1(): Promise<Partial<CompleteContractData>> {
    console.log('📄 Extracting Page 1 (Parties, Property, Purchase)...');
    const img = await fs.readFile(`${this.pagesDir}/page1.png`);
    
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
    } catch (e) {
      console.log('  Parse error, returning empty object');
      return {};
    }
  }

  async extractPage3(): Promise<Partial<CompleteContractData>> {
    console.log('📄 Extracting Page 3 (Agency)...');
    const img = await fs.readFile(`${this.pagesDir}/page3.png`);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
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
    } catch (e) {
      console.log('  Parse error, returning empty object');
      return {};
    }
  }

  async extractPage4(): Promise<Partial<CompleteContractData>> {
    console.log('📄 Extracting Page 4 (Financial Terms)...');
    const img = await fs.readFile(`${this.pagesDir}/page4.png`);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
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
- If Yes, what is the AMOUNT? (look for $ amount)
- WHO holds it? (look for "held by" or broker/title company name)

PARAGRAPH 8 - NON-REFUNDABLE DEPOSIT:
- Is deposit non-refundable? (A. Yes or B. No)
- If Yes, what AMOUNT becomes non-refundable?
- WHEN does it become non-refundable? (date or days)

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
  "non_refundable": "YES" or "NO",
  "non_refundable_amount": number or null,
  "non_refundable_when": "when it becomes non-refundable" or null
}`
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
    } catch (e) {
      console.log('  Parse error, returning empty object');
      return {};
    }
  }

  async extractPage5(): Promise<Partial<CompleteContractData>> {
    console.log('📄 Extracting Page 5 (Title)...');
    const img = await fs.readFile(`${this.pagesDir}/page5.png`);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract PARAGRAPH 10 - TITLE AND CLOSING:
Which option is checked?
A. Seller provides warranty deed
B. Seller provides title insurance
C. Buyer pays for title insurance

Return JSON:
{
  "title_option": "A" or "B" or "C"
}`
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
    } catch (e) {
      console.log('  Parse error, returning empty object');
      return {};
    }
  }

  async extractPage6(): Promise<Partial<CompleteContractData>> {
    console.log('📄 Extracting Page 6 (Survey & Fixtures)...');
    const img = await fs.readFile(`${this.pagesDir}/page6.png`);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
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
    } catch (e) {
      console.log('  Parse error, returning empty object');
      return {};
    }
  }

  async extractPage7(): Promise<Partial<CompleteContractData>> {
    console.log('📄 Extracting Page 7 (Contingencies)...');
    const img = await fs.readFile(`${this.pagesDir}/page7.png`);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract PARAGRAPH 14 - OTHER CONTINGENCY:

- Which option is checked? (Look for X or checkmark)
  A. No Other Contingency (Except for conditions listed elsewhere)
  B. This Real Estate Contract is contingent upon: [look for text/date after this]

- If option B is checked, what is written in the blank lines? (dates, conditions, etc.)

Return JSON:
{
  "contingency": "YES" if option B is checked or "NO" if option A is checked,
  "contingency_details": "the complete text written after 'contingent upon:' including any dates" or null
}`
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
    } catch (e) {
      console.log('  Parse error, returning empty object');
      return {};
    }
  }

  async extractPage8(): Promise<Partial<CompleteContractData>> {
    console.log('📄 Extracting Page 8 (Warranty & Inspection)...');
    const img = await fs.readFile(`${this.pagesDir}/page8.png`);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract:

PARAGRAPH 15 - HOME WARRANTY:
- Is warranty included? (A. Yes or B. No)
- If Yes, warranty details
- Who pays for warranty?
- If No, what text follows option B?

PARAGRAPH 16 - INSPECTION AND REPAIRS:
- Which option is checked? (A, B, C, or D)
- What does the option mean?

Return JSON:
{
  "home_warranty": "YES" or "NO",
  "warranty_details": "warranty company and plan" or null,
  "warranty_paid_by": "who pays" or null,
  "inspection_option": "A" or "B" or "C" or "D",
  "inspection_details": "what the option means"
}`
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
    } catch (e) {
      console.log('  Parse error, returning empty object');
      return {};
    }
  }

  async extractPages10to16(): Promise<Partial<CompleteContractData>> {
    console.log('📄 Extracting Pages 10-16 (Remaining Terms)...');
    const results: any = {};

    // Page 10 - Wood/Termite
    try {
      const img10 = await fs.readFile(`${this.pagesDir}/page10.png`);
      const resp10 = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Extract Para 18 Wood Infestation (A/B/C/D) and Para 19 Termite (A/B/C). Return: {"wood_infestation": "letter", "termite_option": "letter"}` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img10.toString('base64')}`, detail: "high" } }
          ]
        }],
        max_tokens: 100
      });
      Object.assign(results, JSON.parse(resp10.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
    } catch (e) { console.log('  Page 10 error'); }

    // Page 11 - Lead Paint
    try {
      const img11 = await fs.readFile(`${this.pagesDir}/page11.png`);
      const resp11 = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Extract Para 20 Lead Paint option (A=not pre-1978, B=10-day inspection, C=waive, D=other). Return: {"lead_paint_option": "letter"}` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img11.toString('base64')}`, detail: "high" } }
          ]
        }],
        max_tokens: 100
      });
      Object.assign(results, JSON.parse(resp11.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
    } catch (e) { console.log('  Page 11 error'); }

    // Page 12 - Contract Date AND Closing Date
    try {
      const img12 = await fs.readFile(`${this.pagesDir}/page12.png`);
      const resp12 = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Extract from this page:
1. Paragraph 22 - Contract date (look for date after "executed this")
2. CLOSING DATE - Look for "Closing shall be on or before" followed by a date
Return: {"contract_date": "date", "closing_date": "date"}` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img12.toString('base64')}`, detail: "high" } }
          ]
        }],
        max_tokens: 150
      });
      Object.assign(results, JSON.parse(resp12.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
    } catch (e) { console.log('  Page 12 error'); }

    // Page 13 - Possession
    try {
      const img13 = await fs.readFile(`${this.pagesDir}/page13.png`);
      const resp13 = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Extract Para 23 Possession (A=Upon closing, B=Days after, C=Other). Return: {"possession_option": "letter", "possession_details": "details if B or C"}` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img13.toString('base64')}`, detail: "high" } }
          ]
        }],
        max_tokens: 150
      });
      Object.assign(results, JSON.parse(resp13.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
    } catch (e) { console.log('  Page 13 error'); }

    // Page 14 - Additional Terms
    try {
      const img14 = await fs.readFile(`${this.pagesDir}/page14.png`);
      const resp14 = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Extract Para 32 Additional Terms - ALL custom text. Return: {"additional_terms": "all text"}` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img14.toString('base64')}`, detail: "high" } }
          ]
        }],
        max_tokens: 400
      });
      Object.assign(results, JSON.parse(resp14.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
    } catch (e) { console.log('  Page 14 error'); }

    // Page 15 - Para 37
    try {
      const img15 = await fs.readFile(`${this.pagesDir}/page15.png`);
      const resp15 = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Extract Para 37 checkbox option (A/B/C/D). Return: {"para37_option": "letter"}` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img15.toString('base64')}`, detail: "high" } }
          ]
        }],
        max_tokens: 100
      });
      Object.assign(results, JSON.parse(resp15.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
    } catch (e) { console.log('  Page 15 error'); }

    // Page 16 - Dates and Serial
    try {
      const img16 = await fs.readFile(`${this.pagesDir}/page16.png`);
      const resp16 = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Extract Para 38 acceptance date and Para 39 serial number. Return: {"acceptance_date": "date", "serial_number": "number"}` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img16.toString('base64')}`, detail: "high" } }
          ]
        }],
        max_tokens: 150
      });
      Object.assign(results, JSON.parse(resp16.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
    } catch (e) { console.log('  Page 16 error'); }

    return results;
  }

  async extractComplete(contractPath: string): Promise<CompleteContractData> {
    console.log(`\nExtracting ALL Fields from ${contractPath}`);
    console.log('='.repeat(60) + '\n');

    // Extract from each page group
    const page1Data = await this.extractPage1();
    // SKIP Page 2 and 3 - not needed per user requirements
    const page4Data = await this.extractPage4();
    const page5Data = await this.extractPage5();
    const page6Data = await this.extractPage6();
    const page7Data = await this.extractPage7();
    const page8Data = await this.extractPage8();
    const otherPagesData = await this.extractPages10to16();

    // Combine all data
    const completeData: any = {
      ...page1Data,
      ...page4Data,
      ...page5Data,
      ...page6Data,
      ...page7Data,
      ...page8Data,
      ...otherPagesData
    };

    console.log('\n✅ Extraction Complete\n');
    return completeData;
  }

  async saveToCSV(data: CompleteContractData, outputFile: string) {
    // Define ALL fields for CSV
    const fieldMappings = [
      // Parties & Property
      { key: 'buyers', label: 'Buyers', transform: (v: any) => Array.isArray(v) ? v.join('; ') : v },
      { key: 'sellers', label: 'Sellers', transform: (v: any) => Array.isArray(v) ? v.join('; ') : v },
      { key: 'property_address', label: 'Property Address' },
      { key: 'property_type', label: 'Property Type' },
      
      // Purchase Details
      { key: 'purchase_type', label: 'Purchase Type' },
      { key: 'purchase_price', label: 'Purchase Price' },
      { key: 'cash_amount', label: 'Cash Amount' },
      { key: 'loan_type', label: 'Loan Type' },
      
      // Agency - REMOVED per user requirements
      
      // Financial Terms
      { key: 'para5_amounts', label: 'Para 5 Amounts', transform: (v: any) => Array.isArray(v) ? v.join('; ') : v },
      { key: 'para5_custom_text', label: 'Para 5 Custom Text' },
      { key: 'seller_concessions', label: 'Seller Concessions' },
      { key: 'appraisal_option', label: 'Appraisal (Para 6)' },
      { key: 'earnest_money', label: 'Earnest Money (Para 7)' },
      { key: 'earnest_money_amount', label: 'Earnest Money Amount' },
      { key: 'earnest_money_held_by', label: 'Earnest Money Holder' },
      { key: 'non_refundable', label: 'Non-refundable (Para 8)' },
      { key: 'non_refundable_amount', label: 'Non-refundable Amount' },
      { key: 'non_refundable_when', label: 'Non-refundable When' },
      
      // Terms
      { key: 'title_option', label: 'Title (Para 10)' },
      { key: 'survey_option', label: 'Survey (Para 11)' },
      { key: 'survey_details', label: 'Survey Details' },
      { key: 'para13_items_included', label: 'Para 13 Items Included' },
      { key: 'para13_items_excluded', label: 'Para 13 Items Excluded' },
      { key: 'contingency', label: 'Contingency (Para 14)' },
      { key: 'contingency_details', label: 'Contingency Details' },
      { key: 'home_warranty', label: 'Home Warranty (Para 15)' },
      { key: 'warranty_details', label: 'Warranty Details' },
      { key: 'warranty_paid_by', label: 'Warranty Paid By' },
      { key: 'inspection_option', label: 'Inspection (Para 16)' },
      { key: 'inspection_details', label: 'Inspection Details' },
      { key: 'wood_infestation', label: 'Wood Infestation (Para 18)' },
      { key: 'termite_option', label: 'Termite (Para 19)' },
      { key: 'lead_paint_option', label: 'Lead Paint (Para 20)' },
      
      // Dates
      { key: 'contract_date', label: 'Contract Date (Para 22)' },
      { key: 'closing_date', label: 'Closing Date' },
      { key: 'acceptance_date', label: 'Acceptance Date (Para 38)' },
      
      // Possession & Additional
      { key: 'possession_option', label: 'Possession (Para 23)' },
      { key: 'possession_details', label: 'Possession Details' },
      { key: 'additional_terms', label: 'Additional Terms (Para 32)' },
      { key: 'para37_option', label: 'Para 37 Option' },
      { key: 'serial_number', label: 'Serial Number (Para 39)' }
    ];

    // Create CSV header
    const headers = fieldMappings.map(f => f.label);
    
    // Create data row
    const row = fieldMappings.map(field => {
      const value = (data as any)[field.key];
      if (value === null || value === undefined) return '';
      if (field.transform) return field.transform(value);
      return String(value);
    });

    // Format as CSV
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      row.map(v => `"${v.replace(/"/g, '""')}"`).join(',')
    ].join('\n');

    await fs.writeFile(outputFile, csvContent);
    console.log(`✓ CSV saved to ${outputFile}`);
    
    // Count filled fields
    const filledCount = row.filter(v => v !== '').length;
    console.log(`📊 Extracted ${filledCount} out of ${fieldMappings.length} fields (${Math.round(filledCount/fieldMappings.length*100)}%)`);
  }
}

// Main execution
async function main() {
  const contractName = process.argv[2] || 'test_contract2.pdf';
  const extractor = new CompleteContractExtractor(contractName);
  
  try {
    const completeData = await extractor.extractComplete(contractName);
    
    // Save JSON
    const jsonFile = contractName.replace('.pdf', '_COMPLETE.json');
    await fs.writeFile(jsonFile, JSON.stringify(completeData, null, 2));
    console.log(`✓ JSON saved to ${jsonFile}`);
    
    // Save CSV
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const csvFile = contractName.replace('.pdf', `_COMPLETE_${timestamp}.csv`);
    await extractor.saveToCSV(completeData as CompleteContractData, csvFile);
    
    // Display summary
    console.log('\n📋 EXTRACTION SUMMARY:');
    console.log(`   Buyers: ${completeData.buyers?.join(', ') || 'Not found'}`);
    console.log(`   Property: ${completeData.property_address || 'Not found'}`);
    console.log(`   Type: ${completeData.purchase_type || 'Not found'}`);
    
    if (completeData.purchase_type === 'CASH') {
      console.log(`   Cash Amount: $${completeData.cash_amount?.toLocaleString() || 'Not found'}`);
    } else {
      console.log(`   Purchase Price: $${completeData.purchase_price?.toLocaleString() || 'Not found'}`);
      console.log(`   Loan Type: ${completeData.loan_type || 'Not found'}`);
    }
    
    console.log(`   Earnest Money: ${completeData.earnest_money} ${completeData.earnest_money_amount ? '($' + completeData.earnest_money_amount.toLocaleString() + ')' : ''}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);