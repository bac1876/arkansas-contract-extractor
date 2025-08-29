import { SellerNetSheetCalculator } from './seller-net-sheet-calculator';
import PDFGenerator from './pdf-generator';

async function testBuyerAgencyFee() {
  // Test with the actual 15 Dunbarton data
  const calculator = new SellerNetSheetCalculator();
  const pdfGen = new PDFGenerator();

  const contractData = {
    purchase_price: 350000,
    para32_other_terms: '32. OTHER: Seller agrees to pay 3% of the purchase price towards buyer agent fees',
    closing_date: '08/28/2025',
    para11_survey_option: 'A',
    para11_survey_paid_by: 'Seller',
    annual_taxes: 3650,
    seller_commission_percent: 0.03
  };

  console.log('Testing buyer agency fee calculation with 15 Dunbarton data...');
  console.log('=' + '='.repeat(60));
  console.log('');

  const result = calculator.calculate(contractData);

  console.log('');
  console.log('📊 Calculation Results:');
  console.log('  Purchase Price: $' + result.sales_price.toLocaleString());
  console.log('  Buyer Agency Fees: $' + result.buyer_agency_fees.toLocaleString());
  console.log('  Seller Commission: $' + result.commission_seller.toLocaleString()); 
  console.log('  Survey Cost: $' + result.survey_cost.toLocaleString());
  console.log('  Total Costs: $' + result.total_costs.toLocaleString());
  console.log('  Net to Seller: $' + result.cash_to_seller.toLocaleString());

  if (result.buyer_agency_fees === 10500) {
    console.log('');
    console.log('✅ SUCCESS! Buyer agency fee correctly calculated as $10,500');
  } else {
    console.log('');
    console.log('❌ ISSUE: Buyer agency fee should be $10,500 but got $' + result.buyer_agency_fees);
  }

  // Generate updated PDF
  const pdfPath = await pdfGen.generateNetSheetPDF(
    result,
    '15 Dunbarton Cir Bella Vista, AR 72714',
    { buyers: 'Tom Smoth and Sue Jones', closing_date: '08/28/2025' }
  );

  console.log('');
  console.log('📄 Generated corrected net sheet: ' + pdfPath);
}

testBuyerAgencyFee().catch(console.error);