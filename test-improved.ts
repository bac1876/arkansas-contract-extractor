/**
 * Test script for Improved Arkansas contract extraction
 * Handles A/B checkbox formats correctly
 */

import { ImprovedExtractor } from './src/agents/improved-extractor';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testImprovedExtraction() {
  console.log('IMPROVED Arkansas Contract Field Extraction Test');
  console.log('================================================\n');
  console.log('Features:');
  console.log('✓ Handles A. Yes / B. No format');
  console.log('✓ Recognizes checkbox patterns');
  console.log('✓ Specific extractors for problem fields');
  console.log('✓ Higher confidence scoring\n');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY not found');
    return;
  }

  const extractor = new ImprovedExtractor();
  const contractPath = './sample_contract.pdf';

  try {
    // Parse PDF
    console.log('Step 1: Parsing PDF...');
    const pdfData = await extractor.parsePDF(contractPath);
    console.log(`✓ PDF parsed: ${pdfData.pages} pages, ${pdfData.text.length} characters\n`);

    // Extract fields
    console.log('Step 2: Extracting fields with improved logic...');
    const results = await extractor.extractFields(pdfData.text);
    
    console.log('\n✓ Extraction complete!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('              IMPROVED EXTRACTION RESULTS               ');
    console.log('═══════════════════════════════════════════════════════\n');

    // Display key A/B format fields with improvements
    console.log('A/B FORMAT FIELDS (IMPROVED):');
    console.log('------------------------------\n');

    console.log('1. EARNEST MONEY (Paragraph 7):');
    console.log(`   Has Earnest Money: ${results.paragraph7_earnest_money.has_earnest_money ? '✓ YES' : '✗ NO'}`);
    console.log(`   Confidence: ${results.paragraph7_earnest_money.confidence}%`);
    if (results.paragraph7_earnest_money.raw_text) {
      console.log(`   Evidence: "${results.paragraph7_earnest_money.raw_text.substring(0, 100)}..."`);
    }
    console.log();

    console.log('2. NON-REFUNDABLE DEPOSIT (Paragraph 8):');
    console.log(`   Is Non-refundable: ${results.paragraph8_nonrefundable.is_nonrefundable ? '✓ YES' : '✗ NO'}`);
    console.log(`   Confidence: ${results.paragraph8_nonrefundable.confidence}%`);
    if (results.paragraph8_nonrefundable.raw_text) {
      console.log(`   Evidence: "${results.paragraph8_nonrefundable.raw_text.substring(0, 100)}..."`);
    }
    console.log();

    console.log('3. HOME WARRANTY (Paragraph 15):');
    console.log(`   Has Warranty: ${results.paragraph15_warranty.has_warranty ? '✓ YES' : '✗ NO'}`);
    console.log(`   Confidence: ${results.paragraph15_warranty.confidence}%`);
    if (results.paragraph15_warranty.checkbox_b_selected) {
      console.log(`   Checkbox B Selected: Yes`);
      if (results.paragraph15_warranty.checkbox_b_data) {
        console.log(`   Checkbox B Data: ${results.paragraph15_warranty.checkbox_b_data}`);
      }
    }
    console.log();

    console.log('MULTIPLE CHOICE FIELDS:');
    console.log('-----------------------\n');

    console.log('4. TITLE OPTION (Paragraph 10):');
    console.log(`   Selected Option: ${results.paragraph10_title.selected_option || 'None'}`);
    console.log(`   Confidence: ${results.paragraph10_title.confidence}%`);
    console.log();

    console.log('5. SURVEY (Paragraph 11):');
    console.log(`   Survey Required: ${results.paragraph11_survey.survey_required ? 'Yes' : 'No'}`);
    console.log(`   Who Pays: ${results.paragraph11_survey.who_pays || 'Not specified'}`);
    console.log(`   Confidence: ${results.paragraph11_survey.confidence}%`);
    console.log();

    console.log('OTHER KEY FIELDS:');
    console.log('-----------------\n');

    console.log('6. PARTIES (Paragraph 1):');
    if (results.paragraph1_parties.buyer_names && results.paragraph1_parties.buyer_names.length > 0) {
      results.paragraph1_parties.buyer_names.forEach((buyer, i) => {
        console.log(`   Buyer ${i + 1}: ${buyer}`);
      });
    }
    console.log(`   Property: ${results.paragraph1_parties.property_address || 'Not found'}`);
    console.log(`   Confidence: ${results.paragraph1_parties.confidence}%\n`);

    console.log('7. FINANCIAL:');
    console.log(`   Purchase Price: ${results.paragraph3_purchase_price.amount ? '$' + results.paragraph3_purchase_price.amount.toLocaleString() : 'Not found'}`);
    console.log(`   Loan Type: ${results.paragraph3_loan_type.type || 'Not found'}`);
    console.log();

    console.log('8. CONTINGENCY (Paragraph 14):');
    console.log(`   Has Contingency: ${results.paragraph14_contingency.has_contingency ? 'Yes' : 'No'}`);
    console.log(`   Confidence: ${results.paragraph14_contingency.confidence}%\n`);

    console.log('9. DATES:');
    console.log(`   Para 22 Date: ${results.paragraph22_date.date || 'Not found'}`);
    console.log(`   Para 38 Date: ${results.paragraph38_date.date || 'Not found'}\n`);

    console.log('10. CONTRACT SERIAL (Paragraph 39):');
    console.log(`    Serial: ${results.paragraph39_serial.serial_number || 'Not found'}`);
    console.log(`    Confidence: ${results.paragraph39_serial.confidence}%\n`);

    // Comparison with previous extraction
    console.log('═══════════════════════════════════════════════════════');
    console.log('                   IMPROVEMENTS SUMMARY                 ');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const improvements = [
      { field: 'Earnest Money', old: 'No', new: results.paragraph7_earnest_money.has_earnest_money ? 'Yes' : 'No' },
      { field: 'Non-refundable', old: 'Unknown', new: results.paragraph8_nonrefundable.is_nonrefundable ? 'Yes' : 'No' },
      { field: 'Home Warranty', old: 'Unknown', new: results.paragraph15_warranty.has_warranty ? 'Yes' : 'No' },
      { field: 'Title Option', old: 'None', new: results.paragraph10_title.selected_option || 'None' },
      { field: 'Survey Pays', old: 'Not specified', new: results.paragraph11_survey.who_pays || 'Not specified' }
    ];

    console.log('Field               | Previous    | Improved');
    console.log('-------------------|-------------|-------------');
    improvements.forEach(imp => {
      const improved = imp.old !== imp.new ? '✓' : ' ';
      console.log(`${imp.field.padEnd(18)} | ${imp.old.padEnd(11)} | ${imp.new.padEnd(11)} ${improved}`);
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('                     SAVING RESULTS                     ');
    console.log('═══════════════════════════════════════════════════════\n');

    // Save results
    const jsonOutput = extractor.exportResults(results, 'json');
    await fs.writeFile('./extraction_improved.json', jsonOutput);
    console.log('✓ Saved to extraction_improved.json');

    const csvOutput = extractor.exportResults(results, 'csv');
    await fs.writeFile('./extraction_improved.csv', csvOutput);
    console.log('✓ Saved to extraction_improved.csv');

    const summaryOutput = extractor.exportResults(results, 'summary');
    await fs.writeFile('./extraction_improved_summary.txt', summaryOutput);
    console.log('✓ Saved to extraction_improved_summary.txt');

    console.log('\n✅ Improved extraction completed successfully!');
    console.log('\nOverall Confidence: ' + results.extraction_metadata.overall_confidence + '%');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Error:', errorMessage);
  }
}

// Run the test
console.log('Starting Improved Extraction Test...\n');
testImprovedExtraction().catch(console.error);