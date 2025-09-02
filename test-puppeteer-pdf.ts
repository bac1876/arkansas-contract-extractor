import { PDFGenerator } from './pdf-generator';

async function testPDF() {
  const generator = new PDFGenerator();
  const testData = {
    sales_price: 250000,
    seller_concessions: 5000,
    taxes_prorated: 3320,
    commission_seller: 7500,
    buyer_agency_fees: 5000,
    closing_fee: 400,
    title_search: 300,
    title_insurance: 725,
    title_recording_fees: 100,
    pest_transfer: 450,
    tax_stamps: 412.50,
    home_warranty: 6955,
    total_costs: 31162.50,
    cash_to_seller: 218837.50,
    closing_date: '2025-09-15'
  };
  
  try {
    console.log('Testing PDF generation with Puppeteer...');
    const result = await generator.generateNetSheetPDF(
      testData,
      '123 Test Street, City, AR 72701',
      { buyers: 'Test Buyer' }
    );
    console.log('Result:', result);
    
    if (result.type === 'pdf') {
      console.log('✅ SUCCESS: Real PDF generated at', result.path);
      
      // Check file size
      const fs = require('fs');
      const stats = fs.statSync(result.path);
      console.log('PDF size:', stats.size, 'bytes');
    } else {
      console.log('❌ FAILED: Generated HTML instead of PDF');
    }
  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
  }
}

testPDF();