import { GPT5Extractor } from './extraction-gpt5';
import * as fs from 'fs';

async function testImprovedPrompts() {
  console.log('🎯 Testing IMPROVED GPT-5 prompts on 3418 Justice Dr...');
  console.log('   - Better detection of FILLED-IN values vs pre-printed text');
  console.log('   - Explicit instructions for buyer names, Para 5 amounts, dates\n');
  
  const extractor = new GPT5Extractor();
  const result = await extractor.extractFromPDF('Offer (EXE)-3418 Justice Dr.pdf');
  
  if (result.success) {
    console.log('✅ Extraction complete!');
    console.log('📈 Extraction rate:', result.extractionRate);
    
    // Save results
    fs.writeFileSync('3418_justice_IMPROVED_results.json', JSON.stringify(result, null, 2));
    
    // Compare with manual extraction
    const data = result.data;
    console.log('\n📊 COMPARISON WITH MANUAL EXTRACTION:');
    console.log('=====================================');
    
    const comparisons = [
      { field: 'Buyers', expected: 'Antonio Pimentel II, Abrielle Elizabeth Araujo', actual: data.buyers?.join(', ') },
      { field: 'Property', expected: '3418 Justice Drive, Springdale, AR 72764', actual: data.property_address?.split('\n')[0] },
      { field: 'Price', expected: '270000', actual: data.purchase_price },
      { field: 'Para 5 Amount', expected: '$10k or 10000', actual: data.para5_custom_text },
      { field: 'Para 10 Title', expected: 'B', actual: data.para10_title_option },
      { field: 'Para 11 Survey', expected: 'B', actual: data.para11_survey_option },
      { field: 'Para 15 Warranty', expected: 'A', actual: data.para15_home_warranty },
      { field: 'Para 19 Termite', expected: 'B', actual: data.para19_termite_option },
      { field: 'Para 32 Agency', expected: '2.7%', actual: data.buyer_agency_fee || (data.para32_additional_terms?.includes('2.7%') ? '2.7%' : 'NOT FOUND') },
      { field: 'Para 38 Exp', expected: '12/29/2024', actual: data.para38_expiration_date },
      { field: 'Closing Date', expected: '12/31/2024', actual: data.closing_date },
      { field: 'Agent Name', expected: 'Ana Rubio', actual: data.selling_agent_name }
    ];
    
    let matches = 0;
    for (const comp of comparisons) {
      const match = comp.actual?.toString().includes(comp.expected.split(',')[0]) || 
                    comp.expected.includes(comp.actual?.toString() || '');
      if (match) matches++;
      console.log(`${comp.field}: ${match ? '✅' : '❌'} ${comp.actual || 'NOT FOUND'}`);
    }
    
    console.log(`\n🎯 ACCURACY: ${matches}/${comparisons.length} (${Math.round(matches/comparisons.length*100)}%)`);
    
    // Show critical fields
    console.log('\n🔑 CRITICAL FIELDS CHECK:');
    console.log('Para 5 Full Text:', data.para5_seller_pays_text?.substring(0, 100));
  } else {
    console.error('❌ Extraction failed:', result.error);
  }
}

testImprovedPrompts().catch(console.error);