import { GPT5Extractor } from './extraction-gpt5';
import { SellerNetSheetCalculator } from './seller-net-sheet-calculator';

async function test() {
  const extractor = new GPT5Extractor();
  const calculator = new SellerNetSheetCalculator();
  
  // Test with 901 Sparrow - using latest file
  const pdfPath = './processed_contracts/pdfs/1756395798066_901 Sparrow.pdf';
  console.log('🔍 Testing extraction and net sheet for 901 Sparrow...');
  
  try {
    const result = await extractor.extractFromPDF(pdfPath);
    console.log('✅ Extraction succeeded');
    console.log('All extracted data keys:', Object.keys(result.data || {}));
    console.log('seller_pays_buyer_costs:', result.data?.seller_pays_buyer_costs);
    console.log('Type:', typeof result.data?.seller_pays_buyer_costs);
    
    // Test net sheet generation
    if (result.data) {
      const netSheetInput = {
        purchase_price: result.data.purchase_price || 0,
        cash_amount: result.data.cash_amount,
        seller_concessions: result.data.seller_pays_buyer_costs,
        closing_date: result.data.closing_date,
        buyer_agency_fee: result.data.buyer_agency_fee,
        title_option: result.data.para10_title_option,
        home_warranty: result.data.para15_home_warranty,
        warranty_amount: result.data.para15_warranty_cost ? parseFloat(result.data.para15_warranty_cost) : undefined,
        para11_survey_option: result.data.para11_survey_option,
        para11_survey_paid_by: result.data.para11_survey_paid_by
      };
      
      const netSheet = calculator.calculate(netSheetInput);
      console.log('✅ Net sheet generated successfully');
      console.log('Seller concessions:', netSheet.seller_concessions);
      console.log('Buyer agency fees:', netSheet.buyer_agency_fees);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

test();