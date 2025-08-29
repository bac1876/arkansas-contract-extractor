import { GPT5Extractor } from './extraction-gpt5';
import { SellerNetSheetCalculator } from './seller-net-sheet-calculator';
import PDFGenerator from './pdf-generator';
import * as fs from 'fs';
import * as path from 'path';

async function test15Dunbarton() {
  console.log('🔍 Testing 15 Dunbarton Contract Extraction');
  console.log('=' + '='.repeat(60));
  
  // Use the latest 15 Dunbarton PDF
  const pdfPath = path.join(__dirname, 'processed_contracts/pdfs/1756297201088_15 Dunbarton.pdf');
  
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ PDF not found:', pdfPath);
    return;
  }
  
  console.log('📄 Processing:', pdfPath);
  console.log('');
  
  // Step 1: Extract data using GPT5Extractor
  console.log('📊 Starting extraction...');
  const extractor = new GPT5Extractor();
  
  try {
    const extractionResult = await extractor.extractFromPDF(pdfPath);
    
    if (!extractionResult.success) {
      console.error('❌ Extraction failed:', extractionResult.error);
      return;
    }
    
    console.log('✅ Extraction completed successfully');
    console.log(`   Fields extracted: ${extractionResult.fieldsExtracted}/${extractionResult.totalFields}`);
    console.log(`   Extraction rate: ${extractionResult.extractionRate}`);
    console.log('');
    
    // Step 2: Verify critical fields
    console.log('🔎 Verifying critical fields:');
    console.log('');
    
    const data = extractionResult.data;
    
    // Check closing date (should be from page 12)
    console.log('1. Closing Date:');
    if (data.closing_date) {
      console.log(`   ✅ Extracted: ${data.closing_date}`);
    } else {
      console.log('   ❌ Not extracted (should be from page 12)');
    }
    console.log('');
    
    // Check home warranty (paragraph 15)
    console.log('2. Home Warranty (Para 15):');
    console.log(`   Option: ${data.para15_home_warranty || 'Not extracted'}`);
    console.log(`   Company: ${data.para15_warranty_company || 'Not extracted'}`);
    console.log(`   Paid by: ${data.para15_warranty_paid_by || 'Not extracted'}`);
    console.log(`   Cost: ${data.para15_warranty_cost || 'Not extracted'}`);
    console.log('');
    
    // Check selling firm/agent info
    console.log('3. Selling Agent Information:');
    console.log(`   Firm: ${data.selling_firm_name || 'Not extracted'}`);
    console.log(`   Agent: ${data.selling_agent_name || 'Not extracted'}`);
    console.log(`   AREC: ${data.selling_agent_arec || 'Not extracted'}`);
    console.log(`   Email: ${data.selling_agent_email || 'Not extracted'}`);
    console.log(`   Phone: ${data.selling_agent_phone || 'Not extracted'}`);
    console.log('');
    
    // Check buyer agency fee (paragraph 32)
    console.log('4. Buyer Agency Fee (Para 32):');
    console.log(`   Text: ${data.para32_additional_terms || 'Not extracted'}`);
    
    // Step 3: Calculate net sheet
    console.log('');
    console.log('💰 Calculating Net Sheet...');
    console.log('');
    
    const calculator = new SellerNetSheetCalculator();
    const netSheetData = calculator.calculate({
      purchase_price: data.purchase_price || 350000,
      para32_other_terms: data.para32_additional_terms,
      closing_date: data.closing_date || '10/31/2025',
      para11_survey_option: data.para11_survey_option,
      para11_survey_paid_by: data.para11_survey_paid_by,
      annual_taxes: 3650, // Default estimate
      seller_commission_percent: 0.03 // 3% seller commission
    });
    
    console.log('Net Sheet Results:');
    console.log(`   Purchase Price: $${netSheetData.sales_price.toLocaleString()}`);
    console.log(`   Buyer Agency Fees: $${netSheetData.buyer_agency_fees.toLocaleString()}`);
    
    // Verify buyer agency fee calculation
    const expectedBuyerAgencyFee = netSheetData.sales_price * 0.03; // 3% of purchase price
    if (Math.abs(netSheetData.buyer_agency_fees - expectedBuyerAgencyFee) < 1) {
      console.log(`   ✅ Buyer agency fee correctly calculated (3% = $${expectedBuyerAgencyFee.toLocaleString()})`);
    } else {
      console.log(`   ❌ Buyer agency fee mismatch! Expected $${expectedBuyerAgencyFee.toLocaleString()}, got $${netSheetData.buyer_agency_fees.toLocaleString()}`);
    }
    
    console.log(`   Survey Cost: $${netSheetData.survey_cost.toLocaleString()}`);
    console.log(`   Total Costs: $${netSheetData.total_costs.toLocaleString()}`);
    console.log(`   Net to Seller: $${netSheetData.cash_to_seller.toLocaleString()}`);
    console.log('');
    
    // Step 4: Generate PDF net sheet
    console.log('📄 Generating Net Sheet PDF...');
    const pdfGen = new PDFGenerator();
    const propertyAddress = data.property_address || '15 Dunbarton Cir Bella Vista, AR 72714';
    const buyers = Array.isArray(data.buyers) ? data.buyers.join(' and ') : data.buyers || 'Tom Smoth and Sue Jones';
    
    const pdfOutputPath = await pdfGen.generateNetSheetPDF(
      netSheetData,
      propertyAddress,
      { 
        buyers: buyers, 
        closing_date: data.closing_date || '10/31/2025'
      }
    );
    
    console.log(`✅ Net Sheet PDF generated: ${pdfOutputPath}`);
    console.log('');
    
    // Step 5: Save extraction results to JSON
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const resultPath = path.join(__dirname, `test_results/15_dunbarton_test_${timestamp}.json`);
    
    // Create directory if it doesn't exist
    const resultDir = path.dirname(resultPath);
    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true });
    }
    
    fs.writeFileSync(resultPath, JSON.stringify({
      extraction: extractionResult,
      netSheet: netSheetData,
      verificationResults: {
        closingDateExtracted: !!data.closing_date,
        homeWarrantyExtracted: !!data.para15_home_warranty,
        sellingFirmExtracted: !!data.selling_firm_name,
        buyerAgencyFeeCorrect: Math.abs(netSheetData.buyer_agency_fees - expectedBuyerAgencyFee) < 1
      }
    }, null, 2));
    
    console.log(`📊 Test results saved to: ${resultPath}`);
    console.log('');
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

// Run the test
test15Dunbarton().catch(console.error);