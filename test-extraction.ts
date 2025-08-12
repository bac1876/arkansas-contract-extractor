/**
 * Test script for Arkansas contract extraction
 * Run with: npx ts-node test-extraction.ts
 */

import { ArkansasSpecificExtractor } from './src/agents/arkansas-specific-extractor';
import * as fs from 'fs/promises';
import * as path from 'path';

async function testExtraction() {
  console.log('Arkansas Contract Field Extraction Test');
  console.log('========================================\n');

  const extractor = new ArkansasSpecificExtractor();
  const contractPath = './sample_contract.pdf';

  try {
    // Check if file exists
    await fs.access(contractPath);
    console.log(`✓ Found contract file: ${contractPath}\n`);

    console.log('Starting extraction...\n');
    
    // Process the contract
    const results = await extractor.processContract(contractPath);
    
    console.log('EXTRACTION RESULTS:');
    console.log('===================\n');

    // Display key fields
    console.log('1. PARTIES (Paragraph 1):');
    console.log(`   Buyers: ${results.paragraph1_parties.buyer_names?.join(', ') || 'Not found'}`);
    console.log(`   Property: ${results.paragraph1_parties.property_address || 'Not found'}`);
    console.log(`   Confidence: ${results.paragraph1_parties.confidence}%\n`);

    console.log('2. PURCHASE PRICE (Paragraph 3):');
    console.log(`   Amount: $${results.paragraph3_purchase_price.amount || 'Not found'}`);
    console.log(`   Confidence: ${results.paragraph3_purchase_price.confidence}%\n`);

    console.log('3. LOAN TYPE (Paragraph 3):');
    console.log(`   Type: ${results.paragraph3_loan_type.type || 'Not found'}`);
    console.log(`   Confidence: ${results.paragraph3_loan_type.confidence}%\n`);

    console.log('4. PARAGRAPH 5 FILL-INS:');
    if (results.paragraph5_blanks.all_filled_data.length > 0) {
      results.paragraph5_blanks.all_filled_data.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item}`);
      });
    } else {
      console.log(`   No data found`);
    }
    console.log(`   Confidence: ${results.paragraph5_blanks.confidence}%\n`);

    console.log('5. EARNEST MONEY (Paragraph 7):');
    console.log(`   Has Earnest Money: ${results.paragraph7_earnest_money.has_earnest_money ? 'Yes' : 'No'}`);
    if (results.paragraph7_earnest_money.amount) {
      console.log(`   Amount: $${results.paragraph7_earnest_money.amount}`);
    }
    console.log(`   Confidence: ${results.paragraph7_earnest_money.confidence}%\n`);

    console.log('6. NON-REFUNDABLE (Paragraph 8):');
    console.log(`   Is Non-refundable: ${results.paragraph8_nonrefundable.is_nonrefundable ? 'Yes' : 'No'}`);
    console.log(`   Confidence: ${results.paragraph8_nonrefundable.confidence}%\n`);

    console.log('7. TITLE OPTION (Paragraph 10):');
    console.log(`   Selected: ${results.paragraph10_title.selected_option || 'None'}`);
    console.log(`   Confidence: ${results.paragraph10_title.confidence}%\n`);

    console.log('8. SURVEY (Paragraph 11):');
    console.log(`   Required: ${results.paragraph11_survey.survey_required ? 'Yes' : 'No'}`);
    console.log(`   Who Pays: ${results.paragraph11_survey.who_pays || 'Not specified'}`);
    console.log(`   Confidence: ${results.paragraph11_survey.confidence}%\n`);

    console.log('9. PARAGRAPH 13 CUSTOM TEXT:');
    console.log(`   Text: ${results.paragraph13_custom.filled_text || 'None'}`);
    console.log(`   Confidence: ${results.paragraph13_custom.confidence}%\n`);

    console.log('10. CONTINGENCY (Paragraph 14):');
    console.log(`    Has Contingency: ${results.paragraph14_contingency.has_contingency ? 'Yes' : 'No'}`);
    console.log(`    Confidence: ${results.paragraph14_contingency.confidence}%\n`);

    console.log('11. HOME WARRANTY (Paragraph 15):');
    console.log(`    Has Warranty: ${results.paragraph15_warranty.has_warranty ? 'Yes' : 'No'}`);
    console.log(`    Checkbox B Selected: ${results.paragraph15_warranty.checkbox_b_selected ? 'Yes' : 'No'}`);
    if (results.paragraph15_warranty.checkbox_b_data) {
      console.log(`    Checkbox B Data: ${results.paragraph15_warranty.checkbox_b_data}`);
    }
    console.log(`    Confidence: ${results.paragraph15_warranty.confidence}%\n`);

    console.log('12. CHECKBOX SELECTIONS:');
    console.log(`    Paragraph 16: ${results.paragraph16_checkbox.selected_option || 'None'}`);
    console.log(`    Paragraph 18: ${results.paragraph18_checkbox.selected_option || 'None'}`);
    console.log(`    Paragraph 19: ${results.paragraph19_checkbox.selected_option || 'None'}`);
    console.log(`    Paragraph 20: ${results.paragraph20_checkbox.selected_option || 'None'}\n`);

    console.log('13. DATES:');
    console.log(`    Paragraph 22 Date: ${results.paragraph22_date.date || 'Not found'}`);
    console.log(`    Paragraph 38 Date: ${results.paragraph38_date.date || 'Not found'}\n`);

    console.log('14. POSSESSION (Paragraph 23):');
    console.log(`    Selected Option: ${results.paragraph23_possession.selected_option || 'None'}`);
    console.log(`    Confidence: ${results.paragraph23_possession.confidence}%\n`);

    console.log('15. PARAGRAPH 32 CUSTOM:');
    console.log(`    Has Data: ${results.paragraph32_custom.has_data ? 'Yes' : 'No'}`);
    console.log(`    Text: ${results.paragraph32_custom.filled_text || 'None'}\n`);

    console.log('16. PARAGRAPH 37 CHECKBOX:');
    console.log(`    Selected: ${results.paragraph37_checkbox.selected_option || 'None'}\n`);

    console.log('17. CONTRACT SERIAL (Paragraph 39):');
    console.log(`    Serial Number: ${results.paragraph39_serial.serial_number || 'Not found'}`);
    console.log(`    Confidence: ${results.paragraph39_serial.confidence}%\n`);

    // Metadata
    console.log('EXTRACTION METADATA:');
    console.log('====================');
    console.log(`Overall Confidence: ${results.extraction_metadata.overall_confidence}%`);
    console.log(`Missing Fields: ${results.extraction_metadata.missing_fields.join(', ') || 'None'}`);
    console.log(`Warnings: ${results.extraction_metadata.warnings.join(', ') || 'None'}\n`);

    // Save results to files
    console.log('Saving results...');
    
    // Save JSON
    const jsonOutput = await extractor.exportResults(results, 'json');
    await fs.writeFile('./extraction_results.json', jsonOutput);
    console.log('✓ Saved to extraction_results.json');

    // Save CSV
    const csvOutput = await extractor.exportResults(results, 'csv');
    await fs.writeFile('./extraction_results.csv', csvOutput);
    console.log('✓ Saved to extraction_results.csv');

    // Save Summary
    const summaryOutput = await extractor.exportResults(results, 'summary');
    await fs.writeFile('./extraction_summary.txt', summaryOutput);
    console.log('✓ Saved to extraction_summary.txt');

    console.log('\n✅ Extraction completed successfully!');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error during extraction:', errorMessage);
    
    if (errorMessage.includes('File not found')) {
      console.log('\nPlease ensure sample_contract.pdf is in the current directory.');
    }
  }
}

// Run the test
testExtraction().catch(console.error);