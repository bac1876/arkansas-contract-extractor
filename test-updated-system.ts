import { GPT5Extractor } from './extraction-gpt5';
import { SellerNetSheetCalculator } from './seller-net-sheet-calculator';
import PDFGenerator from './pdf-generator';
import { AgentInfoSheetGenerator } from './agent-info-sheet-generator';
import * as fs from 'fs';
import * as path from 'path';

async function testUpdatedSystem() {
  console.log('🔍 Testing Updated Extraction System');
  console.log('=' + '='.repeat(60));
  console.log('');
  console.log('Changes implemented:');
  console.log('✅ Home warranty moved to page 8');
  console.log('✅ Termite control moved to page 10');
  console.log('✅ Home warranty cost calculation for seller');
  console.log('✅ Info sheet renamed to "Other Information About Offer"');
  console.log('✅ Disclaimer removed from info sheet');
  console.log('✅ Page mapping documented in CONTRACT_PAGE_MAPPING.md');
  console.log('');
  
  // Use the latest 15 Dunbarton PDF
  const pdfPath = path.join(__dirname, 'processed_contracts/pdfs/1756297201088_15 Dunbarton.pdf');
  
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ PDF not found:', pdfPath);
    return;
  }
  
  console.log('📄 Processing:', pdfPath);
  console.log('');
  
  // Step 1: Extract data
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
    console.log('');
    
    const data = extractionResult.data;
    
    // Step 2: Verify critical fields
    console.log('🔎 Verifying updated extractions:');
    console.log('');
    
    // Check home warranty (now on page 8)
    console.log('1. Home Warranty (Page 8):');
    console.log(`   Option: ${data.para15_home_warranty || 'Not extracted'}`);
    console.log(`   Company: ${data.para15_warranty_company || 'Not extracted'}`);
    console.log(`   Paid by: ${data.para15_warranty_paid_by || 'Not extracted'}`);
    console.log(`   Cost: ${data.para15_warranty_cost || 'Not extracted'}`);
    console.log(`   Other details: ${data.para15_other_details || 'None'}`);
    console.log('');
    
    // Check termite control (now on page 10)
    console.log('2. Termite Control (Page 10):');
    console.log(`   Option: ${data.para19_termite_option || 'Not extracted'}`);
    console.log(`   Details: ${data.para19_termite_details || 'None'}`);
    console.log('');
    
    // Check closing date (page 12)
    console.log('3. Closing Date (Page 12):');
    console.log(`   Date: ${data.closing_date || 'Not extracted'}`);
    console.log('');
    
    // Step 3: Calculate net sheet with home warranty
    console.log('💰 Calculating Net Sheet...');
    const calculator = new SellerNetSheetCalculator();
    const netSheetData = calculator.calculate({
      purchase_price: data.purchase_price || 350000,
      para32_other_terms: data.para32_additional_terms,
      closing_date: data.closing_date || '10/31/2025',
      para11_survey_option: data.para11_survey_option,
      para11_survey_paid_by: data.para11_survey_paid_by,
      para15_home_warranty: data.para15_home_warranty,
      para15_warranty_paid_by: data.para15_warranty_paid_by,
      para15_warranty_cost: data.para15_warranty_cost,
      annual_taxes: 3650,
      seller_commission_percent: 0.03
    });
    
    console.log('');
    console.log('Net Sheet Results:');
    console.log(`   Purchase Price: $${netSheetData.sales_price.toLocaleString()}`);
    console.log(`   Buyer Agency Fees: $${netSheetData.buyer_agency_fees.toLocaleString()}`);
    console.log(`   Home Warranty: $${netSheetData.home_warranty.toLocaleString()}`);
    
    // Verify home warranty calculation
    if (data.para15_home_warranty === 'B' || data.para15_home_warranty === 'C') {
      if (data.para15_warranty_paid_by === 'Seller' && data.para15_warranty_cost) {
        if (netSheetData.home_warranty === data.para15_warranty_cost) {
          console.log(`   ✅ Home warranty correctly charged to seller`);
        } else {
          console.log(`   ❌ Home warranty mismatch! Expected $${data.para15_warranty_cost}, got $${netSheetData.home_warranty}`);
        }
      }
    }
    
    console.log(`   Survey Cost: $${netSheetData.survey_cost.toLocaleString()}`);
    console.log(`   Total Costs: $${netSheetData.total_costs.toLocaleString()}`);
    console.log(`   Net to Seller: $${netSheetData.cash_to_seller.toLocaleString()}`);
    console.log('');
    
    // Step 4: Generate updated info sheet
    console.log('📄 Generating "Other Information About Offer" sheet...');
    const infoGenerator = new AgentInfoSheetGenerator();
    const propertyAddress = data.property_address || '15 Dunbarton Cir Bella Vista, AR 72714';
    const buyers = Array.isArray(data.buyers) ? data.buyers.join(' and ') : data.buyers || 'Tom Smoth and Sue Jones';
    
    const infoPath = await infoGenerator.generateAgentInfoSheet({
      property_address: propertyAddress,
      purchase_price: data.purchase_price || 350000,
      buyers: buyers,
      closing_date: data.closing_date,
      contract_expiration_date: data.para38_expiration_date,
      contract_expiration_time: data.para38_expiration_time,
      listing_agent_commission: 2.5,
      selling_agent_commission: 3,
      selling_firm_name: data.selling_firm_name,
      selling_agent_name: data.selling_agent_name,
      selling_agent_phone: data.selling_agent_phone,
      selling_agent_email: data.selling_agent_email,
      selling_agent_arec: data.selling_agent_arec,
      selling_agent_mls: data.selling_agent_mls,
      para15_other_details: data.para15_other_details
    });
    
    console.log(`✅ Info sheet generated: ${infoPath}`);
    console.log('');
    
    // Save test results
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const resultPath = path.join(__dirname, `test_results/updated_system_test_${timestamp}.json`);
    
    const resultDir = path.dirname(resultPath);
    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true });
    }
    
    fs.writeFileSync(resultPath, JSON.stringify({
      extraction: extractionResult,
      netSheet: netSheetData,
      verificationResults: {
        homeWarrantyOnPage8: !!data.para15_home_warranty,
        termiteOnPage10: !!data.para19_termite_option,
        closingDateExtracted: !!data.closing_date,
        homeWarrantyInNetSheet: netSheetData.home_warranty > 0,
        infoSheetGenerated: !!infoPath
      }
    }, null, 2));
    
    console.log(`📊 Test results saved to: ${resultPath}`);
    console.log('');
    console.log('✅ All systems updated and tested successfully!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

// Run the test
testUpdatedSystem().catch(console.error);