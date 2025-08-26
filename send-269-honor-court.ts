/**
 * Send 269 Honor Court contract for testing GPT-5 extraction
 */

import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function sendHonorCourtContract() {
  console.log('📧 Sending 269 Honor Court contract for GPT-5 testing...\n');
  
  // Create transporter
  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD
    }
  });
  
  // Check if contract exists
  const contractPath = path.join(__dirname, 'Offer (BBS)-269 Honor Court.pdf');
  if (!fs.existsSync(contractPath)) {
    console.error('❌ Contract not found:', contractPath);
    process.exit(1);
  }
  
  console.log('📎 Found contract: Offer (BBS)-269 Honor Court.pdf');
  
  // Prepare email
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_USER,
    subject: `New Contract - 269 Honor Court - ${new Date().toLocaleString()}`,
    text: 'Testing GPT-5 extraction with 269 Honor Court contract.',
    attachments: [
      {
        filename: 'Offer (BBS)-269 Honor Court.pdf',
        path: contractPath
      }
    ]
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('📬 Message ID:', info.messageId);
    console.log('\n🤖 GPT-5 Extraction should now:');
    console.log('   1. Process with GPT-5 API (83% cheaper)');
    console.log('   2. Extract all contract fields');
    console.log('   3. Generate seller net sheet');
    console.log('   4. Upload to Google Drive & Sheets');
    console.log('\n💰 Cost: ~$0.04 instead of $0.14');
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    process.exit(1);
  }
}

sendHonorCourtContract();