/**
 * Direct test of PDF generation with real extracted data
 */

import * as fs from 'fs/promises';
import PDFGenerator from './pdf-generator';
import AgentInfoSheetGenerator from './agent-info-sheet-generator';
import SellerNetSheetCalculator from './seller-net-sheet-calculator';

async function testDirectPDF() {
  console.log('🧪 Testing PDF generation with real extracted data...\n');
  
  // Load the extracted data from 890 Clark
  const extractedData = JSON.parse(
    await fs.readFile('processed_contracts/results/1756491967905_890 Clark_result.json', 'utf-8')
  );
  
  console.log('📊 Loaded extraction data for:', extractedData.property_address);
  
  // Calculate net sheet
  const calculator = new SellerNetSheetCalculator();
  const netSheetData = calculator.calculate({
    purchase_price: extractedData.purchase_price || 300000,
    cash_amount: extractedData.cash_amount,
    seller_concessions: extractedData.seller_pays_buyer_costs,
    closing_date: extractedData.closing_date,
    home_warranty: extractedData.para15_home_warranty,
    warranty_amount: extractedData.para15_warranty_cost,
    title_option: extractedData.para7_title_option,
    para32_other_terms: extractedData.para32_other_terms,
    buyer_agency_fee: extractedData.buyer_agency_fee,
    para11_survey_option: extractedData.para11_survey_option,
    para11_survey_paid_by: extractedData.para11_survey_paid_by,
    annual_taxes: 3000,
    seller_commission_percent: 3
  });
  
  // Test Net Sheet PDF
  console.log('\n1️⃣ Generating Net Sheet PDF...');
  const pdfGen = new PDFGenerator();
  
  try {
    const netSheetPath = await pdfGen.generateNetSheetPDF(
      netSheetData,
      extractedData.property_address || '890 Clark Cir Bentonville, AR 72713',
      extractedData
    );
    console.log('✅ Net Sheet PDF generated:', netSheetPath);
  } catch (error) {
    console.error('❌ Net Sheet PDF failed:', error.message);
  }
  
  // Test Agent Info Sheet PDF
  console.log('\n2️⃣ Generating Agent Info Sheet PDF...');
  const agentGen = new AgentInfoSheetGenerator();
  
  try {
    const agentSheetPath = await agentGen.generateAgentInfoSheet({
      property_address: extractedData.property_address || '890 Clark Cir Bentonville, AR 72713',
      purchase_price: extractedData.purchase_price || 300000,
      buyers: extractedData.buyers || 'Unknown',
      closing_date: extractedData.closing_date,
      contract_expiration_date: extractedData.contract_expiration_date,
      contract_expiration_time: extractedData.contract_expiration_time,
      listing_agent_commission: 3,
      selling_agent_commission: 3,
      selling_firm_name: extractedData.selling_firm_name,
      selling_agent_name: extractedData.selling_agent_name,
      selling_agent_phone: extractedData.selling_agent_phone,
      selling_agent_email: extractedData.selling_agent_email,
      earnest_money: extractedData.earnest_money,
      non_refundable: extractedData.non_refundable,
      non_refundable_amount: extractedData.non_refundable_amount,
      para14_contingency: extractedData.para14_contingency,
      para13_items_included: extractedData.para13_items_included,
      para13_items_excluded: extractedData.para13_items_excluded
    });
    console.log('✅ Agent Info Sheet PDF generated:', agentSheetPath);
  } catch (error) {
    console.error('❌ Agent Info Sheet PDF failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  console.log('\n✨ Test complete!');
  
  // Check file sizes
  const netSheetStats = await fs.stat(`net_sheets_pdf/netsheet_890_Clark_Cir_Bentonville_AR_72713.pdf`);
  const agentSheetStats = await fs.stat(`agent_info_sheets/offer_info_890_Clark_Cir_Bentonville_AR_72713.pdf`);
  
  console.log('\n📏 File sizes:');
  console.log(`   Net Sheet PDF: ${(netSheetStats.size / 1024).toFixed(1)} KB`);
  console.log(`   Agent Info PDF: ${(agentSheetStats.size / 1024).toFixed(1)} KB`);
}

// Run the test
testDirectPDF().catch(console.error);