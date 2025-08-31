const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendTestEmail() {
  console.log('🚀 Starting end-user test email send...');
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'offers@searchnwa.com',
      pass: 'ggao mydb xnmt zpfz'
    }
  });

  const pdfPath = path.join(__dirname, 'Test Contracts', 'test_contract.pdf');
  
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ PDF not found at:', pdfPath);
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const mailOptions = {
    from: 'offers@searchnwa.com',
    to: 'offers@searchnwa.com',
    subject: `New Contract Submission - ${timestamp}`,
    text: 'Hi, I have a new contract that needs processing. Please find the attached PDF for 890 Clark Street. Thanks!',
    html: '<p>Hi,</p><p>I have a new contract that needs processing. Please find the attached PDF for 890 Clark Street.</p><p>Thanks!</p>',
    attachments: [{
      filename: 'Purchase_Contract.pdf',
      path: pdfPath
    }]
  };

  try {
    console.log('📧 Sending to: offers@searchnwa.com');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('📬 Message ID:', info.messageId);
    console.log('⏰ Railway should process this within 30 seconds...');
    console.log('\n🔍 Monitor at: https://railway.app/dashboard');
  } catch (error) {
    console.error('❌ Failed to send:', error.message);
  }
}

sendTestEmail();