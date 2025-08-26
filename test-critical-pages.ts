import { GPT5Extractor } from './extraction-gpt5';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

async function testCriticalPages() {
  console.log('🔍 Testing critical page extractions for 3418 Justice Dr...\n');
  
  const pdfPath = 'Offer (EXE)-3418 Justice Dr.pdf';
  const tempFolder = `temp_${Date.now()}`;
  const results: any = {};
  
  try {
    await fs.mkdir(tempFolder, { recursive: true });
    const extractor = new GPT5Extractor();
    
    // Test critical pages only
    const criticalPages = [
      { page: 1, number: 0, desc: 'Property, Buyers, Price' },
      { page: 4, number: 3, desc: 'Para 5, 7, 8' },
      { page: 5, number: 4, desc: 'Para 10 Title' },
      { page: 6, number: 5, desc: 'Para 11, 13' },
      { page: 8, number: 7, desc: 'Para 15, 19' },
      { page: 13, number: 12, desc: 'Closing Date' },
      { page: 14, number: 13, desc: 'Para 32' },
      { page: 16, number: 15, desc: 'Agent Info' }
    ];
    
    for (const pageInfo of criticalPages) {
      console.log(`📄 Processing page ${pageInfo.page} (${pageInfo.desc})...`);
      
      // Convert page
      await execAsync(
        `magick convert -density 150 "${pdfPath}[${pageInfo.number}]" "${path.join(tempFolder, `page_${pageInfo.page}.png`)}"`,
        { maxBuffer: 1024 * 1024 * 10 }
      );
      
      // Extract
      const pageData = await (extractor as any).extractPage(
        path.join(tempFolder, `page_${pageInfo.page}.png`),
        pageInfo.page
      );
      
      Object.assign(results, pageData.data || {});
      console.log(`✅ Extracted ${Object.keys(pageData.data || {}).length} fields\n`);
    }
    
    // Display comparison
    console.log('\\n📊 EXTRACTION RESULTS vs MANUAL:');
    console.log('=====================================');
    
    const comparisons = [
      { field: 'Property', manual: '3418 Justice Drive, Springdale, AR 72764', auto: results.property_address },
      { field: 'Buyers', manual: 'Antonio Pimentel II, Abrielle Elizabeth Araujo', auto: results.buyers?.join(', ') },
      { field: 'Price', manual: '$270,000', auto: results.purchase_price },
      { field: 'Para 5', manual: '$10k seller concessions', auto: results.para5_custom_text || results.paragraph_5?.seller_specific_payment_text },
      { field: 'Para 10', manual: 'B (equally share)', auto: results.para10_title_option },
      { field: 'Para 11', manual: 'B (decline survey)', auto: results.para11_survey_option },
      { field: 'Para 15', manual: 'A (No warranty)', auto: results.para15_home_warranty },
      { field: 'Para 19', manual: 'B (Termite letter)', auto: results.para19_termite_option },
      { field: 'Para 32', manual: '2.7% buyer agency', auto: results.para32_additional_terms?.substring(0, 50) },
      { field: 'Closing', manual: '12/31/2024', auto: results.closing_date },
      { field: 'Agent', manual: 'Ana Rubio', auto: results.selling_agent_name },
      { field: 'License', manual: 'SA00088780', auto: results.agent_arec_license }
    ];
    
    let matches = 0;
    for (const comp of comparisons) {
      const match = comp.auto?.toString().includes(comp.manual.replace('$', '').replace(',', '')) || 
                    comp.manual.includes(comp.auto?.toString() || '');
      if (match) matches++;
      console.log(`${comp.field}: ${match ? '✅' : '❌'}`);
      console.log(`  Manual: ${comp.manual}`);
      console.log(`  Auto:   ${comp.auto || 'NOT FOUND'}`);
      console.log('');
    }
    
    console.log(`\\n📈 ACCURACY: ${matches}/${comparisons.length} (${Math.round(matches/comparisons.length*100)}%)`);
    
    // Save results
    await fs.writeFile('3418_justice_critical_test.json', JSON.stringify(results, null, 2));
    
    // Clean up
    await fs.rm(tempFolder, { recursive: true, force: true });
    
  } catch (error) {
    console.error('❌ Error:', error);
    await fs.rm(tempFolder, { recursive: true, force: true }).catch(() => {});
  }
}

testCriticalPages();