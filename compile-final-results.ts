/**
 * Compile all extraction results into final complete contract data
 */

import * as fs from 'fs/promises';

async function compileFinalResults() {
  console.log('Compiling Complete Contract Extraction');
  console.log('='.repeat(60) + '\n');

  try {
    // Load all extracted data
    const page1Data = JSON.parse(await fs.readFile('./page1_vision_results.json', 'utf-8'));
    const page3Data = JSON.parse(await fs.readFile('./pages/page3_agency_results.json', 'utf-8'));
    const page4Data = JSON.parse(await fs.readFile('./pages/page4_results.json', 'utf-8'));
    const allPagesData = JSON.parse(await fs.readFile('./complete_vision_extraction.json', 'utf-8'));
    
    // Compile complete results
    const completeResults = {
      // Page 1 - Basic Info
      buyers: page1Data.buyers || [],
      property_address: page1Data.property_address,
      property_type: page1Data.property_type,
      purchase_type: page1Data.purchase_type,
      purchase_price: page1Data.purchase_price,
      loan_type: page1Data.loan_type,
      
      // Page 3 - Agency
      agency_type: page3Data.agency_type,
      agency_options: page3Data.agency_options_checked,
      
      // Page 4 - Financial Terms
      loan_costs: page4Data.para5_loan_costs,
      appraisal_option: page4Data.para6_appraisal?.option_checked,
      earnest_money: page4Data.para7_earnest_money?.has_earnest_money,
      earnest_money_amount: page4Data.para7_earnest_money?.amount,
      earnest_money_held_by: page4Data.para7_earnest_money?.held_by,
      non_refundable: page4Data.para8_non_refundable?.is_non_refundable,
      non_refundable_amount: page4Data.para8_non_refundable?.amount,
      non_refundable_when: page4Data.para8_non_refundable?.when,
      
      // All other pages
      title_option: allPagesData.para10_title,
      survey: allPagesData.para11_survey,
      personal_property: allPagesData.para13_custom,
      contingency: allPagesData.para14_contingency,
      contingency_details: allPagesData.para14_details,
      home_warranty: allPagesData.para15_warranty,
      warranty_details: allPagesData.para15_details,
      inspection_option: allPagesData.para16_inspection,
      wood_infestation: allPagesData.para18_wood,
      termite: allPagesData.para19_termite,
      lead_paint: allPagesData.para20_lead,
      contract_date: allPagesData.para22_date,
      possession: allPagesData.para23_possession,
      possession_details: allPagesData.para23_details,
      additional_terms: allPagesData.para32_custom,
      para37_option: allPagesData.para37_option,
      acceptance_date: allPagesData.para38_date,
      serial_number: allPagesData.para39_serial
    };
    
    // Display results
    console.log('📋 COMPLETE CONTRACT DATA');
    console.log('-'.repeat(60));
    
    console.log('\n🏠 PROPERTY & PARTIES:');
    console.log(`Buyers: ${completeResults.buyers.join(', ')}`);
    console.log(`Property: ${completeResults.property_address}`);
    console.log(`Property Type: ${completeResults.property_type}`);
    
    console.log('\n💰 FINANCIAL:');
    console.log(`Purchase Type: ${completeResults.purchase_type}`);
    console.log(`Purchase Price: $${completeResults.purchase_price?.toLocaleString()}`);
    console.log(`Loan Type: ${completeResults.loan_type}`);
    console.log(`Earnest Money: ${completeResults.earnest_money}`);
    if (completeResults.non_refundable === 'YES') {
      console.log(`Non-refundable: $${completeResults.non_refundable_amount?.toLocaleString()} after 7 days`);
    }
    
    console.log('\n📑 TERMS & CONDITIONS:');
    console.log(`Agency: ${completeResults.agency_options?.join(', ')}`);
    console.log(`Title Option: ${completeResults.title_option}`);
    console.log(`Survey: ${completeResults.survey}`);
    console.log(`Contingency: ${completeResults.contingency}`);
    console.log(`Home Warranty: ${completeResults.home_warranty}`);
    console.log(`Inspection: Option ${completeResults.inspection_option}`);
    console.log(`Termite: Option ${completeResults.termite}`);
    console.log(`Lead Paint: Option ${completeResults.lead_paint}`);
    console.log(`Possession: ${completeResults.possession}`);
    
    console.log('\n📅 DATES:');
    console.log(`Contract Date: ${completeResults.contract_date}`);
    console.log(`Acceptance Date: ${completeResults.acceptance_date}`);
    
    console.log('\n🔢 IDENTIFIERS:');
    console.log(`Serial Number: ${completeResults.serial_number}`);
    
    if (completeResults.additional_terms) {
      console.log('\n📝 ADDITIONAL TERMS:');
      console.log(completeResults.additional_terms);
    }
    
    // Save final results
    await fs.writeFile('./FINAL_CONTRACT_EXTRACTION.json', JSON.stringify(completeResults, null, 2));
    console.log('\n✅ Final results saved to FINAL_CONTRACT_EXTRACTION.json');
    
    // Count non-null fields
    const totalFields = Object.keys(completeResults).length;
    const filledFields = Object.values(completeResults).filter(v => 
      v !== null && v !== undefined && v !== '' && 
      (Array.isArray(v) ? v.length > 0 : true)
    ).length;
    
    console.log(`\n📊 EXTRACTION SUMMARY:`);
    console.log(`   Total fields: ${totalFields}`);
    console.log(`   Filled fields: ${filledFields}`);
    console.log(`   Success rate: ${Math.round(filledFields/totalFields * 100)}%`);
    
  } catch (error) {
    console.error('Error compiling results:', error);
  }
}

compileFinalResults().catch(console.error);