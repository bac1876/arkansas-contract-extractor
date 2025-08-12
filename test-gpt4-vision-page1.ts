/**
 * Test GPT-4 Vision API to extract checkbox states from page 1
 * Hybrid approach - use Vision only for problematic checkbox fields
 */

import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

dotenv.config();
const execAsync = promisify(exec);

async function convertPdfToImage(pdfPath: string, outputPath: string): Promise<void> {
  console.log('Converting PDF page to image...');
  
  try {
    // Try using ImageMagick (if installed)
    await execAsync(`magick convert -density 150 "${pdfPath}[0]" "${outputPath}"`);
    console.log('✓ Converted using ImageMagick');
  } catch (error) {
    console.log('ImageMagick not available, trying alternative...');
    
    try {
      // Try using pdf2image or similar
      const { PDFDocument } = await import('pdf-lib');
      const pdfBytes = await fs.readFile(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // For now, we'll need the image to be provided
      console.log('⚠️  Please provide page1.png or page1.jpg for Vision API testing');
      throw new Error('Image conversion not available - please provide page1.png');
    } catch (err) {
      throw err;
    }
  }
}

async function extractWithVision() {
  console.log('GPT-4 Vision Extraction Test - Page 1 Checkboxes');
  console.log('=================================================\n');

  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  try {
    // Check if image exists, if not try to convert
    let imagePath = './page1.png';
    
    try {
      await fs.access(imagePath);
      console.log('✓ Found page1.png\n');
    } catch {
      // Try jpg
      imagePath = './page1.jpg';
      try {
        await fs.access(imagePath);
        console.log('✓ Found page1.jpg\n');
      } catch {
        console.log('No image found. Attempting to convert PDF to image...');
        imagePath = './page1_converted.png';
        await convertPdfToImage('./page1.pdf', imagePath);
      }
    }

    // Read the image
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');

    console.log('Sending image to GPT-4 Vision API...\n');

    // Create the vision API request
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this Arkansas real estate contract page and extract the following information:

1. Property Information (Paragraph 2):
   - Property type: Look for checkboxes and identify which is marked with [X] or X
   - Options: Single family detached, One-to-four attached, Manufactured/Mobile, Condominium/Town Home, Builder Owned

2. Loan Type (Paragraph 3):
   - Which loan type checkbox is marked with [X] or X?
   - Options: CONVENTIONAL, VA, FHA, USDA-RD, LOAN ASSUMPTION, CASH, OTHER

3. Purchase Price (Paragraph 3):
   - What is the exact purchase price amount?

4. Property Address:
   - What is the complete property address?

5. Buyer Names:
   - List all buyer names

Return ONLY a JSON object with these exact fields:
{
  "property_type": "the selected option or null",
  "loan_type": "the selected option or null",
  "purchase_price": number or null,
  "property_address": "address or null",
  "buyers": ["name1", "name2"] or []
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
    console.log('Vision API Response:');
    console.log(visionResult);
    console.log('\n');

    // Parse the JSON response (handle markdown formatting)
    try {
      // Remove markdown code blocks if present
      const cleanJson = visionResult?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '{}';
      const extracted = JSON.parse(cleanJson);
      
      console.log('=== EXTRACTED DATA ===\n');
      console.log('Property Type:', extracted.property_type || 'NOT FOUND');
      console.log('Loan Type:', extracted.loan_type || 'NOT FOUND');
      console.log('Purchase Price:', extracted.purchase_price ? `$${extracted.purchase_price.toLocaleString()}` : 'NOT FOUND');
      console.log('Property Address:', extracted.property_address || 'NOT FOUND');
      console.log('Buyers:', extracted.buyers?.join(', ') || 'NOT FOUND');
      
      // Save results
      await fs.writeFile('./page1_vision_results.json', JSON.stringify(extracted, null, 2));
      console.log('\n✓ Results saved to page1_vision_results.json');
      
      // Compare with text extraction
      console.log('\n=== COMPARISON WITH TEXT EXTRACTION ===\n');
      
      try {
        const textResults = await fs.readFile('./complete_extraction.json', 'utf-8');
        const textExtracted = JSON.parse(textResults);
        
        console.log('Text extraction loan type:', textExtracted.para3_loan);
        console.log('Vision extraction loan type:', extracted.loan_type);
        
        if (textExtracted.para3_loan !== extracted.loan_type) {
          console.log('⚠️  DIFFERENCE DETECTED! Vision found different loan type.');
          console.log('This confirms the checkbox issue with text extraction.');
        }
      } catch {
        console.log('(No text extraction results to compare)');
      }
      
    } catch (parseError) {
      console.log('Could not parse JSON response. Raw response saved to page1_vision_raw.txt');
      await fs.writeFile('./page1_vision_raw.txt', visionResult || '');
    }

  } catch (error) {
    console.error('Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('page1.png')) {
        console.log('\n📸 Please provide page1.png or page1.jpg');
        console.log('You can:');
        console.log('1. Take a screenshot of page 1 and save as page1.png');
        console.log('2. Use an online PDF to image converter');
        console.log('3. Install ImageMagick for automatic conversion');
      } else if (error.message.includes('model')) {
        console.log('\n⚠️  Make sure you have access to gpt-4-vision-preview model');
      }
    }
  }
}

// Run the test
console.log('Starting GPT-4 Vision extraction test...\n');
extractWithVision().catch(console.error);