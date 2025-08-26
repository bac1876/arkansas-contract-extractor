import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

interface PageTestResult {
  page: number;
  model: string;
  success: boolean;
  fieldsExtracted: number;
  fields: string[];
  error?: string;
  outputEmpty?: boolean;
  tokensUsed?: number;
}

async function convertPDFToImages(pdfPath: string): Promise<string[]> {
  const timestamp = Date.now().toString();
  const tempFolder = path.resolve(`test_gpt5_pages_${timestamp}`);
  await fs.mkdir(tempFolder, { recursive: true });
  
  console.log('🖼️ Converting PDF to PNG pages...');
  
  const outputPattern = path.join(tempFolder, 'page-%d.png');
  const isWindows = process.platform === 'win32';
  const magickExecutable = isWindows 
    ? 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe'
    : 'magick';
  
  const args = isWindows ? [
    'convert',
    '-density', '150',
    pdfPath,
    '-alpha', 'remove',
    '-background', 'white',
    '-resize', '1224x1584',
    '-depth', '8',
    outputPattern
  ] : [
    '-density', '150',
    pdfPath,
    '-alpha', 'remove',
    '-background', 'white',
    '-resize', '1224x1584',
    '-depth', '8',
    outputPattern
  ];
  
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(magickExecutable, args);
    let stderr = '';
    proc.stderr.on('data', (data) => stderr += data);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ImageMagick failed: ${stderr}`));
    });
    proc.on('error', reject);
  });
  
  const files = await fs.readdir(tempFolder);
  const pngFiles = files.filter(f => f.endsWith('.png'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });
  
  return pngFiles.map(f => path.join(tempFolder, f));
}

function getPromptForPage(pageNumber: number): string {
  const prompts: Record<number, string> = {
    1: `Extract from this Arkansas real estate contract page 1:
- buyers (array of buyer names)
- property_address (full address)
- purchase_type (FINANCED, CASH, or LOAN_ASSUMPTION based on section 3)
- para3_option_checked (3A, 3B, or 3C)
- purchase_price (numeric value from section 3)
- loan_type (if financed: CONVENTIONAL, FHA, VA, USDA, or OTHER)
- earnest_money_amount (from section 4)
- earnest_money_holder (from section 4)
- closing_date (from section 5)
- possession_date (from section 5)
Return ONLY valid JSON with these exact field names.`,

    3: `Extract agency information from page 3:
- listing_company (from section 1A)
- listing_agent (from section 1A)
- selling_company (from section 1B)
- selling_agent (from section 1B)
Return ONLY valid JSON.`,

    4: `Extract from page 4:
- para8_buyer_expenses (items marked with X for buyer in section 8)
- para8_seller_expenses (items marked with X for seller in section 8)
- para9_title_company (from section 9)
- para9_title_policy_exceptions (from section 9)
Return ONLY valid JSON.`,

    5: `Extract from page 5:
- para10_survey_type (from section 10)
- para10_survey_paid_by (BUYER or SELLER)
- para11_inspections (array of selected inspection types)
- para11_inspection_period_days (number from section 11)
Return ONLY valid JSON.`,

    6: `CRITICAL: Extract from PARAGRAPH 13 on this page:
- para13_items_included (text from first blank line in para 13)
- para13_items_excluded (text from second blank line in para 13)
Return ONLY valid JSON.`,

    7: `Extract from page 7:
- para14_contingencies (A, B, C, or D)
- para14_sale_of_other_property_address (if option B)
- para14_appraisal_waiver (true/false based on option C)
Return ONLY valid JSON.`,

    8: `Extract from page 8:
- para15_home_warranty (A, B, or C)
- para15_warranty_company (if B or C selected)
- para15_warranty_paid_by (BUYER or SELLER)
- para15_warranty_amount (numeric value if provided)
Return ONLY valid JSON.`
  };
  
  return prompts[pageNumber] || `Extract all visible data from page ${pageNumber}. Return ONLY valid JSON.`;
}

async function testPageWithModel(
  imagePath: string, 
  pageNumber: number, 
  model: string
): Promise<PageTestResult> {
  const img = await fs.readFile(imagePath);
  const base64Image = img.toString('base64');
  const prompt = getPromptForPage(pageNumber);
  
  try {
    console.log(`  Testing page ${pageNumber} with ${model}...`);
    
    const isGPT5 = model.startsWith('gpt-5');
    const response = await openai.chat.completions.create({
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { 
            type: 'image_url', 
            image_url: { 
              url: `data:image/png;base64,${base64Image}`,
              detail: 'high'
            }
          }
        ]
      }],
      // Critical: Use correct parameter based on model
      ...(isGPT5 ? {
        max_completion_tokens: 8192  // High budget for GPT-5
      } : {
        max_tokens: 2000  // Standard for GPT-4o
      }),
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0]?.message?.content || '';
    const tokensUsed = response.usage?.total_tokens || 0;
    
    if (!content) {
      return {
        page: pageNumber,
        model,
        success: false,
        fieldsExtracted: 0,
        fields: [],
        outputEmpty: true,
        error: 'Empty output returned',
        tokensUsed
      };
    }
    
    try {
      const cleanJson = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      const fields = Object.keys(parsed).filter(k => parsed[k] !== null);
      
      return {
        page: pageNumber,
        model,
        success: true,
        fieldsExtracted: fields.length,
        fields,
        tokensUsed
      };
    } catch (parseError) {
      return {
        page: pageNumber,
        model,
        success: false,
        fieldsExtracted: 0,
        fields: [],
        error: 'Failed to parse JSON response',
        tokensUsed
      };
    }
  } catch (error) {
    return {
      page: pageNumber,
      model,
      success: false,
      fieldsExtracted: 0,
      fields: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function main() {
  const testContract = 'test_contract2.pdf';
  
  console.log('📄 Testing GPT-5 vs GPT-4o page-by-page extraction');
  console.log('================================================\n');
  
  try {
    // Convert PDF to images
    const imagePaths = await convertPDFToImages(testContract);
    console.log(`✅ Converted to ${imagePaths.length} pages\n`);
    
    // Test critical pages with both models
    const criticalPages = [1, 3, 4, 5, 6, 7, 8];
    const models = ['gpt-5-mini', 'gpt-4o'];
    
    const results: PageTestResult[] = [];
    
    for (const pageNum of criticalPages) {
      if (pageNum <= imagePaths.length) {
        console.log(`\n📄 PAGE ${pageNum}:`);
        console.log('─'.repeat(40));
        
        for (const model of models) {
          const result = await testPageWithModel(
            imagePaths[pageNum - 1], 
            pageNum, 
            model
          );
          results.push(result);
          
          if (result.success) {
            console.log(`  ✅ ${model}: ${result.fieldsExtracted} fields extracted`);
            console.log(`     Fields: ${result.fields.join(', ')}`);
          } else {
            console.log(`  ❌ ${model}: FAILED - ${result.error}`);
            if (result.outputEmpty) {
              console.log(`     ⚠️  Output was completely empty!`);
            }
          }
          if (result.tokensUsed) {
            console.log(`     Tokens used: ${result.tokensUsed}`);
          }
        }
      }
    }
    
    // Summary comparison
    console.log('\n\n📊 SUMMARY COMPARISON:');
    console.log('═'.repeat(60));
    
    const gpt5Results = results.filter(r => r.model === 'gpt-5-mini');
    const gpt4Results = results.filter(r => r.model === 'gpt-4o');
    
    console.log('\nGPT-5-mini Results:');
    const gpt5Success = gpt5Results.filter(r => r.success);
    const gpt5Failed = gpt5Results.filter(r => !r.success);
    console.log(`  ✅ Successful pages: ${gpt5Success.map(r => r.page).join(', ') || 'NONE'}`);
    console.log(`  ❌ Failed pages: ${gpt5Failed.map(r => r.page).join(', ') || 'NONE'}`);
    console.log(`  📊 Success rate: ${((gpt5Success.length / gpt5Results.length) * 100).toFixed(0)}%`);
    
    console.log('\nGPT-4o Results:');
    const gpt4Success = gpt4Results.filter(r => r.success);
    const gpt4Failed = gpt4Results.filter(r => !r.success);
    console.log(`  ✅ Successful pages: ${gpt4Success.map(r => r.page).join(', ') || 'NONE'}`);
    console.log(`  ❌ Failed pages: ${gpt4Failed.map(r => r.page).join(', ') || 'NONE'}`);
    console.log(`  📊 Success rate: ${((gpt4Success.length / gpt4Results.length) * 100).toFixed(0)}%`);
    
    // Specific failures for GPT-5
    if (gpt5Failed.length > 0) {
      console.log('\n⚠️  GPT-5-mini Specific Failures:');
      for (const failure of gpt5Failed) {
        console.log(`  Page ${failure.page}: ${failure.error}`);
        if (failure.outputEmpty) {
          console.log(`    → This is the empty response issue!`);
        }
      }
    }
    
    // Save detailed results
    const outputFile = `gpt5_page_analysis_${Date.now()}.json`;
    await fs.writeFile(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Detailed results saved to: ${outputFile}`);
    
    // Clean up temp folder
    const tempFolders = (await fs.readdir('.')).filter(f => f.startsWith('test_gpt5_pages_'));
    for (const folder of tempFolders) {
      await fs.rm(folder, { recursive: true, force: true }).catch(() => {});
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
main().catch(console.error);