/**
 * OCR-based extraction for checkboxes that standard text extraction misses
 * This approach will detect actual checkbox selections dynamically
 */

import * as fs from 'fs/promises';
import { createWorker } from 'tesseract.js';
import pdf2pic from 'pdf2pic';
import * as path from 'path';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

async function extractCheckboxesWithOCR() {
  console.log('OCR-Based Checkbox Extraction');
  console.log('==============================\n');

  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  const contractPath = './sample_contract_flat.pdf';
  
  try {
    // Convert PDF pages to images for OCR
    console.log('Converting PDF to images for OCR...');
    const options = {
      density: 200,
      saveFilename: 'contract_page',
      savePath: './temp_images',
      format: 'png',
      width: 2480,
      height: 3508
    };

    // Create temp directory if it doesn't exist
    await fs.mkdir('./temp_images', { recursive: true });

    const convert = pdf2pic.fromPath(contractPath, options);
    
    // Convert pages that likely contain our target paragraphs
    // Para 18-20 are typically on pages 3-4
    const pageImages = [];
    for (let page = 3; page <= 4; page++) {
      const result = await convert(page);
      pageImages.push(result.path);
      console.log(`  ✓ Converted page ${page}`);
    }

    // Initialize Tesseract OCR
    console.log('\nInitializing OCR engine...');
    const worker = await createWorker('eng');

    // Process each page image
    const ocrResults = [];
    for (const imagePath of pageImages) {
      console.log(`\nProcessing ${path.basename(imagePath)}...`);
      const { data: { text } } = await worker.recognize(imagePath);
      ocrResults.push(text);
    }

    await worker.terminate();

    // Combine OCR text
    const fullOCRText = ocrResults.join('\n');
    
    console.log('\nSearching for checkbox patterns in OCR text...\n');

    // Function to detect checkbox selections
    function detectCheckboxSelection(text: string, paraNumber: string): string | null {
      // Look for paragraph and find checkbox patterns
      const paraPattern = new RegExp(`${paraNumber}\\.[\\s\\S]*?(?=${parseInt(paraNumber) + 1}\\.|$)`, 'i');
      const paraMatch = text.match(paraPattern);
      
      if (!paraMatch) return null;
      
      const paraText = paraMatch[0];
      
      // Common checkbox patterns in OCR
      // [X], [x], (X), (x), ☑, ☒, ■, ▪, or X/x near option letter
      const checkboxPatterns = [
        /\[X\]\s*([A-D])/i,
        /\(X\)\s*([A-D])/i,
        /☑\s*([A-D])/i,
        /☒\s*([A-D])/i,
        /■\s*([A-D])/i,
        /▪\s*([A-D])/i,
        /([A-D])\s*\[X\]/i,
        /([A-D])\s*\(X\)/i,
        /([A-D])\s*☑/i,
        /([A-D])\s*☒/i,
        /([A-D])\s*■/i,
        /([A-D])\s*▪/i,
        // Sometimes OCR sees X as standalone near option
        /X\s+([A-D])\./i,
        /([A-D])\.\s+X\s/i
      ];
      
      for (const pattern of checkboxPatterns) {
        const match = paraText.match(pattern);
        if (match) {
          return match[1].toUpperCase();
        }
      }
      
      // If no checkbox found, try GPT-4 vision API for image analysis
      return null;
    }

    // Extract Para 18, 19, 20
    const para18 = detectCheckboxSelection(fullOCRText, '18');
    const para19 = detectCheckboxSelection(fullOCRText, '19');
    const para20 = detectCheckboxSelection(fullOCRText, '20');

    console.log('OCR Detection Results:');
    console.log('======================');
    console.log(`Para 18: ${para18 || 'Not detected - will try vision API'}`);
    console.log(`Para 19: ${para19 || 'Not detected - will try vision API'}`);
    console.log(`Para 20: ${para20 || 'Not detected - will try vision API'}\n`);

    // If OCR didn't detect, try GPT-4 Vision for visual analysis
    if (!para18 || !para19 || !para20) {
      console.log('Using GPT-4 Vision API for checkbox detection...\n');
      
      for (const imagePath of pageImages) {
        const imageBuffer = await fs.readFile(imagePath);
        const base64Image = imageBuffer.toString('base64');
        
        const response = await openai.chat.completions.create({
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Look at this contract page image and identify which checkboxes are selected (marked with X, checkmark, or filled) for:
                  
                  1. Paragraph 18 - Which option (A, B, C, or D) is selected?
                  2. Paragraph 19 - Which option (A, B, or C) is selected?
                  3. Paragraph 20 - Which option is selected?
                  
                  Return ONLY a JSON object like:
                  {"para18": "B", "para19": "A", "para20": "C"}
                  
                  If a paragraph is not visible or no option is selected, use null.`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 300
        });
        
        try {
          const visionResult = JSON.parse(response.choices[0].message.content || '{}');
          console.log(`Vision API results for ${path.basename(imagePath)}:`);
          console.log(visionResult);
          console.log();
          
          // Update our results if vision API found something
          if (visionResult.para18 && !para18) {
            console.log(`  ✓ Para 18 detected by Vision API: ${visionResult.para18}`);
          }
          if (visionResult.para19 && !para19) {
            console.log(`  ✓ Para 19 detected by Vision API: ${visionResult.para19}`);
          }
          if (visionResult.para20 && !para20) {
            console.log(`  ✓ Para 20 detected by Vision API: ${visionResult.para20}`);
          }
        } catch (e) {
          console.log('Could not parse vision API response');
        }
      }
    }

    // Clean up temp images
    console.log('\nCleaning up temporary files...');
    for (const imagePath of pageImages) {
      await fs.unlink(imagePath);
    }
    await fs.rmdir('./temp_images');
    
    console.log('✓ OCR extraction complete\n');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Error:', errorMessage);
  }
}

// Run the OCR extraction
console.log('Starting OCR-based checkbox extraction...\n');
extractCheckboxesWithOCR().catch(console.error);