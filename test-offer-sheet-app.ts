/**
 * Test script for Offer Sheet App
 * Tests the extraction, formatting, and email sending capabilities
 */

import { OfferSheetExtractor } from './offer-sheet-app/offer-sheet-extractor';
import { OfferSheetFormatter } from './offer-sheet-app/offer-sheet-formatter';
import { AzureEmailService } from './offer-sheet-app/azure-email-service';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';

dotenv.config();

async function testOfferSheetApp() {
  console.log('🧪 Testing Offer Sheet App...\n');
  
  // Test with an existing contract
  const contractPath = path.join(__dirname, 'test_contract2.pdf');
  
  // Check if contract exists
  try {
    await fs.access(contractPath);
    console.log('✅ Found test contract:', contractPath);
  } catch {
    console.error('❌ Test contract not found. Please ensure test_contract2.pdf exists');
    return;
  }
  
  // Step 1: Test extraction
  console.log('\n📋 Step 1: Testing extraction with GPT-5...');
  const extractor = new OfferSheetExtractor();
  
  // Test both extraction methods
  const testMethod = process.argv[2] || 'page-by-page'; // Can be 'full' or 'page-by-page'
  const useFullExtraction = testMethod === 'full';
  
  console.log(`\n🔬 Extraction method: ${useFullExtraction ? 'Full HybridExtractor' : 'Page-by-page GPT-5-mini'}`);
  
  let offerData;
  try {
    offerData = await extractor.extractFromPDF(contractPath, useFullExtraction);
    console.log('✅ Extraction successful with GPT-5!');
    console.log('\n📊 Extracted Data:');
    console.log(JSON.stringify(offerData, null, 2));
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    return;
  }
  
  // Step 2: Test formatting
  console.log('\n📋 Step 2: Testing formatting...');
  const formatter = new OfferSheetFormatter();
  
  const htmlContent = formatter.formatOfferSheet(offerData);
  const textContent = formatter.formatPlainText(offerData);
  
  // Save formatted outputs for review
  const outputDir = 'offer-sheet-app/test-output';
  await fs.mkdir(outputDir, { recursive: true });
  
  await fs.writeFile(path.join(outputDir, 'offer-sheet.html'), htmlContent);
  await fs.writeFile(path.join(outputDir, 'offer-sheet.txt'), textContent);
  
  console.log('✅ Formatting successful!');
  console.log('📁 Outputs saved to:', outputDir);
  
  // Step 3: Test email service connection
  console.log('\n📋 Step 3: Testing email service...');
  const emailService = new AzureEmailService();
  
  const connectionOk = await emailService.testConnection();
  if (!connectionOk) {
    console.log('⚠️ Email service not configured. Skipping send test.');
    console.log('To configure, set SENDGRID_API_KEY in .env file');
  } else {
    console.log('✅ Email service connected!');
    
    // Optional: Send test email (uncomment to test)
    /*
    const testEmail = process.env.TEST_EMAIL_RECIPIENT || 'test@example.com';
    console.log(`\n📤 Sending test email to: ${testEmail}`);
    
    const sent = await emailService.sendContractOfferSheet(
      testEmail,
      contractPath,
      htmlContent,
      textContent
    );
    
    if (sent) {
      console.log('✅ Test email sent successfully!');
    } else {
      console.log('❌ Failed to send test email');
    }
    */
  }
  
  // Step 4: Display formatted plain text output
  console.log('\n📄 Formatted Offer Sheet (Plain Text):');
  console.log('=' .repeat(50));
  console.log(textContent);
  console.log('=' .repeat(50));
  
  console.log('\n✅ All tests completed!');
  console.log('\n💡 Next steps:');
  console.log('1. Review the HTML output in offer-sheet-app/test-output/offer-sheet.html');
  console.log('2. Configure email settings in .env if needed');
  console.log('3. Run the main processor: ts-node offer-sheet-app/offer-sheet-processor.ts');
  
  console.log('\n📌 Test Options:');
  console.log('  npm run test-offer-sheet          # Uses page-by-page GPT-5-mini extraction');
  console.log('  npm run test-offer-sheet full     # Uses full HybridExtractor with GPT-5');
}

// Run the test
testOfferSheetApp().catch(console.error);