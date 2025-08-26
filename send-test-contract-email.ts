/**
 * Send a test email with contract attachment to trigger the pipeline
 */

import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function sendTestEmail() {
  console.log('📧 Sending test contract email...\n');
  
  // Create transporter
  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD
    }
  });
  
  // Check if test contract exists
  const contractPath = path.join(__dirname, 'test_contract2.pdf');
  if (!fs.existsSync(contractPath)) {
    console.error('❌ Test contract not found:', contractPath);
    process.exit(1);
  }
  
  // Prepare email
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_USER, // Send to self
    subject: `Test Contract - ${new Date().toLocaleString()}`,
    text: 'This is a test email with a contract attachment for processing.',
    attachments: [
      {
        filename: 'test_contract2.pdf',
        path: contractPath
      }
    ]
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('📬 Message ID:', info.messageId);
    console.log('\n📊 The email monitor should now:');
    console.log('   1. Detect the new email');
    console.log('   2. Extract contract data');
    console.log('   3. Update Google Sheets');
    console.log('   4. Generate seller net sheet');
    console.log('\nCheck the monitor output for processing status.');
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    process.exit(1);
  }
}

sendTestEmail();