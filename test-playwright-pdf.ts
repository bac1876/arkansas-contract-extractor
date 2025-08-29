/**
 * Test Playwright PDF generation
 */

import PDFGenerator from './pdf-generator';
import AgentInfoSheetGenerator from './agent-info-sheet-generator';

async function testPDFGeneration() {
  console.log('🧪 Testing Playwright PDF generation...\n');
  
  // Test Net Sheet PDF
  console.log('1️⃣ Testing Net Sheet PDF...');
  const pdfGen = new PDFGenerator();
  
  const testNetSheetData = {
    sales_price: 300000,
    seller_concessions: 5000,
    taxes_prorated: 1250,
    commission_seller: 9000,
    buyer_agency_fees: 9000,
    title_insurance: 1800,
    closing_fee: 500,
    attorney_fees: 750,
    home_warranty: 500,
    survey_cost: 0,
    other_fees: 250,
    net_to_seller: 261950
  };
  
  try {
    const netSheetPath = await pdfGen.generateNetSheetPDF(
      testNetSheetData,
      '890 Clark Cir Bentonville, AR 72713'
    );
    console.log('✅ Net Sheet PDF generated:', netSheetPath);
  } catch (error) {
    console.error('❌ Net Sheet PDF failed:', error.message);
  }
  
  // Test Agent Info Sheet PDF
  console.log('\n2️⃣ Testing Agent Info Sheet PDF...');
  const agentGen = new AgentInfoSheetGenerator();
  
  const testAgentData = {
    property_address: '890 Clark Cir Bentonville, AR 72713',
    purchase_price: 300000,
    buyers: 'John Doe and Jane Doe',
    closing_date: '2025-09-15',
    contract_expiration_date: '2025-08-30',
    contract_expiration_time: '5:00 PM',
    listing_agent_commission: 3,
    selling_agent_commission: 3,
    selling_firm_name: 'ABC Realty',
    selling_agent_name: 'Bob Smith',
    selling_agent_phone: '479-555-1234',
    selling_agent_email: 'bob@abcrealty.com',
    earnest_money: 3000,
    non_refundable: 'NO'
  };
  
  try {
    const agentSheetPath = await agentGen.generateAgentInfoSheet(testAgentData);
    console.log('✅ Agent Info Sheet PDF generated:', agentSheetPath);
  } catch (error) {
    console.error('❌ Agent Info Sheet PDF failed:', error.message);
  }
  
  console.log('\n✨ Test complete!');
}

// Run the test
testPDFGeneration().catch(console.error);