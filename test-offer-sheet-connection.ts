/**
 * Test Email Connection for Offer Sheet App
 * Verifies IMAP connection and email sending capabilities
 */

import * as dotenv from 'dotenv';
dotenv.config();

const Imap = require('imap');
import * as nodemailer from 'nodemailer';

async function testConnection() {
  console.log('🔧 Testing Offer Sheet App Email Configuration...\n');
  
  // Check environment variables
  const email = process.env.OFFER_SHEET_EMAIL;
  const password = process.env.OFFER_SHEET_PASSWORD;
  
  if (!email || !password || password === 'your_app_password_here') {
    console.error('❌ Please update your .env file with the actual app password!');
    console.log('\nEdit .env and replace "your_app_password_here" with your 16-character app password (no spaces)');
    return;
  }
  
  console.log('📧 Email:', email);
  console.log('🔑 Password:', password.substring(0, 4) + '****' + password.substring(password.length - 4));
  
  // Test IMAP Connection
  console.log('\n📥 Testing IMAP Connection...');
  
  const imap = new Imap({
    user: email,
    password: password,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  });
  
  return new Promise((resolve) => {
    imap.once('ready', () => {
      console.log('✅ IMAP connection successful!');
      
      // Check inbox
      imap.openBox('INBOX', true, (err: any, box: any) => {
        if (err) {
          console.error('❌ Error opening inbox:', err);
        } else {
          console.log(`📬 Inbox has ${box.messages.total} total messages`);
          console.log(`📨 ${box.messages.new} new messages`);
        }
        
        imap.end();
      });
    });
    
    imap.once('error', (err: any) => {
      console.error('❌ IMAP connection error:', err.message);
      console.log('\nPossible issues:');
      console.log('1. Check that IMAP is enabled in Gmail settings');
      console.log('2. Verify the app password is correct (16 characters, no spaces)');
      console.log('3. Make sure 2-factor authentication is enabled');
      resolve(false);
    });
    
    imap.once('end', () => {
      console.log('\n📤 Testing SMTP (sending) connection...');
      testSMTP().then(resolve);
    });
    
    console.log('🔄 Connecting to Gmail IMAP...');
    imap.connect();
  });
}

async function testSMTP() {
  const email = process.env.OFFER_SHEET_EMAIL!;
  const password = process.env.OFFER_SHEET_PASSWORD!;
  
  // Create transporter using Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: email,
      pass: password
    }
  });
  
  try {
    // Verify SMTP connection
    await transporter.verify();
    console.log('✅ SMTP connection successful! Can send emails.');
    
    // Optional: Send a test email to yourself
    console.log('\n📧 Would you like to send a test email? (Uncomment the code below)');
    
    /*
    const info = await transporter.sendMail({
      from: `"Offer Sheet Test" <${email}>`,
      to: email, // Send to self
      subject: 'Test Email - Offer Sheet App',
      text: 'This is a test email from the Offer Sheet App.',
      html: '<b>This is a test email from the Offer Sheet App.</b>'
    });
    
    console.log('✅ Test email sent! Message ID:', info.messageId);
    */
    
    return true;
  } catch (error) {
    console.error('❌ SMTP connection error:', error);
    return false;
  }
}

// Run the test
console.log('='.repeat(50));
console.log('  Offer Sheet App - Email Connection Test');
console.log('='.repeat(50));

testConnection().then((success) => {
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('✅ All email connections working!');
    console.log('\nNext step: Run "npm run test-offer-sheet" to test extraction');
  } else {
    console.log('⚠️ Please fix the connection issues above');
  }
  console.log('='.repeat(50));
}).catch(console.error);