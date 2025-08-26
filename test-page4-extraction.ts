import { GPT5Extractor } from './extraction-gpt5';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

async function testPage4() {
  console.log('🔍 Testing Page 4 extraction for paragraph 5 seller concessions...\n');
  
  const pdfPath = 'Offer (EXE)-3461 Alliance Dr.pdf';
  const tempFolder = `temp_${Date.now()}`;
  
  try {
    // Convert just page 4
    await fs.mkdir(tempFolder, { recursive: true });
    console.log('📄 Converting page 4 to PNG...');
    
    await execAsync(
      `magick convert -density 150 "${pdfPath}[3]" "${path.join(tempFolder, 'page4.png')}"`,
      { maxBuffer: 1024 * 1024 * 10 }
    );
    
    // Test extraction with the new prompt
    const extractor = new GPT5Extractor();
    const pageData = await (extractor as any).extractPage(
      path.join(tempFolder, 'page4.png'),
      4
    );
    
    console.log('✅ Page 4 extraction complete!\n');
    console.log('📊 Extracted data:');
    console.log(JSON.stringify(pageData.data, null, 2));
    
    console.log('\n🔍 Key fields:');
    console.log('- para5_custom_text:', pageData.data?.para5_custom_text || 'NOT FOUND');
    console.log('- paragraph_5.seller_specific_payment_amount:', pageData.data?.paragraph_5?.seller_specific_payment_amount || 'NOT FOUND');
    console.log('- paragraph_5.seller_specific_payment_text:', pageData.data?.paragraph_5?.seller_specific_payment_text || 'NOT FOUND');
    
    // Clean up
    await fs.rm(tempFolder, { recursive: true, force: true });
    
  } catch (error) {
    console.error('❌ Error:', error);
    await fs.rm(tempFolder, { recursive: true, force: true }).catch(() => {});
  }
}

testPage4();