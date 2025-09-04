/**
 * Send Test Email to Offer Sheet Service
 * Sends an email with the 890 Clark PDF to contractextraction@gmail.com
 */

import * as nodemailer from 'nodemailer';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';

dotenv.config();

async function sendTestEmail() {
  console.log('📧 Preparing test email for Offer Sheet service...');
  
  // Create transporter using Gmail
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.OFFER_SHEET_EMAIL || 'contractextraction@gmail.com',
      pass: process.env.OFFER_SHEET_PASSWORD
    }
  });
  
  // Check for test contract
  const pdfPath = 'test_contract2.pdf';
  try {
    const pdfBuffer = await fs.readFile(pdfPath);
    console.log(`✅ Found test PDF: ${pdfPath}`);
    
    // Send email to self (contractextraction@gmail.com)
    const mailOptions = {
      from: 'contractextraction@gmail.com',
      to: 'contractextraction@gmail.com',
      subject: 'Test Contract for Offer Sheet Extraction',
      text: 'This is a test email with a contract PDF for offer sheet extraction.',
      attachments: [
        {
          filename: '890_Clark_Test.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };
    
    console.log('📤 Sending test email to contractextraction@gmail.com...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('\n📋 Next steps:');
    console.log('1. The Railway service should pick up this email in the next 5 minutes');
    console.log('2. It will extract the offer sheet data');
    console.log('3. It will send back a formatted response');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

sendTestEmail().catch(console.error);