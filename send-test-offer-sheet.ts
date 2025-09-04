/**
 * Send Test Offer Sheet Email
 * Tests the complete offer sheet generation and email sending flow
 */

import { OfferSheetExtractor } from './offer-sheet-app/offer-sheet-extractor';
import { OfferSheetFormatter } from './offer-sheet-app/offer-sheet-formatter';
import { AzureEmailService } from './offer-sheet-app/azure-email-service';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function sendTestOfferSheet() {
  console.log('📧 Testing Complete Offer Sheet Email Flow\n');
  
  const recipientEmail = process.env.OFFER_SHEET_EMAIL || 'contractextraction@gmail.com';
  const contractPath = path.join(__dirname, 'test_contract2.pdf');
  
  console.log('📬 Will send to:', recipientEmail);
  console.log('📄 Using contract:', contractPath);
  
  try {
    // Step 1: Extract data
    console.log('\n🔍 Extracting contract data...');
    const extractor = new OfferSheetExtractor();
    const offerData = await extractor.extractFromPDF(contractPath);
    
    console.log('✅ Extraction complete!');
    console.log('   Buyer:', offerData.buyerNames);
    console.log('   Price:', offerData.purchasePrice ? `$${offerData.purchasePrice.toLocaleString()}` : 'N/A');
    
    // Step 2: Format email
    console.log('\n📝 Formatting offer sheet...');
    const formatter = new OfferSheetFormatter();
    const htmlContent = formatter.formatOfferSheet(offerData);
    const textContent = formatter.formatPlainText(offerData);
    
    // Step 3: Send email
    console.log('\n📤 Sending offer sheet email...');
    const emailService = new AzureEmailService();
    
    const sent = await emailService.sendContractOfferSheet(
      recipientEmail,
      contractPath,
      htmlContent,
      textContent
    );
    
    if (sent) {
      console.log('\n✅ SUCCESS! Offer sheet email sent to:', recipientEmail);
      console.log('\n📌 Next steps:');
      console.log('1. Check your inbox at', recipientEmail);
      console.log('2. Verify the email formatting looks professional');
      console.log('3. Check that the PDF attachment is included');
      console.log('4. Try forwarding it to test the workflow');
    } else {
      console.log('\n❌ Failed to send email. Check configuration.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run the test
console.log('='.repeat(60));
console.log('  Offer Sheet App - Complete Email Test');
console.log('='.repeat(60));

sendTestOfferSheet().catch(console.error);