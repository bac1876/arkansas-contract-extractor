const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendRailwayTest() {
  console.log('🚀 Testing Railway Deployment - End to End');
  console.log('=' .repeat(50));
  
  // Use the account that worked yesterday
  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: 'contractextraction@gmail.com',
      pass: 'fetsszcvjpwstyfw' // App password that worked
    }
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  try {
    const result = await transporter.sendMail({
      from: 'contractextraction@gmail.com',
      to: 'offers@searchnwa.com', // CORRECT monitored address
      subject: `Railway ImageMagick Test - ${timestamp}`,
      text: 'Testing Railway deployment after ImageMagick fix. Should extract real data, not $0.00 values.',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Railway End-to-End Test</h2>
          <p><strong>Testing:</strong> ImageMagick Fix Deployed</p>
          <p><strong>Expected:</strong> Full extraction with real data</p>
          <p><strong>Contract:</strong> test_contract2.pdf</p>
          <p><strong>Property:</strong> 5806 W Walsh Lane Rogers, AR 72758</p>
          <p><strong>Purchase Price:</strong> $300,000 (CASH)</p>
          <hr>
          <p style="color: #666;">Timestamp: ${timestamp}</p>
        </div>
      `,
      attachments: [{
        filename: 'test_contract2.pdf',
        content: fs.readFileSync(path.join(__dirname, 'test_contract2.pdf'))
      }]
    });
    
    console.log('✅ Email sent successfully to offers@searchnwa.com!');
    console.log('📧 From: contractextraction@gmail.com');
    console.log('📬 To: offers@searchnwa.com (monitored by Railway)');
    console.log('🕐 Timestamp:', timestamp);
    console.log('📎 Attachment: test_contract2.pdf');
    console.log('💰 Expected extraction: $300,000 purchase price');
    console.log('\n⏰ Railway should process within 30-60 seconds');
    console.log('📁 Check: processed_contracts/results/ for new JSON');
    console.log('☁️ Check: Google Drive for uploaded files');
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

sendRailwayTest();