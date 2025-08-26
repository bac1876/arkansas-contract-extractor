import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

async function convertPDFToImages(pdfPath: string): Promise<string[]> {
  const timestamp = Date.now().toString();
  const tempFolder = path.resolve(`test_gpt5_critical_${timestamp}`);
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
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ImageMagick failed with code ${code}`));
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

async function extractCriticalPages(imagePaths: string[]) {
  const results: any = {};
  
  // Critical pages only
  const criticalPages = [
    { num: 1, name: 'Buyers/Property/Purchase', fields: ['buyers', 'property_address', 'purchase_price', 'cash_amount'] },
    { num: 6, name: 'Para 13', fields: ['para13_items_included', 'para13_items_excluded'] },
    { num: 7, name: 'Para 14', fields: ['para14_contingencies'] }
  ];
  
  for (const page of criticalPages) {
    if (page.num > imagePaths.length) continue;
    
    console.log(`\n📄 Extracting Page ${page.num} - ${page.name}...`);
    
    const img = await fs.readFile(imagePaths[page.num - 1]);
    const base64Image = img.toString('base64');
    
    // Custom prompts for critical pages
    let prompt = '';
    if (page.num === 1) {
      prompt = `Extract from this Arkansas real estate contract page:
- buyers (array of buyer names)
- property_address (full address)
- purchase_price (numeric value from section 3 if financed)
- cash_amount (numeric value from section 3 if cash purchase)
Return ONLY valid JSON.`;
    } else if (page.num === 6) {
      prompt = `CRITICAL: This is page 6 containing PARAGRAPH 13.
Extract the TWO blank fields in paragraph 13:
- para13_items_included (text from FIRST blank line - what conveys with property)
- para13_items_excluded (text from SECOND blank line - what doesn't convey)
Return ONLY valid JSON with these exact field names.`;
    } else if (page.num === 7) {
      prompt = `Extract from PARAGRAPH 14 on this page:
- para14_contingencies (which option is checked: A, B, C, or D)
Return ONLY valid JSON.`;
    }
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-5-mini',
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
        max_completion_tokens: 8192,  // High budget for GPT-5
        response_format: { type: 'json_object' }
      });
      
      const content = response.choices[0]?.message?.content || '';
      
      if (content) {
        try {
          const cleanJson = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          Object.assign(results, parsed);
          
          console.log(`  ✅ Extracted: ${Object.keys(parsed).join(', ')}`);
          for (const [key, value] of Object.entries(parsed)) {
            console.log(`     ${key}: ${JSON.stringify(value)}`);
          }
        } catch (e) {
          console.log(`  ❌ Failed to parse JSON`);
        }
      } else {
        console.log(`  ❌ Empty response from GPT-5-mini`);
      }
      
    } catch (error) {
      console.log(`  ❌ API Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }
  
  return results;
}

async function main() {
  console.log('🚀 GPT-5-mini Critical Pages Extraction Test');
  console.log('='.repeat(50));
  
  try {
    // Convert PDF
    const imagePaths = await convertPDFToImages('test_contract2.pdf');
    console.log(`✅ Converted to ${imagePaths.length} pages`);
    
    // Extract critical pages
    const results = await extractCriticalPages(imagePaths);
    
    // Summary
    console.log('\n\n📊 EXTRACTION RESULTS:');
    console.log('='.repeat(50));
    
    const criticalFields = [
      'buyers',
      'property_address',
      'purchase_price',
      'cash_amount',
      'para13_items_included',
      'para13_items_excluded',
      'para14_contingencies'
    ];
    
    let successCount = 0;
    for (const field of criticalFields) {
      const value = results[field];
      const status = value !== null && value !== undefined ? '✅' : '❌';
      if (value !== null && value !== undefined) successCount++;
      console.log(`${status} ${field}: ${JSON.stringify(value)}`);
    }
    
    console.log(`\n💯 Success Rate: ${Math.round(successCount / criticalFields.length * 100)}% (${successCount}/${criticalFields.length} fields)`);
    
    // Save results
    const outputFile = `gpt5_mini_critical_${Date.now()}.json`;
    await fs.writeFile(outputFile, JSON.stringify(results, null, 2));
    console.log(`💾 Results saved to: ${outputFile}`);
    
    // Cleanup
    const tempFolders = (await fs.readdir('.')).filter(f => f.startsWith('test_gpt5_critical_'));
    for (const folder of tempFolders) {
      await fs.rm(folder, { recursive: true, force: true }).catch(() => {});
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main().catch(console.error);