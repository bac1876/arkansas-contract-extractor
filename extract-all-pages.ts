/**
 * Extract data from all remaining pages using Vision API
 */

import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';
import { pdfToPng } from 'pdf-to-png-converter';

dotenv.config();

interface PageExtraction {
  page: number;
  description: string;
  prompt: string;
  skipIfNoVision?: boolean;
}

const pageExtractions: PageExtraction[] = [
  {
    page: 5,
    description: "Para 10 - Title",
    prompt: `Extract Paragraph 10 - TITLE AND CLOSING:
- Which option is checked? (A, B, or C)
- A: Seller provides warranty deed
- B: Seller provides title insurance
- C: Buyer pays for title insurance
Return: { "para10_title": "A/B/C or null" }`
  },
  {
    page: 6,
    description: "Para 11 - Survey",
    prompt: `Extract Paragraph 11 - SURVEY:
- Which option is checked for who pays for survey?
- Options typically: A (Buyer), B (Seller), C (Split), or text saying "Buyer declines survey"
Return: { "para11_survey": "A/B/C/text or null" }`
  },
  {
    page: 7,
    description: "Para 13-14 - Inclusions/Contingency",
    prompt: `Extract:
1. Paragraph 13 - PERSONAL PROPERTY: Any custom text in blanks
2. Paragraph 14 - CONTINGENCY: 
   - Is sale contingent? (A. Yes or B. No)
   - If Yes, what is the contingency?
Return: { 
  "para13_custom": "text or null",
  "para14_contingency": "YES/NO",
  "para14_details": "contingency details or null"
}`
  },
  {
    page: 8,
    description: "Para 15-16 - Warranty/Inspection",
    prompt: `Extract:
1. Paragraph 15 - HOME WARRANTY:
   - A. Yes (warranty included) or B. No
   - If B, what's written after it?
2. Paragraph 16 - INSPECTION AND REPAIRS:
   - Which option? (A, B, C, or D)
Return: {
  "para15_warranty": "YES/NO",
  "para15_details": "text after B or null",
  "para16_inspection": "A/B/C/D or null"
}`
  },
  {
    page: 10,
    description: "Para 18-19 - Wood/Termite",
    prompt: `Extract:
1. Paragraph 18 - WOOD INFESTATION REPORT:
   - Which option? (A, B, C, or D)
2. Paragraph 19 - TERMITE LETTER:
   - Which option? (A, B, or C)
Return: {
  "para18_wood": "A/B/C/D or null",
  "para19_termite": "A/B/C or null"
}`
  },
  {
    page: 11,
    description: "Para 20 - Lead Paint",
    prompt: `Extract Paragraph 20 - LEAD-BASED PAINT:
- Which option is checked? (A, B, C, or D)
- A: Property not built before 1978
- B: 10-day inspection period
- C: Waive inspection
- D: Other
Return: { "para20_lead": "A/B/C/D or null" }`
  },
  {
    page: 12,
    description: "Para 22 - Date",
    prompt: `Extract Paragraph 22 - Find the date that appears on this page.
Look for a date in format MM/DD/YYYY or similar.
Return: { "para22_date": "date string or null" }`
  },
  {
    page: 13,
    description: "Para 23 - Possession",
    prompt: `Extract Paragraph 23 - POSSESSION:
- Which option for when buyer gets possession?
- Common options: A (Upon closing), B (Days after closing), C (Other arrangement)
Return: { 
  "para23_possession": "A/B/C or text description",
  "para23_details": "any additional details or null"
}`
  },
  {
    page: 14,
    description: "Para 32 - Additional Terms",
    prompt: `Extract Paragraph 32 - ADDITIONAL TERMS AND CONDITIONS:
Look for any custom text or terms written in this section.
Return: { "para32_custom": "all custom text found or null" }`
  },
  {
    page: 15,
    description: "Para 37 - Checkbox",
    prompt: `Extract Paragraph 37:
Look for which checkbox option is selected (typically A, B, C, or D)
Return: { "para37_option": "A/B/C/D or null" }`
  },
  {
    page: 16,
    description: "Para 38-39 - Date/Serial",
    prompt: `Extract:
1. Paragraph 38 - Acceptance date
2. Paragraph 39 - Contract serial number
Return: {
  "para38_date": "date string or null",
  "para39_serial": "serial number or null"
}`
  },
  {
    page: 18,
    description: "Signatures/Dates",
    prompt: `Extract any dates or important information from signature section.
Return: { 
  "signature_dates": ["any dates found"],
  "other_info": "any other relevant info"
}`
  }
];

async function convertPageToPng(pageNum: number): Promise<Buffer> {
  const pdfPath = `./pages/page${pageNum}.pdf`;
  const pdfBuffer = await fs.readFile(pdfPath);
  const pngPages = await pdfToPng(pdfBuffer, {
    disableFontFace: true,
    useSystemFonts: false,
    viewportScale: 2.0,
    pagesToProcess: [1],
  });
  
  if (pngPages.length > 0) {
    // Also save to file for reference
    await fs.writeFile(`./pages/page${pageNum}.png`, pngPages[0].content);
    return pngPages[0].content;
  }
  throw new Error(`Failed to convert page ${pageNum}`);
}

async function extractFromPage(openai: OpenAI, extraction: PageExtraction): Promise<any> {
  try {
    console.log(`\n📄 Page ${extraction.page}: ${extraction.description}`);
    console.log('-'.repeat(50));
    
    // Convert to PNG
    console.log('Converting to PNG...');
    const imageBuffer = await convertPageToPng(extraction.page);
    const base64Image = imageBuffer.toString('base64');
    
    console.log('Calling Vision API...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: extraction.prompt + "\n\nLook for [X], X, or filled checkboxes for selections."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 300,
      temperature: 0.1
    });

    const result = response.choices[0].message.content;
    const cleanJson = result?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '{}';
    const extracted = JSON.parse(cleanJson);
    
    console.log('Result:', JSON.stringify(extracted, null, 2));
    
    return {
      page: extraction.page,
      ...extracted
    };
    
  } catch (error) {
    console.error(`Error on page ${extraction.page}:`, error);
    return {
      page: extraction.page,
      error: String(error)
    };
  }
}

async function extractAllPages() {
  console.log('Extracting Data from All Remaining Pages');
  console.log('='.repeat(60));
  
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  const allResults: any = {};
  
  for (const extraction of pageExtractions) {
    const result = await extractFromPage(openai, extraction);
    
    // Merge results (excluding page number and error fields)
    const { page, error, ...data } = result;
    Object.assign(allResults, data);
    
    if (error) {
      console.log(`⚠️  Error on page ${page}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('COMPLETE EXTRACTION RESULTS');
  console.log('='.repeat(60) + '\n');
  
  // Display all extracted fields
  const fields = [
    { key: 'para10_title', label: 'Para 10 - Title Option' },
    { key: 'para11_survey', label: 'Para 11 - Survey' },
    { key: 'para13_custom', label: 'Para 13 - Personal Property' },
    { key: 'para14_contingency', label: 'Para 14 - Contingency' },
    { key: 'para14_details', label: 'Para 14 - Contingency Details' },
    { key: 'para15_warranty', label: 'Para 15 - Home Warranty' },
    { key: 'para16_inspection', label: 'Para 16 - Inspection' },
    { key: 'para18_wood', label: 'Para 18 - Wood Infestation' },
    { key: 'para19_termite', label: 'Para 19 - Termite' },
    { key: 'para20_lead', label: 'Para 20 - Lead Paint' },
    { key: 'para22_date', label: 'Para 22 - Date' },
    { key: 'para23_possession', label: 'Para 23 - Possession' },
    { key: 'para32_custom', label: 'Para 32 - Additional Terms' },
    { key: 'para37_option', label: 'Para 37 - Option' },
    { key: 'para38_date', label: 'Para 38 - Acceptance Date' },
    { key: 'para39_serial', label: 'Para 39 - Serial Number' }
  ];
  
  fields.forEach(({ key, label }) => {
    const value = allResults[key];
    if (value !== undefined && value !== null) {
      console.log(`${label}: ${value}`);
    }
  });
  
  // Save complete results
  await fs.writeFile('./complete_vision_extraction.json', JSON.stringify(allResults, null, 2));
  console.log('\n✓ Complete results saved to complete_vision_extraction.json');
  
  // Count successful extractions
  const successCount = fields.filter(f => allResults[f.key] !== undefined && allResults[f.key] !== null).length;
  console.log(`\n📊 Extracted ${successCount} out of ${fields.length} fields`);
  
  return allResults;
}

// Run extraction
extractAllPages().catch(console.error);