const nodemailer = require('nodemailer').default || require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendTest() {
  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: 'offersplus10@gmail.com',
      pass: 'vmrd kcxb wqlm ibyb'
    }
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const result = await transporter.sendMail({
    from: 'offersplus10@gmail.com',
    to: 'offers@searchnwa.com',
    subject: `Railway Test - ${timestamp}`,
    text: 'Testing Railway with ImageMagick fix',
    attachments: [{
      filename: 'test_contract2.pdf',
      content: fs.readFileSync(path.join(__dirname, 'test_contract2.pdf'))
    }]
  });
  
  console.log('✅ Sent to offers@searchnwa.com');
  console.log('Timestamp:', timestamp);
  console.log('Message ID:', result.messageId);
}

sendTest().catch(console.error);