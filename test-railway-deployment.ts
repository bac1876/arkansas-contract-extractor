/**
 * Test Railway Deployment with ImageMagick Fix
 * Sends test email to offers@searchnwa.com to verify end-to-end processing
 */

const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

async function sendTestEmailToRailway() {
  console.log('🚀 Testing Railway Deployment with ImageMagick Fix');
  console.log('=' .repeat(50));
  
  // Check if test contract exists
  const contractPath = path.join(__dirname, 'test_contract2.pdf');
  if (!fs.existsSync(contractPath)) {
    console.error('❌ test_contract2.pdf not found!');
    return;
  }
  console.log('✅ Found test_contract2.pdf');
  
  // Create transporter with offersplus10 account
  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: 'offersplus10@gmail.com',
      pass: 'vmrd kcxb wqlm ibyb' // App password
    }
  });
  
  // Create unique timestamp for tracking
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const subject = `Railway Test - ImageMagick Fix - ${timestamp}`;
  
  // Prepare email
  const mailOptions = {
    from: 'offersplus10@gmail.com',
    to: 'offers@searchnwa.com', // CORRECT ADDRESS!
    subject: subject,
    text: 'Testing Railway deployment with ImageMagick fix. This should extract actual data, not empty $0.00 values.',
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Railway Deployment Test</h2>
        <p><strong>Testing:</strong> ImageMagick Fix</p>
        <p><strong>Expected:</strong> Full data extraction (not $0.00 values)</p>
        <p><strong>Contract:</strong> test_contract2.pdf</p>
        <p><strong>Property:</strong> 5806 W Walsh Lane Rogers, AR 72758</p>
        <p><strong>Buyers:</strong> Brian Curtis, Lisa Brown</p>
        <p><strong>Price:</strong> $300,000 (CASH)</p>
        <hr>
        <p style="color: #666;">Timestamp: ${timestamp}</p>
      </div>
    `,
    attachments: [
      {
        filename: 'test_contract2.pdf',
        path: contractPath
      }
    ]
  };
  
  try {
    console.log('\n📤 Sending test email to offers@searchnwa.com...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('   Subject:', subject);
    console.log('   Message ID:', info.messageId);
    console.log('   Timestamp:', timestamp);
    
    console.log('\n📊 Railway should now:');
    console.log('   1. Detect email within 30 seconds');
    console.log('   2. Download PDF attachment');
    console.log('   3. Convert PDF to PNG using ImageMagick');
    console.log('   4. Extract data with GPT-4 Vision');
    console.log('   5. Generate seller net sheet');
    console.log('   6. Upload to Google Drive');
    console.log('   7. Update Google Sheets tracking');
    
    console.log('\n⏰ Wait 2-3 minutes then check:');
    console.log('   - Railway logs for processing');
    console.log('   - Google Drive for uploaded files');
    console.log('   - Extracted data for actual values (not $0.00)');
    
    return timestamp;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

// Run the test
sendTestEmailToRailway()
  .then(timestamp => {
    if (timestamp) {
      console.log('\n✅ Test email sent with tracking ID:', timestamp);
    }
  })
  .catch(console.error);