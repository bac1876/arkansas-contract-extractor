/**
 * Complete contract processing pipeline with CSV output
 */

import { PDFDocument } from 'pdf-lib';
import { pdfToPng } from 'pdf-to-png-converter';
import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface ExtractedData {
  [key: string]: any;
}

class ContractProcessor {
  private openai: OpenAI;
  private contractName: string;
  private pagesDir: string;

  constructor(contractPath: string) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.contractName = path.basename(contractPath, '.pdf');
    this.pagesDir = `./extracted_${this.contractName}`;
  }

  async splitPdf(inputPdf: string): Promise<number> {
    console.log(`Splitting ${inputPdf} into pages...`);
    const pdfBytes = await fs.readFile(inputPdf);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();

    await fs.mkdir(this.pagesDir, { recursive: true });

    for (let i = 0; i < totalPages; i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(copiedPage);
      const pageBytes = await newPdf.save();
      await fs.writeFile(path.join(this.pagesDir, `page${i + 1}.pdf`), pageBytes);
    }

    console.log(`✓ Split into ${totalPages} pages\n`);
    return totalPages;
  }

  async convertToPng(pageNum: number): Promise<Buffer> {
    const pdfPath = path.join(this.pagesDir, `page${pageNum}.pdf`);
    const pdfBuffer = await fs.readFile(pdfPath);
    const pngPages = await pdfToPng(pdfBuffer, {
      disableFontFace: true,
      useSystemFonts: false,
      viewportScale: 2.0,
      pagesToProcess: [1],
    });
    return pngPages[0].content;
  }

  async extractPage1(): Promise<ExtractedData> {
    console.log('📄 Extracting Page 1...');
    const imageBuffer = await this.convertToPng(1);
    const base64Image = imageBuffer.toString('base64');

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract from this Arkansas contract page:
1. Property type (Para 2): Single family/Condo/etc
2. Purchase type (Para 3): Check if 3A (financed) or 3C (cash)
3. If 3A: purchase price and loan type (FHA/VA/CONVENTIONAL/USDA)
4. If 3C: cash amount
5. Property address and buyer names

Return JSON:
{
  "property_type": "type",
  "purchase_type": "FINANCED or CASH",
  "purchase_price": number,
  "cash_amount": number or null,
  "loan_type": "type or CASH",
  "property_address": "address",
  "buyers": ["names"]
}`
          },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: "high" } }
        ]
      }],
      max_tokens: 500,
      temperature: 0.1
    });

    const result = response.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '{}';
    return JSON.parse(result);
  }

  async extractPage3(): Promise<ExtractedData> {
    console.log('📄 Extracting Page 3 (Agency)...');
    const imageBuffer = await this.convertToPng(3);
    const base64Image = imageBuffer.toString('base64');

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract Paragraph 4 - AGENCY. Which option is checked (A, B, C, or D)?
Return JSON: { "agency_option": "A/B/C/D or null" }`
          },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: "high" } }
        ]
      }],
      max_tokens: 200,
      temperature: 0.1
    });

    const result = response.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '{}';
    return JSON.parse(result);
  }

  async extractPage4(): Promise<ExtractedData> {
    console.log('📄 Extracting Page 4...');
    const imageBuffer = await this.convertToPng(4);
    const base64Image = imageBuffer.toString('base64');

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract:
1. Para 5: Any custom text or amounts
2. Para 6 Appraisal: Option A or B
3. Para 7 Earnest Money: YES or NO, amount if yes
4. Para 8 Non-refundable: YES or NO, amount if yes

Return JSON:
{
  "para5_text": "text or null",
  "para6_appraisal": "A/B or null",
  "para7_earnest": "YES/NO",
  "para7_amount": number or null,
  "para8_nonrefundable": "YES/NO",
  "para8_amount": number or null
}`
          },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: "high" } }
        ]
      }],
      max_tokens: 400,
      temperature: 0.1
    });

    const result = response.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '{}';
    return JSON.parse(result);
  }

  async extractOtherPages(): Promise<ExtractedData> {
    console.log('📄 Extracting remaining pages...');
    const results: ExtractedData = {};

    // Page 5 - Title
    try {
      const img5 = await this.convertToPng(5);
      const resp5 = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Extract Para 10 Title option (A/B/C). Return: {"para10_title": "A/B/C or null"}` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img5.toString('base64')}`, detail: "high" } }
          ]
        }],
        max_tokens: 100,
        temperature: 0.1
      });
      Object.assign(results, JSON.parse(resp5.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '{}'));
    } catch (e) { console.log('  Page 5 error'); }

    // Page 6 - Survey
    try {
      const img6 = await this.convertToPng(6);
      const resp6 = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Extract Para 11 Survey (A/B/C or "Buyer declines"). Return: {"para11_survey": "value"}` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img6.toString('base64')}`, detail: "high" } }
          ]
        }],
        max_tokens: 100,
        temperature: 0.1
      });
      Object.assign(results, JSON.parse(resp6.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '{}'));
    } catch (e) { console.log('  Page 6 error'); }

    // Page 7 - Contingency
    try {
      const img7 = await this.convertToPng(7);
      const resp7 = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Extract Para 14 Contingency (YES/NO). Return: {"para14_contingency": "YES/NO"}` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img7.toString('base64')}`, detail: "high" } }
          ]
        }],
        max_tokens: 100,
        temperature: 0.1
      });
      Object.assign(results, JSON.parse(resp7.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '{}'));
    } catch (e) { console.log('  Page 7 error'); }

    // Page 8 - Warranty/Inspection
    try {
      const img8 = await this.convertToPng(8);
      const resp8 = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Extract Para 15 Warranty (YES/NO) and Para 16 Inspection (A/B/C/D). Return: {"para15_warranty": "YES/NO", "para16_inspection": "A/B/C/D"}` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img8.toString('base64')}`, detail: "high" } }
          ]
        }],
        max_tokens: 100,
        temperature: 0.1
      });
      Object.assign(results, JSON.parse(resp8.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '{}'));
    } catch (e) { console.log('  Page 8 error'); }

    // Page 10 - Termite
    try {
      const img10 = await this.convertToPng(10);
      const resp10 = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Extract Para 19 Termite option (A/B/C). Return: {"para19_termite": "A/B/C"}` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img10.toString('base64')}`, detail: "high" } }
          ]
        }],
        max_tokens: 100,
        temperature: 0.1
      });
      Object.assign(results, JSON.parse(resp10.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '{}'));
    } catch (e) { console.log('  Page 10 error'); }

    // Page 11 - Lead Paint
    try {
      const img11 = await this.convertToPng(11);
      const resp11 = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Extract Para 20 Lead Paint option (A/B/C/D). Return: {"para20_lead": "A/B/C/D"}` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img11.toString('base64')}`, detail: "high" } }
          ]
        }],
        max_tokens: 100,
        temperature: 0.1
      });
      Object.assign(results, JSON.parse(resp11.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '{}'));
    } catch (e) { console.log('  Page 11 error'); }

    // Page 13 - Possession
    try {
      const img13 = await this.convertToPng(13);
      const resp13 = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Extract Para 23 Possession (A=Upon closing/B=Days after/C=Other). Return: {"para23_possession": "A/B/C"}` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img13.toString('base64')}`, detail: "high" } }
          ]
        }],
        max_tokens: 100,
        temperature: 0.1
      });
      Object.assign(results, JSON.parse(resp13.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '{}'));
    } catch (e) { console.log('  Page 13 error'); }

    return results;
  }

  async processContract(contractPath: string): Promise<ExtractedData> {
    console.log(`\nProcessing Contract: ${contractPath}`);
    console.log('='.repeat(60) + '\n');

    // Split PDF
    await this.splitPdf(contractPath);

    // Extract from each page
    const page1Data = await this.extractPage1();
    const page3Data = await this.extractPage3();
    const page4Data = await this.extractPage4();
    const otherData = await this.extractOtherPages();

    // Combine all data
    const completeData = {
      ...page1Data,
      ...page3Data,
      ...page4Data,
      ...otherData,
      contract_file: this.contractName
    };

    console.log('\n✓ Extraction complete\n');
    return completeData;
  }

  async saveToCSV(data: ExtractedData, outputFile: string) {
    // Define field mappings for CSV
    const fieldMappings = [
      { key: 'contract_file', label: 'Contract File' },
      { key: 'buyers', label: 'Buyers', transform: (v: any) => Array.isArray(v) ? v.join('; ') : v },
      { key: 'property_address', label: 'Property Address' },
      { key: 'property_type', label: 'Property Type' },
      { key: 'purchase_type', label: 'Purchase Type' },
      { key: 'purchase_price', label: 'Purchase Price' },
      { key: 'cash_amount', label: 'Cash Amount' },
      { key: 'loan_type', label: 'Loan Type' },
      { key: 'agency_option', label: 'Agency (Para 4)' },
      { key: 'para5_text', label: 'Para 5 - Loan Costs' },
      { key: 'para6_appraisal', label: 'Para 6 - Appraisal' },
      { key: 'para7_earnest', label: 'Para 7 - Earnest Money' },
      { key: 'para7_amount', label: 'Para 7 - Earnest Amount' },
      { key: 'para8_nonrefundable', label: 'Para 8 - Non-refundable' },
      { key: 'para8_amount', label: 'Para 8 - Non-refundable Amount' },
      { key: 'para10_title', label: 'Para 10 - Title' },
      { key: 'para11_survey', label: 'Para 11 - Survey' },
      { key: 'para14_contingency', label: 'Para 14 - Contingency' },
      { key: 'para15_warranty', label: 'Para 15 - Home Warranty' },
      { key: 'para16_inspection', label: 'Para 16 - Inspection' },
      { key: 'para19_termite', label: 'Para 19 - Termite' },
      { key: 'para20_lead', label: 'Para 20 - Lead Paint' },
      { key: 'para23_possession', label: 'Para 23 - Possession' }
    ];

    // Create CSV header
    const headers = fieldMappings.map(f => f.label);
    
    // Create data row
    const row = fieldMappings.map(field => {
      const value = data[field.key];
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
  }
}

// Main execution
async function main() {
  const processor = new ContractProcessor('test_contract2.pdf');
  
  try {
    const extractedData = await processor.processContract('./test_contract2.pdf');
    
    // Save JSON
    await fs.writeFile('./test_contract2_results.json', JSON.stringify(extractedData, null, 2));
    
    // Save CSV
    await processor.saveToCSV(extractedData, './test_contract2_results.csv');
    
    console.log('\n📊 Extraction Summary:');
    console.log(`   Buyers: ${extractedData.buyers?.join(', ') || 'Not found'}`);
    console.log(`   Property: ${extractedData.property_address || 'Not found'}`);
    console.log(`   Price: $${extractedData.purchase_price?.toLocaleString() || extractedData.cash_amount?.toLocaleString() || 'Not found'}`);
    console.log(`   Type: ${extractedData.purchase_type || 'Not found'}`);
    
  } catch (error) {
    console.error('Error processing contract:', error);
  }
}

main().catch(console.error);