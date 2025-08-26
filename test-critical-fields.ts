import { GPT5Extractor } from './extraction-gpt5';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

async function testCriticalFields() {
  console.log('🔍 Quick test of critical fields with improved prompts...\n');
  
  const tempFolder = `temp_test_${Date.now()}`;
  
  try {
    await fs.mkdir(tempFolder, { recursive: true });
    const extractor = new GPT5Extractor();
    
    // Test Page 1 - Buyers
    console.log('📄 Testing Page 1 (Buyers)...');
    await execAsync(
      `magick "Offer (EXE)-3418 Justice Dr.pdf[0]" "${path.join(tempFolder, 'page1.png')}"`,
      { maxBuffer: 1024 * 1024 * 10 }
    );
    const page1Data = await (extractor as any).extractPage(path.join(tempFolder, 'page1.png'), 1);
    console.log('Buyers found:', page1Data.data?.buyers || 'NOT FOUND');
    console.log('Property:', page1Data.data?.property_address?.substring(0, 50) || 'NOT FOUND');
    
    // Test Page 4 - Para 5
    console.log('\n📄 Testing Page 4 (Para 5)...');
    await execAsync(
      `magick "Offer (EXE)-3418 Justice Dr.pdf[3]" "${path.join(tempFolder, 'page4.png')}"`,
      { maxBuffer: 1024 * 1024 * 10 }
    );
    const page4Data = await (extractor as any).extractPage(path.join(tempFolder, 'page4.png'), 4);
    console.log('Para 5 Amount:', page4Data.data?.para5_custom_text || 'NOT FOUND');
    console.log('Para 5 Text:', page4Data.data?.para5_seller_pays_text?.substring(0, 80) || 'NOT FOUND');
    
    // Test Page 15 - Para 38
    console.log('\n📄 Testing Page 15 (Para 38)...');
    await execAsync(
      `magick "Offer (EXE)-3418 Justice Dr.pdf[14]" "${path.join(tempFolder, 'page15.png')}"`,
      { maxBuffer: 1024 * 1024 * 10 }
    );
    const page15Data = await (extractor as any).extractPage(path.join(tempFolder, 'page15.png'), 15);
    console.log('Para 38 Expiration Date:', page15Data.data?.para38_expiration_date || 'NOT FOUND');
    console.log('Para 38 Expiration Time:', page15Data.data?.para38_expiration_time || 'NOT FOUND');
    
    await fs.rm(tempFolder, { recursive: true, force: true });
    
    console.log('\n✅ Test complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    await fs.rm(tempFolder, { recursive: true, force: true }).catch(() => {});
  }
}

testCriticalFields().catch(console.error);