import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function sendTestEmail() {
  // Get the most recent contract PDF
  const pdfsDir = path.join(__dirname, 'processed_contracts', 'pdfs');
  const files = fs.readdirSync(pdfsDir)
    .filter(f => f.endsWith('.pdf'))
    .sort((a, b) => {
      const statA = fs.statSync(path.join(pdfsDir, a));
      const statB = fs.statSync(path.join(pdfsDir, b));
      return statB.mtime.getTime() - statA.mtime.getTime();
    });
  
  if (files.length === 0) {
    console.error('No PDF contracts found');
    return;
  }
  
  const latestPdf = files[0];
  const pdfPath = path.join(pdfsDir, latestPdf);
  
  console.log(`📧 Sending test email with: ${latestPdf}`);
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'contractextraction@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD || 'kyvp kuxf oohm ixqt'
    }
  });
  
  const mailOptions = {
    from: '"Test Sender" <contractextraction@gmail.com>',
    to: 'offers@searchnwa.com',
    subject: 'Test PDF Generation - Should Create Real PDFs',
    text: 'Testing PDFKit PDF generation. This should create real PDFs that are openable.',
    html: '<p>Testing PDFKit PDF generation. This should create <b>real PDFs</b> that are openable.</p>',
    attachments: [
      {
        filename: latestPdf,
        path: pdfPath
      }
    ]
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   To:', mailOptions.to);
    console.log('   Attachment:', latestPdf);
    console.log('\n📧 The email monitor should process this and generate:');
    console.log('   - Real PDF net sheet (using PDFKit)');
    console.log('   - CSV file');
    console.log('   - Agent info sheet');
    console.log('   - All uploaded to Google Drive');
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
  }
}

sendTestEmail();