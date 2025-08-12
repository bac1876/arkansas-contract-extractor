/**
 * Direct test of Arkansas Specialized Extractor
 */

import { ArkansasSpecializedExtractor } from './src/agents/arkansas-specialized-extractor';
const pdfParse = require('pdf-parse');
import * as fs from 'fs';

async function testExtractor() {
  console.log('=== DIRECT TEST OF ARKANSAS SPECIALIZED EXTRACTOR ===\n');
  
  try {
    // Initialize extractor
    const extractor = new ArkansasSpecializedExtractor();
    
    // Read and parse PDF
    console.log('Reading test_contract1.pdf...');
    const pdfBuffer = fs.readFileSync('./test_contract1.pdf');
    const pdfData = await pdfParse(pdfBuffer);
    
    console.log(`PDF parsed: ${pdfData.numpages} pages, ${pdfData.text.length} chars`);
    console.log(`Contains FHA pattern: ${pdfData.text.includes('FHA. (Continues')}\n`);
    
    // Extract fields
    console.log('Starting extraction...');
    const result = await extractor.extractFields(pdfData.text);
    
    // Display results
    console.log('\n=== EXTRACTION RESULTS ===');
    console.log('Loan Type:', result.paragraph3_loan_type.type);
    console.log('Earnest Money:', result.paragraph7_earnest_money.has_earnest_money);
    console.log('Title Option:', result.paragraph10_title.selected_option);
    console.log('Survey:', result.paragraph11_survey.who_pays);
    console.log('Para 13 Custom:', result.paragraph13_custom.filled_text);
    console.log('Contingency:', result.paragraph14_contingency.has_contingency);
    console.log('Para 16:', result.paragraph16_checkbox.selected_option);
    console.log('Para 19:', result.paragraph19_checkbox.selected_option);
    console.log('Para 20:', result.paragraph20_checkbox.selected_option);
    console.log('Extraction Method:', result.extraction_metadata.extraction_method);
    console.log('Overall Confidence:', result.extraction_metadata.overall_confidence + '%');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testExtractor();