/**
 * Test sending a contract to offers@searchnwa.com
 * This simulates what would happen when someone emails a contract
 */

import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function sendTestContract() {
  console.log('📧 Test Contract Email Sender');
  console.log('=' .repeat(60));

  // Check if test contract exists - using the one with percentage
  const testContractPath = 'testcontractsellerconcessions.pdf';
  if (!fs.existsSync(testContractPath)) {
    console.error('❌ Test contract not found: testcontractsellerconcessions.pdf');
    console.log('   Please ensure testcontractsellerconcessions.pdf exists in the project directory');
    return;
  }

  // Create email transporter using contractextraction@gmail.com
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'contractextraction@gmail.com',
      pass: 'wogp iruk bytf hcqx'  // App password from .env
    }
  });

  // Prepare email with attachment
  const mailOptions = {
    from: 'contractextraction@gmail.com',
    to: 'offers@searchnwa.com',
    subject: `Test Contract with 3% Seller Concessions - ${new Date().toLocaleString()}`,
    text: 'This contract has "3% of the purchase price" in paragraph 5 for seller concessions testing.',
    attachments: [
      {
        filename: 'testcontractsellerconcessions.pdf',
        path: testContractPath
      }
    ]
  };

  try {
    console.log('\n📤 Sending test contract to offers@searchnwa.com...');
    console.log(`   From: ${mailOptions.from}`);
    console.log(`   To: ${mailOptions.to}`);
    console.log(`   Subject: ${mailOptions.subject}`);
    console.log(`   Attachment: ${mailOptions.attachments[0].filename}`);

    const info = await transporter.sendMail(mailOptions);

    console.log('\n✅ Email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);

    console.log('\n📋 NEXT STEPS:');
    console.log('1. The email monitor should detect this email within 30 seconds');
    console.log('2. It will extract data from the PDF contract');
    console.log('3. Generate a seller net sheet');
    console.log('4. Save the net sheet locally (Google Drive upload may fail)');

    console.log('\n🔍 To check if it was processed:');
    console.log('   - Check net_sheets_pdf/ directory for new PDF');
    console.log('   - Check processed_emails.json for the email ID');
    console.log('   - Run: npx ts-node check-inbox.ts to see unread count');

  } catch (error) {
    console.error('❌ Failed to send email:', error);
    console.log('\nTroubleshooting:');
    console.log('1. Ensure contractextraction@gmail.com app password is correct');
    console.log('2. Check internet connectivity');
    console.log('3. Verify Gmail allows less secure apps or use app password');
  }
}

// Run the test
sendTestContract();