/**
 * Test script for OpenAI-powered Arkansas contract extraction
 * Run with: npx ts-node test-openai.ts
 */

import { OpenAIExtractor } from './src/agents/openai-extractor';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testOpenAIExtraction() {
  console.log('Arkansas Contract Field Extraction Test (OpenAI GPT-4)');
  console.log('======================================================\n');

  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY not found in environment variables.');
    console.log('\nPlease create a .env file with your OpenAI API key:');
    console.log('OPENAI_API_KEY=your_api_key_here\n');
    console.log('You can get an API key from: https://platform.openai.com/api-keys');
    return;
  }

  console.log('✓ OpenAI API key found\n');
  console.log(`Model: ${process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'}`);
  console.log(`Temperature: ${process.env.TEMPERATURE || '0.1'}`);
  console.log(`Max Tokens: ${process.env.MAX_TOKENS || '4000'}\n`);

  const extractor = new OpenAIExtractor();
  const contractPath = './sample_contract.pdf';

  try {
    // Check if file exists
    await fs.access(contractPath);
    console.log(`✓ Found contract file: ${contractPath}\n`);

    console.log('Step 1: Parsing PDF...');
    
    // Parse the PDF
    const pdfData = await extractor.parsePDF(contractPath);
    console.log(`✓ PDF parsed successfully`);
    console.log(`  Pages: ${pdfData.pages}`);
    console.log(`  Text length: ${pdfData.text.length} characters\n`);

    console.log('Step 2: Extracting fields with GPT-4...');
    console.log('This may take 30-60 seconds depending on contract length...\n');

    // Extract fields using GPT-4
    const results = await extractor.extractFields(pdfData.text);
    
    console.log('\n✓ Extraction complete!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('                  EXTRACTION RESULTS                    ');
    console.log('═══════════════════════════════════════════════════════\n');

    // Display all 20 field groups as requested
    console.log('1. PARTIES (Paragraph 1):');
    if (results.paragraph1_parties.buyer_names && results.paragraph1_parties.buyer_names.length > 0) {
      results.paragraph1_parties.buyer_names.forEach((buyer, i) => {
        console.log(`   Buyer ${i + 1}: ${buyer}`);
      });
    } else {
      console.log(`   Buyers: Not found`);
    }
    console.log(`   Property: ${results.paragraph1_parties.property_address || 'Not found'}`);
    console.log(`   Confidence: ${results.paragraph1_parties.confidence}%\n`);

    console.log('2. PURCHASE PRICE (Paragraph 3):');
    console.log(`   Amount: ${results.paragraph3_purchase_price.amount ? '$' + results.paragraph3_purchase_price.amount.toLocaleString() : 'Not found'}`);
    console.log(`   Confidence: ${results.paragraph3_purchase_price.confidence}%\n`);

    console.log('3. LOAN TYPE (Paragraph 3):');
    console.log(`   Type: ${results.paragraph3_loan_type.type || 'Not found'}`);
    console.log(`   Confidence: ${results.paragraph3_loan_type.confidence}%\n`);

    console.log('4. PARAGRAPH 5 FILL-IN DATA:');
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
      console.log(`   Amount: $${results.paragraph7_earnest_money.amount.toLocaleString()}`);
    }
    console.log(`   Confidence: ${results.paragraph7_earnest_money.confidence}%\n`);

    console.log('6. NON-REFUNDABLE DEPOSIT (Paragraph 8):');
    console.log(`   Is Non-refundable: ${results.paragraph8_nonrefundable.is_nonrefundable ? 'Yes' : 'No'}`);
    console.log(`   Confidence: ${results.paragraph8_nonrefundable.confidence}%\n`);

    console.log('7. TITLE OPTION (Paragraph 10):');
    console.log(`   Selected Option: ${results.paragraph10_title.selected_option || 'None'}`);
    console.log(`   Confidence: ${results.paragraph10_title.confidence}%\n`);

    console.log('8. SURVEY (Paragraph 11):');
    console.log(`   Survey Required: ${results.paragraph11_survey.survey_required ? 'Yes' : 'No'}`);
    console.log(`   Who Pays: ${results.paragraph11_survey.who_pays || 'Not specified'}`);
    console.log(`   Confidence: ${results.paragraph11_survey.confidence}%\n`);

    console.log('9. PARAGRAPH 13 CUSTOM TEXT:');
    console.log(`   Text: ${results.paragraph13_custom.filled_text || 'None'}`);
    console.log(`   Confidence: ${results.paragraph13_custom.confidence}%\n`);

    console.log('10. CONTINGENCY (Paragraph 14):');
    console.log(`    Has Contingency: ${results.paragraph14_contingency.has_contingency ? 'Yes' : 'No'}`);
    if (results.paragraph14_contingency.type) {
      console.log(`    Type: ${results.paragraph14_contingency.type}`);
    }
    console.log(`    Confidence: ${results.paragraph14_contingency.confidence}%\n`);

    console.log('11. HOME WARRANTY (Paragraph 15):');
    console.log(`    Has Warranty: ${results.paragraph15_warranty.has_warranty ? 'Yes' : 'No'}`);
    console.log(`    Checkbox B Selected: ${results.paragraph15_warranty.checkbox_b_selected ? 'Yes' : 'No'}`);
    if (results.paragraph15_warranty.checkbox_b_data) {
      console.log(`    Checkbox B Data: ${results.paragraph15_warranty.checkbox_b_data}`);
    }
    console.log(`    Confidence: ${results.paragraph15_warranty.confidence}%\n`);

    console.log('12. PARAGRAPH 16 CHECKBOX:');
    console.log(`    Selected: ${results.paragraph16_checkbox.selected_option || 'None'}`);
    console.log(`    Confidence: ${results.paragraph16_checkbox.confidence}%\n`);

    console.log('13. PARAGRAPH 18 CHECKBOX:');
    console.log(`    Selected: ${results.paragraph18_checkbox.selected_option || 'None'}`);
    console.log(`    Confidence: ${results.paragraph18_checkbox.confidence}%\n`);

    console.log('14. PARAGRAPH 19 CHECKBOX:');
    console.log(`    Selected: ${results.paragraph19_checkbox.selected_option || 'None'}`);
    console.log(`    Confidence: ${results.paragraph19_checkbox.confidence}%\n`);

    console.log('15. PARAGRAPH 20 CHECKBOX:');
    console.log(`    Selected: ${results.paragraph20_checkbox.selected_option || 'None'}`);
    console.log(`    Confidence: ${results.paragraph20_checkbox.confidence}%\n`);

    console.log('16. PARAGRAPH 22 DATE:');
    console.log(`    Date: ${results.paragraph22_date.date || 'Not found'}`);
    console.log(`    Confidence: ${results.paragraph22_date.confidence}%\n`);

    console.log('17. POSSESSION (Paragraph 23):');
    console.log(`    Selected Option: ${results.paragraph23_possession.selected_option || 'None'}`);
    if (results.paragraph23_possession.details) {
      console.log(`    Details: ${results.paragraph23_possession.details}`);
    }
    console.log(`    Confidence: ${results.paragraph23_possession.confidence}%\n`);

    console.log('18. PARAGRAPH 32 CUSTOM DATA:');
    console.log(`    Has Data: ${results.paragraph32_custom.has_data ? 'Yes' : 'No'}`);
    console.log(`    Text: ${results.paragraph32_custom.filled_text || 'None'}`);
    console.log(`    Confidence: ${results.paragraph32_custom.confidence}%\n`);

    console.log('19. PARAGRAPH 37 CHECKBOX:');
    console.log(`    Selected: ${results.paragraph37_checkbox.selected_option || 'None'}`);
    console.log(`    Confidence: ${results.paragraph37_checkbox.confidence}%\n`);

    console.log('20. PARAGRAPH 38 DATE:');
    console.log(`    Date: ${results.paragraph38_date.date || 'Not found'}`);
    console.log(`    Confidence: ${results.paragraph38_date.confidence}%\n`);

    console.log('21. CONTRACT SERIAL NUMBER (Paragraph 39):');
    console.log(`    Serial: ${results.paragraph39_serial.serial_number || 'Not found'}`);
    console.log(`    Confidence: ${results.paragraph39_serial.confidence}%\n`);

    // Metadata
    console.log('═══════════════════════════════════════════════════════');
    console.log('                   EXTRACTION METADATA                  ');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`Overall Confidence: ${results.extraction_metadata.overall_confidence}%`);
    console.log(`Missing Fields: ${results.extraction_metadata.missing_fields.length > 0 ? results.extraction_metadata.missing_fields.join(', ') : 'None'}`);
    console.log(`Warnings: ${results.extraction_metadata.warnings.length > 0 ? results.extraction_metadata.warnings.join(', ') : 'None'}\n`);

    // Save results
    console.log('═══════════════════════════════════════════════════════');
    console.log('                    SAVING RESULTS                      ');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Save JSON
    const jsonOutput = extractor.exportResults(results, 'json');
    await fs.writeFile('./extraction_results_openai.json', jsonOutput);
    console.log('✓ Saved to extraction_results_openai.json');

    // Save CSV
    const csvOutput = extractor.exportResults(results, 'csv');
    await fs.writeFile('./extraction_results_openai.csv', csvOutput);
    console.log('✓ Saved to extraction_results_openai.csv');

    // Save Summary
    const summaryOutput = extractor.exportResults(results, 'summary');
    await fs.writeFile('./extraction_summary_openai.txt', summaryOutput);
    console.log('✓ Saved to extraction_summary_openai.txt');

    console.log('\n✅ OpenAI extraction completed successfully!');
    console.log('\n═══════════════════════════════════════════════════════');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Error during extraction:', errorMessage);
    
    if (errorMessage.includes('ENOENT')) {
      console.log('\nFile not found. Please ensure sample_contract.pdf is in the current directory.');
      console.log('Current directory:', process.cwd());
    } else if (errorMessage.includes('401')) {
      console.log('\nAuthentication error. Please check your OpenAI API key.');
    } else if (errorMessage.includes('429')) {
      console.log('\nRate limit error. Please wait a moment and try again.');
    } else if (errorMessage.includes('insufficient_quota')) {
      console.log('\nInsufficient OpenAI credits. Please check your account balance.');
    }
  }
}

// Run the test
console.log('Starting OpenAI-powered extraction...\n');
testOpenAIExtraction().catch(console.error);