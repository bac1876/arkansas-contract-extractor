/**
 * Test GPT-4 Vision API with logic for both financed and cash purchases
 * Handles:
 * - Para 3A: Financed purchases (loan type selected)
 * - Para 3C: Cash purchases (no loan type, cash amount specified)
 */

import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';
import { pdfToPng } from 'pdf-to-png-converter';

dotenv.config();

async function convertPdfToImage(pdfPath: string): Promise<Buffer> {
  console.log(`Converting ${pdfPath} to PNG...`);
  const pdfBuffer = await fs.readFile(pdfPath);
  const pngPages = await pdfToPng(pdfBuffer, {
    disableFontFace: true,
    useSystemFonts: false,
    viewportScale: 2.0,
    pagesToProcess: [1],
  });
  
  if (pngPages.length > 0) {
    console.log('✓ Converted to PNG\n');
    return pngPages[0].content;
  }
  throw new Error('Failed to convert PDF to image');
}

async function extractWithVisionEnhanced(pdfPath: string) {
  console.log(`Vision Extraction with Cash/Finance Logic: ${pdfPath}`);
  console.log('='.repeat(60) + '\n');

  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  try {
    // Convert PDF to image
    const imageBuffer = await convertPdfToImage(pdfPath);
    const base64Image = imageBuffer.toString('base64');

    console.log('Sending to GPT-4 Vision API...\n');

    // Enhanced prompt to handle both scenarios
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this Arkansas real estate contract page and extract information based on the purchase type.

IMPORTANT: Check paragraph 3 carefully:
- 3A is for FINANCED purchases (has loan type checkboxes)
- 3B is for LOAN ASSUMPTION
- 3C is for CASH purchases (no loan, just cash amount)

Extract the following:

1. Purchase Type:
   - Is 3A checked? (Purchase with financing)
   - Is 3B checked? (Loan assumption)
   - Is 3C checked? (Cash purchase)

2. If 3A is checked (FINANCED):
   - Purchase price from 3A
   - Loan type (CONVENTIONAL/VA/FHA/USDA-RD/OTHER)

3. If 3C is checked (CASH):
   - Cash amount from 3C
   - Loan type should be "CASH" or null

4. Property Information (Paragraph 2):
   - Property type checkbox

5. Property Address & Buyers:
   - Complete address
   - All buyer names

Return a JSON object:
{
  "purchase_type": "FINANCED" or "CASH" or "LOAN_ASSUMPTION",
  "purchase_price": number (from 3A if financed, from 3C if cash),
  "loan_type": "FHA/VA/CONVENTIONAL/USDA-RD/OTHER" or "CASH" or null,
  "property_type": "the selected option",
  "property_address": "address",
  "buyers": ["name1", "name2"],
  "paragraph_3a_checked": boolean,
  "paragraph_3c_checked": boolean,
  "cash_amount": number or null (if 3C is checked)
}

Look for [X], X, or filled checkboxes to determine selections.`
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
      max_tokens: 500,
      temperature: 0.1
    });

    const visionResult = response.choices[0].message.content;
    console.log('Raw Vision API Response:');
    console.log(visionResult);
    console.log('\n');

    // Parse response
    const cleanJson = visionResult?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '{}';
    const extracted = JSON.parse(cleanJson);
    
    console.log('=== EXTRACTED DATA ===\n');
    console.log('Purchase Type:', extracted.purchase_type);
    console.log('Para 3A Checked:', extracted.paragraph_3a_checked);
    console.log('Para 3C Checked:', extracted.paragraph_3c_checked);
    console.log('');
    
    if (extracted.purchase_type === 'CASH') {
      console.log('💵 CASH PURCHASE DETECTED');
      console.log('Cash Amount:', extracted.cash_amount ? `$${extracted.cash_amount.toLocaleString()}` : 'NOT FOUND');
      console.log('Loan Type:', extracted.loan_type || 'N/A (Cash purchase)');
    } else if (extracted.purchase_type === 'FINANCED') {
      console.log('🏦 FINANCED PURCHASE DETECTED');
      console.log('Purchase Price:', extracted.purchase_price ? `$${extracted.purchase_price.toLocaleString()}` : 'NOT FOUND');
      console.log('Loan Type:', extracted.loan_type || 'NOT FOUND');
    }
    
    console.log('\nProperty Type:', extracted.property_type || 'NOT FOUND');
    console.log('Property Address:', extracted.property_address || 'NOT FOUND');
    console.log('Buyers:', extracted.buyers?.join(', ') || 'NOT FOUND');
    
    // Save results
    const outputFile = pdfPath.replace('.pdf', '_vision_results.json');
    await fs.writeFile(outputFile, JSON.stringify(extracted, null, 2));
    console.log(`\n✓ Results saved to ${outputFile}`);
    
    return extracted;
    
  } catch (error) {
    console.error('Error:', error);
    if (error instanceof Error && error.message.includes('model')) {
      console.log('\n⚠️  Make sure you have access to gpt-4o model');
    }
    throw error;
  }
}

async function compareContracts() {
  console.log('Contract Type Comparison Test');
  console.log('==============================\n');
  
  try {
    // Test the original financed contract
    console.log('1. Testing FINANCED contract (page1.pdf):\n');
    const financedResult = await extractWithVisionEnhanced('./page1.pdf');
    
    // Check if cash contract exists
    try {
      await fs.access('./page1-1.pdf');
      console.log('\n' + '='.repeat(60) + '\n');
      console.log('2. Testing CASH contract (page1-1.pdf):\n');
      const cashResult = await extractWithVisionEnhanced('./page1-1.pdf');
      
      // Compare results
      console.log('\n' + '='.repeat(60));
      console.log('COMPARISON SUMMARY');
      console.log('='.repeat(60) + '\n');
      
      console.log('Contract 1 (page1.pdf):');
      console.log(`  Type: ${financedResult.purchase_type}`);
      console.log(`  Amount: $${(financedResult.purchase_price || 0).toLocaleString()}`);
      console.log(`  Loan: ${financedResult.loan_type || 'N/A'}\n`);
      
      console.log('Contract 2 (page1-1.pdf):');
      console.log(`  Type: ${cashResult.purchase_type}`);
      console.log(`  Amount: $${(cashResult.cash_amount || cashResult.purchase_price || 0).toLocaleString()}`);
      console.log(`  Loan: ${cashResult.loan_type || 'N/A'}\n`);
      
      if (financedResult.purchase_type === 'FINANCED' && cashResult.purchase_type === 'CASH') {
        console.log('✅ Successfully differentiated between FINANCED and CASH contracts!');
      }
      
    } catch {
      console.log('\n⚠️  page1-1.pdf not found. Upload it to test cash contract logic.');
    }
    
  } catch (error) {
    console.error('Comparison failed:', error);
  }
}

// Run the test
if (process.argv[2] === '--compare') {
  compareContracts().catch(console.error);
} else {
  // Test single file
  const testFile = process.argv[2] || './page1.pdf';
  extractWithVisionEnhanced(testFile).catch(console.error);
}