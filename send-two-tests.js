const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function sendTwoTestContracts() {
  console.log('📧 Sending two test contracts...');
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'contractextraction@gmail.com',
      pass: process.env.GMAIL_PASSWORD || 'fetsszcvjpwstyfw'
    }
  });
  
  // First email - 890 Clark
  const contract1Path = path.join(__dirname, 'Test Contracts', '890 Clark.pdf');
  const timestamp1 = new Date().toISOString();
  
  try {
    await transporter.sendMail({
      from: '"Test Sender" <contractextraction@gmail.com>',
      to: 'offers@searchnwa.com',
      subject: `Test 1 - 890 Clark - ${timestamp1}`,
      text: 'First test email',
      attachments: [{
        filename: '890 Clark.pdf',
        path: contract1Path
      }]
    });
    console.log('✅ First email sent (890 Clark)');
    
    // Wait 10 seconds then send second email
    console.log('⏳ Waiting 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Second email - 475 Cato  
    const contract2Path = path.join(__dirname, 'Test Contracts', '475 Cato.pdf');
    const timestamp2 = new Date().toISOString();
    
    if (!fs.existsSync(contract2Path)) {
      // Use 890 Clark again but with different subject
      await transporter.sendMail({
        from: '"Test Sender" <contractextraction@gmail.com>',
        to: 'offers@searchnwa.com',
        subject: `Test 2 - 475 Cato - ${timestamp2}`,
        text: 'Second test email (simulating 475 Cato)',
        attachments: [{
          filename: '475 Cato.pdf',
          path: contract1Path // Using 890 Clark PDF but renamed
        }]
      });
    } else {
      await transporter.sendMail({
        from: '"Test Sender" <contractextraction@gmail.com>',
        to: 'offers@searchnwa.com',
        subject: `Test 2 - 475 Cato - ${timestamp2}`,
        text: 'Second test email',
        attachments: [{
          filename: '475 Cato.pdf',
          path: contract2Path
        }]
      });
    }
    
    console.log('✅ Second email sent (475 Cato)');
    console.log('\n📋 Both emails sent!');
    console.log('   The monitor should:');
    console.log('   1. Process the first email');
    console.log('   2. Check again after finishing');
    console.log('   3. Find and process the second email');
    
  } catch (error) {
    console.error('❌ Failed to send emails:', error.message);
  }
}

// Run the test
console.log('🚀 Starting two-email test...');
sendTwoTestContracts().catch(console.error);