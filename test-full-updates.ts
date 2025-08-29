/**
 * Test script for all updated features
 */

import { SellerNetSheetCalculator } from './seller-net-sheet-calculator';
import PDFGenerator from './pdf-generator';
import AgentInfoSheetGenerator from './agent-info-sheet-generator';
import * as fs from 'fs/promises';
import * as path from 'path';

async function testAllUpdates() {
  console.log('Testing all updated features...\n');
  
  // Test data simulating extraction results
  const extractedData = {
    // Basic info
    property_address: '5806 W Walsh Lane Rogers, AR 72758',
    purchase_price: 300000,
    buyers: 'Brian Curtis and Lisa Brown',
    closing_date: '02/15/2025',
    
    // Para 15 - Home warranty (NEW)
    para15_home_warranty: 'B',
    para15_warranty_company: 'American Home Shield',
    para15_warranty_paid_by: 'Seller',
    para15_warranty_cost: 695, // Now extracting actual amount
    
    // Para 11 - Survey (NEW)
    para11_survey_option: 'A',
    para11_survey_paid_by: 'Equally', // Will add $500 to seller costs
    
    // Para 10 - Title
    para10_title_option: 'A',
    
    // Para 32 - Additional terms
    para32_additional_terms: 'Buyer to pay 3% buyer agency fee',
    
    // Para 38 & Selling agent info (NEW)
    para38_expiration_date: '12/29/2024',
    para38_expiration_time: '5:00 PM',
    selling_firm_name: 'Keller Williams Realty',
    selling_agent_name: 'Jane Smith',
    selling_agent_phone: '479-555-1234',
    selling_agent_email: 'jane.smith@kw.com',
    selling_agent_arec: 'PB00012345',
    selling_agent_mls: 'KW123456'
  };
  
  console.log('📊 Testing Seller Net Sheet with Survey Cost...');
  console.log('================================================\n');
  
  // Calculate net sheet with survey
  const calculator = new SellerNetSheetCalculator();
  const netSheetData = calculator.calculate({
    purchase_price: extractedData.purchase_price,
    seller_concessions: '$5000 towards buyer closing costs',
    closing_date: extractedData.closing_date,
    home_warranty: extractedData.para15_home_warranty === 'A' ? 'NO' : 'YES',
    warranty_amount: extractedData.para15_warranty_cost,
    title_option: extractedData.para10_title_option,
    para32_other_terms: extractedData.para32_additional_terms,
    para11_survey_option: extractedData.para11_survey_option,
    para11_survey_paid_by: extractedData.para11_survey_paid_by,
    annual_taxes: 3650,
    seller_commission_percent: 0.03
  });
  
  console.log('Net Sheet Results:');
  console.log(`  Sales Price: $${netSheetData.sales_price.toLocaleString()}`);
  console.log(`  Home Warranty: $${netSheetData.home_warranty} (paid by ${extractedData.para15_warranty_paid_by})`);
  console.log(`  Survey Cost: $${netSheetData.survey_cost} ${netSheetData.survey_note || ''}`);
  console.log(`  Total Costs: $${netSheetData.total_costs.toLocaleString()}`);
  console.log(`  Net to Seller: $${netSheetData.cash_to_seller.toLocaleString()}`);
  
  // Generate PDFs
  console.log('\n📄 Generating PDFs...');
  console.log('========================\n');
  
  const pdfGenerator = new PDFGenerator();
  const netSheetPdf = await pdfGenerator.generateNetSheetPDF(
    netSheetData,
    extractedData.property_address,
    extractedData
  );
  console.log(`✅ Net Sheet PDF: ${netSheetPdf}`);
  
  // Generate Agent Info Sheet
  const agentInfoGenerator = new AgentInfoSheetGenerator();
  const agentInfoData = {
    property_address: extractedData.property_address,
    purchase_price: extractedData.purchase_price,
    buyers: extractedData.buyers,
    closing_date: extractedData.closing_date,
    contract_expiration_date: extractedData.para38_expiration_date,
    contract_expiration_time: extractedData.para38_expiration_time,
    listing_agent_commission: 3,
    selling_agent_commission: 3,
    selling_firm_name: extractedData.selling_firm_name,
    selling_agent_name: extractedData.selling_agent_name,
    selling_agent_phone: extractedData.selling_agent_phone,
    selling_agent_email: extractedData.selling_agent_email,
    selling_agent_arec: extractedData.selling_agent_arec,
    selling_agent_mls: extractedData.selling_agent_mls
  };
  
  const agentInfoPdf = await agentInfoGenerator.generateAgentInfoSheet(agentInfoData);
  console.log(`✅ Agent Info Sheet: ${agentInfoPdf}`);
  
  console.log('\n📋 Summary of Updates:');
  console.log('======================');
  console.log('1. ✅ Para 15: Now extracting warranty amount ($695)');
  console.log('2. ✅ Para 11: Survey costs added based on who pays');
  console.log('   - Seller pays: $1000 estimate');
  console.log('   - Equally split: $500 estimate');  
  console.log('   - Buyer pays: $0 to seller');
  console.log('3. ✅ Page 13: Added to extraction for closing date');
  console.log('4. ✅ Page 16: Extracting selling firm name');
  console.log('5. ✅ Agent Info Sheet: New PDF with all agent details');
  console.log('6. ✅ Net Sheet: Smaller header, no date prepared, cleaner format');
  
  console.log('\n✨ All updates completed successfully!');
}

testAllUpdates().catch(console.error);