const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function sendTestContract() {
  console.log('📧 Sending test contract to offers@searchnwa.com...');
  
  // Use a Gmail account to send (you can use any Gmail account)
  // For testing, you could use the contractextraction@gmail.com from .env
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'contractextraction@gmail.com',
      pass: process.env.GMAIL_PASSWORD || 'fetsszcvjpwstyfw' // App password from .env
    }
  });
  
  // Select a test contract
  const contractPath = path.join(__dirname, 'Test Contracts', '890 Clark.pdf');
  
  if (!fs.existsSync(contractPath)) {
    console.error('❌ Test contract not found:', contractPath);
    console.log('Available contracts:');
    const testDir = path.join(__dirname, 'Test Contracts');
    if (fs.existsSync(testDir)) {
      fs.readdirSync(testDir).forEach(file => {
        console.log('  -', file);
      });
    }
    return;
  }
  
  const timestamp = new Date().toISOString();
  
  try {
    // Send email with contract attachment
    const info = await transporter.sendMail({
      from: '"Test Sender" <contractextraction@gmail.com>',
      to: 'offers@searchnwa.com',
      subject: `Test Contract - 890 Clark - ${timestamp}`,
      text: 'Testing Railway deployment with contract attachment. This is an automated test.',
      html: `
        <p>Testing Railway deployment with contract attachment.</p>
        <p>Timestamp: ${timestamp}</p>
        <p>This is an automated test to verify the email processing system.</p>
      `,
      attachments: [
        {
          filename: '890 Clark.pdf',
          path: contractPath
        }
      ]
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('   To: offers@searchnwa.com');
    console.log('   Subject:', `Test Contract - 890 Clark - ${timestamp}`);
    console.log('   Attachment: 890 Clark.pdf');
    console.log('\n📋 Now check:');
    console.log('   1. Email should arrive at offers@searchnwa.com within 30 seconds');
    console.log('   2. Railway logs should show processing activity');
    console.log('   3. Google Sheets should get new entry within 60-80 seconds');
    console.log('   4. Email should be marked as read after processing');
    
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   - Check GMAIL_USER and GMAIL_PASSWORD in .env');
    console.log('   - Make sure it\'s an app password, not regular password');
    console.log('   - Enable "Less secure app access" if needed');
  }
}

// Run the test
console.log('🚀 Starting email test...');
sendTestContract().catch(console.error);