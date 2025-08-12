/**
 * Standalone test script for Arkansas contract extraction
 * Run with: npx ts-node test-standalone.ts
 */

import { StandaloneExtractor } from './src/agents/standalone-extractor';
import * as fs from 'fs/promises';
import * as path from 'path';

async function testExtraction() {
  console.log('Arkansas Contract Field Extraction Test (Standalone)');
  console.log('====================================================\n');

  const extractor = new StandaloneExtractor();
  const contractPath = './sample_contract.pdf';

  try {
    // Check if file exists
    await fs.access(contractPath);
    console.log(`✓ Found contract file: ${contractPath}\n`);

    console.log('Parsing PDF...\n');
    
    // Parse the PDF
    const pdfData = await extractor.parsePDF(contractPath);
    console.log(`✓ PDF parsed successfully`);
    console.log(`  Pages: ${pdfData.pages}`);
    console.log(`  Text length: ${pdfData.text.length} characters\n`);

    console.log('Extracting fields...\n');

    // Extract fields
    const results = await extractor.extractFields(pdfData.text);
    
    console.log('EXTRACTION RESULTS:');
    console.log('===================\n');

    // Display results in a clean format
    console.log('1. PARTIES (Paragraph 1):');
    if (results.paragraph1_parties.buyer_names && results.paragraph1_parties.buyer_names.length > 0) {
      console.log(`   Buyers: ${results.paragraph1_parties.buyer_names.join(', ')}`);
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

    console.log('4. EARNEST MONEY (Paragraph 7):');
    console.log(`   Has Earnest Money: ${results.paragraph7_earnest_money.has_earnest_money ? 'Yes' : 'No'}`);
    if (results.paragraph7_earnest_money.amount) {
      console.log(`   Amount: $${results.paragraph7_earnest_money.amount.toLocaleString()}`);
    }
    console.log(`   Confidence: ${results.paragraph7_earnest_money.confidence}%\n`);

    console.log('5. NON-REFUNDABLE (Paragraph 8):');
    console.log(`   Is Non-refundable: ${results.paragraph8_nonrefundable.is_nonrefundable ? 'Yes' : 'No'}`);
    console.log(`   Confidence: ${results.paragraph8_nonrefundable.confidence}%\n`);

    console.log('6. TITLE OPTION (Paragraph 10):');
    console.log(`   Selected: ${results.paragraph10_title.selected_option || 'None'}`);
    console.log(`   Confidence: ${results.paragraph10_title.confidence}%\n`);

    console.log('7. SURVEY (Paragraph 11):');
    console.log(`   Who Pays: ${results.paragraph11_survey.who_pays || 'Not specified'}`);
    console.log(`   Confidence: ${results.paragraph11_survey.confidence}%\n`);

    console.log('8. CONTINGENCY (Paragraph 14):');
    console.log(`   Has Contingency: ${results.paragraph14_contingency.has_contingency ? 'Yes' : 'No'}`);
    console.log(`   Confidence: ${results.paragraph14_contingency.confidence}%\n`);

    console.log('9. HOME WARRANTY (Paragraph 15):');
    console.log(`   Has Warranty: ${results.paragraph15_warranty.has_warranty ? 'Yes' : 'No'}`);
    console.log(`   Confidence: ${results.paragraph15_warranty.confidence}%\n`);

    console.log('10. CONTRACT SERIAL (Paragraph 39):');
    console.log(`    Serial Number: ${results.paragraph39_serial.serial_number || 'Not found'}`);
    console.log(`    Confidence: ${results.paragraph39_serial.confidence}%\n`);

    // Save results
    console.log('Saving results...');
    
    // Save JSON
    const jsonOutput = extractor.exportResults(results, 'json');
    await fs.writeFile('./extraction_results.json', jsonOutput);
    console.log('✓ Saved to extraction_results.json');

    // Save CSV
    const csvOutput = extractor.exportResults(results, 'csv');
    await fs.writeFile('./extraction_results.csv', csvOutput);
    console.log('✓ Saved to extraction_results.csv');

    // Save Summary
    const summaryOutput = extractor.exportResults(results, 'summary');
    await fs.writeFile('./extraction_summary.txt', summaryOutput);
    console.log('✓ Saved to extraction_summary.txt');

    console.log('\n✅ Extraction completed successfully!');
    console.log('\nNote: This is using pattern matching for demonstration.');
    console.log('For production use, integrate with:');
    console.log('1. OpenAI API for AI-powered extraction');
    console.log('2. SmythOS platform for agent-based processing');
    console.log('3. Tesseract for OCR if dealing with scanned documents');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error during extraction:', errorMessage);
    
    if (errorMessage.includes('ENOENT')) {
      console.log('\nFile not found. Please ensure sample_contract.pdf is in the current directory.');
      console.log('Current directory:', process.cwd());
    }
  }
}

// Run the test
testExtraction().catch(console.error);