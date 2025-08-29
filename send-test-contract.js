const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendTestContract() {
  // Create test account using Ethereal Email (instant, no signup)
  const testAccount = await nodemailer.createTestAccount();
  
  console.log('📧 Test email account created:');
  console.log('   Email:', testAccount.user);
  console.log('   Pass:', testAccount.pass);
  
  // Create transporter
  const transporter = nodemailer.createTransporter({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
  
  // Select a test contract
  const contractPath = path.join(__dirname, 'Test Contracts', '890 Clark.pdf');
  
  if (!fs.existsSync(contractPath)) {
    console.error('❌ Test contract not found:', contractPath);
    return;
  }
  
  // Send email with contract attachment
  const info = await transporter.sendMail({
    from: `"Test User" <${testAccount.user}>`,
    to: 'offers@searchnwa.com',
    subject: 'Test Contract - 890 Clark',
    text: 'Testing Railway deployment with contract attachment',
    html: '<p>Testing Railway deployment with contract attachment</p>',
    attachments: [
      {
        filename: '890 Clark.pdf',
        path: contractPath
      }
    ]
  });
  
  console.log('✅ Test email sent!');
  console.log('   Message ID:', info.messageId);
  console.log('   Preview URL:', nodemailer.getTestMessageUrl(info));
  console.log('\n📋 Next steps:');
  console.log('   1. Check if email arrives at offers@searchnwa.com');
  console.log('   2. Monitor Railway logs for processing');
  console.log('   3. Check Google Sheets for new entry');
}

// Run the test
sendTestContract().catch(console.error);