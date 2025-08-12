require('dotenv').config();
const { ImageMagickExtractor } = require('./dist/extraction-imagemagick.js');
const path = require('path');

async function testFullExtraction() {
  console.log('🔍 Testing FULL extraction on 3461 Alliance Dr contract...\n');
  
  const extractor = new ImageMagickExtractor();
  const pdfPath = path.resolve('Offer (EXE)-3461 Alliance Dr.pdf');
  
  console.log('Starting extraction...');
  const result = await extractor.extractFromPDF(pdfPath);
  
  if (result.success) {
    console.log('\n📊 EXTRACTION RESULTS:');
    console.log('='.repeat(50));
    console.log(`✅ Success: ${result.fieldsExtracted}/${result.totalFields} fields (${result.extractionRate})`);
    
    console.log('\n📋 Fields Extracted:');
    const data = result.data;
    
    // List all 41 expected fields and their status
    const allFields = [
      'buyers', 'sellers', 'property_address', 'property_type', 'purchase_type',
      'para3_option_checked', 'purchase_price', 'cash_amount', 'loan_type',
      'para5_amounts', 'para5_custom_text', 'seller_concessions',
      'appraisal_option', 'appraisal_details',
      'earnest_money', 'earnest_money_amount', 'earnest_money_held_by',
      'non_refundable', 'non_refundable_amount', 'non_refundable_when',
      'title_option', 'survey_option', 'survey_details',
      'para13_items_included', 'para13_items_excluded',
      'contingency', 'contingency_details',
      'home_warranty', 'warranty_details', 'warranty_paid_by',
      'inspection_option', 'inspection_details',
      'wood_infestation', 'termite_option', 'lead_paint_option',
      'contract_date', 'closing_date', 'acceptance_date',
      'possession_option', 'possession_details',
      'additional_terms', 'para37_option', 'serial_number',
      'agency_option', 'agency_type'
    ];
    
    let extracted = 0;
    let missing = [];
    
    allFields.forEach(field => {
      const value = data[field];
      const hasValue = value !== null && value !== undefined && value !== '';
      
      if (hasValue) {
        extracted++;
        if (Array.isArray(value)) {
          console.log(`  ✅ ${field}: [${value.join(', ')}]`);
        } else {
          console.log(`  ✅ ${field}: ${JSON.stringify(value)}`);
        }
      } else {
        missing.push(field);
      }
    });
    
    console.log('\n❌ MISSING FIELDS (' + missing.length + '):');
    missing.forEach(field => {
      console.log(`  - ${field}`);
    });
    
    console.log('\n📊 SUMMARY:');
    console.log(`  Extracted: ${extracted}/41 fields`);
    console.log(`  Missing: ${missing.length}/41 fields`);
    console.log(`  Pages to fix: ${Math.ceil(missing.length / 3)} pages (approx)`);
    
  } else {
    console.log('❌ Extraction failed:', result.error);
  }
}

testFullExtraction().catch(console.error);