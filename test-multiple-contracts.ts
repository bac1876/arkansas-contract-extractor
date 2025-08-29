import { GPT5Extractor } from './extraction-gpt5';
import * as fs from 'fs/promises';

async function testMultipleContracts() {
  const extractor = new GPT5Extractor();
  
  const contracts = [
    './processed_contracts/pdfs/1756249019102_15 Dunbarton.pdf',
    './processed_contracts/pdfs/1756249033951_Offer (BBS)-269 Honor Court.pdf', 
    './processed_contracts/pdfs/1756387447943_475 CAto.pdf'
  ];
  
  console.log('🔍 Testing 3 contracts with updated 28-field system...\n');
  console.log('=' + '='.repeat(60) + '\n');
  
  for (const pdfPath of contracts) {
    const filename = pdfPath.split('/').pop();
    console.log(`📄 Testing: ${filename}`);
    console.log('-'.repeat(60));
    
    try {
      const result = await extractor.extractFromPDF(pdfPath);
      
      if (result.success) {
        console.log('✅ Extraction SUCCESSFUL');
        console.log(`📊 Fields Identified: ${result.fieldsExtracted}/${result.totalFields} (${result.extractionRate})`);
        console.log(`   - Fields with data: ${result.fieldsWithData}`);
        console.log(`   - Empty/null fields: ${result.fieldsExtracted - result.fieldsWithData}`);
        
        // Show what data was extracted
        if (result.data) {
          console.log(`🏠 Property: ${result.data.property_address || 'N/A'}`);
          console.log(`👥 Buyers: ${Array.isArray(result.data.buyers) ? result.data.buyers.join(', ') : 'N/A'}`);
          
          // Show purchase amount
          const purchaseAmount = result.data.purchase_price || result.data.cash_amount;
          const dealType = result.data.purchase_price ? 'Financed' : 'Cash';
          console.log(`💰 Amount: $${purchaseAmount?.toLocaleString() || 0} (${dealType})`);
        }
        
        // Save results
        const resultFile = `test_results_${filename.replace('.pdf', '')}.json`;
        await fs.writeFile(resultFile, JSON.stringify(result, null, 2));
        console.log(`💾 Results saved to: ${resultFile}`);
        
      } else {
        console.log('❌ Extraction FAILED');
        console.log(`   Error: ${result.error}`);
      }
      
    } catch (error) {
      console.log('❌ Error processing contract:', error);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  }
  
  console.log('✅ Testing complete!');
}

testMultipleContracts().catch(console.error);