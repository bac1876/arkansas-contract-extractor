import { GPT5Extractor } from './extraction-gpt5';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

async function testPage14() {
  console.log('🔍 Testing Page 14 extraction for paragraph 32 buyer agency fees...\n');
  
  const pdfPath = 'Offer (EXE)-3461 Alliance Dr.pdf';
  const tempFolder = `temp_${Date.now()}`;
  
  try {
    // Convert just page 14
    await fs.mkdir(tempFolder, { recursive: true });
    console.log('📄 Converting page 14 to PNG...');
    
    await execAsync(
      `magick convert -density 150 "${pdfPath}[13]" "${path.join(tempFolder, 'page14.png')}"`,
      { maxBuffer: 1024 * 1024 * 10 }
    );
    
    // Test extraction with the new prompt
    const extractor = new GPT5Extractor();
    const pageData = await (extractor as any).extractPage(
      path.join(tempFolder, 'page14.png'),
      14
    );
    
    console.log('✅ Page 14 extraction complete!\n');
    console.log('📊 Extracted data:');
    console.log(JSON.stringify(pageData.data, null, 2));
    
    console.log('\n🔍 Key fields:');
    console.log('- para32_additional_terms:', pageData.data?.para32_additional_terms || 'NOT FOUND');
    console.log('- buyer_agency_fee:', pageData.data?.buyer_agency_fee || 'NOT FOUND');
    console.log('- other_terms:', pageData.data?.other_terms || 'NOT FOUND');
    
    // Clean up
    await fs.rm(tempFolder, { recursive: true, force: true });
    
  } catch (error) {
    console.error('❌ Error:', error);
    await fs.rm(tempFolder, { recursive: true, force: true }).catch(() => {});
  }
}

testPage14();