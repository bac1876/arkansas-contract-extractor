/**
 * Send Test Email with Contract PDF
 * This script sends a test email to contractextraction@gmail.com
 * with a contract PDF attached to test the email monitoring system
 */

import * as nodemailer from 'nodemailer';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function sendTestEmail() {
  console.log('📧 Preparing to send test email...');
  
  // Check if 3418 Justice contract exists
  const contractPath = path.join(__dirname, 'Offer (EXE)-3418 Justice Dr.pdf');
  if (!fs.existsSync(contractPath)) {
    console.error('❌ Offer (EXE)-3418 Justice Dr.pdf not found!');
    console.log('Please ensure the contract exists in the project directory');
    return;
  }
  console.log('📎 Found: Offer (EXE)-3418 Justice Dr.pdf');
  
  // Create a test Gmail account transporter
  // Using a temporary test account for sending
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'contractextraction@gmail.com',
      pass: 'fetsszcvjpwstyfw' // App password
    }
  });
  
  // Prepare email
  const mailOptions = {
    from: 'contractextraction@gmail.com',
    to: 'offers@searchnwa.com',
    subject: `TEST-IMAGEMAGICK-FIX - 3418 Justice Dr - ${new Date().toISOString()}`,
    text: 'This is a test email with a contract PDF attached for processing.',
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Test Contract Submission</h2>
        <p>This email contains a test contract for the Arkansas Contract Agent system.</p>
        <p><strong>Property:</strong> 3418 Justice Dr</p>
        <p><strong>Type:</strong> EXE Contract</p>
        <p><strong>Testing:</strong> GPT-5 Extraction</p>
        <hr>
        <p style="color: #666;">Sent at: ${new Date().toLocaleString()}</p>
      </div>
    `,
    attachments: [
      {
        filename: 'Offer (EXE)-3418 Justice Dr.pdf',
        path: contractPath
      }
    ]
  };
  
  try {
    console.log('📤 Sending email to offers@searchnwa.com...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('\n📊 The email monitor should now:');
    console.log('   1. Detect the new email');
    console.log('   2. Download the PDF attachment');
    console.log('   3. Extract contract data');
    console.log('   4. Generate seller net sheet');
    console.log('   5. Upload to Google Drive');
    console.log('\n👀 Check the monitor console for processing status...');
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    if (error.message?.includes('Invalid login')) {
      console.log('\n⚠️  Authentication issue. The app password may need to be regenerated.');
      console.log('   Visit: https://myaccount.google.com/apppasswords');
    }
  }
}

// Run the test
sendTestEmail().catch(console.error);