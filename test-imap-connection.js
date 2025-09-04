require('dotenv').config();
const Imap = require('imap');

console.log('Testing IMAP connection to contractextraction@gmail.com...\n');

// Use the offer sheet credentials
const imap = new Imap({
  user: process.env.OFFER_SHEET_EMAIL || 'contractextraction@gmail.com',
  password: process.env.OFFER_SHEET_PASSWORD,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
  authTimeout: 10000
});

console.log('Credentials:');
console.log('- Email:', process.env.OFFER_SHEET_EMAIL || 'contractextraction@gmail.com');
console.log('- Password:', process.env.OFFER_SHEET_PASSWORD ? '***SET***' : 'NOT SET');
console.log('');

imap.once('ready', () => {
  console.log('✅ Connected to IMAP successfully!');
  
  imap.openBox('INBOX', true, (err, box) => {
    if (err) {
      console.error('❌ Error opening inbox:', err);
      imap.end();
      return;
    }
    
    console.log('✅ Inbox opened successfully');
    console.log('📊 Total messages:', box.messages.total);
    
    // Search for unread messages
    imap.search(['UNSEEN'], (err, results) => {
      if (err) {
        console.error('❌ Search error:', err);
      } else {
        console.log('📨 Unread messages:', results.length);
        if (results.length > 0) {
          console.log('   UIDs:', results.join(', '));
        }
      }
      
      imap.end();
    });
  });
});

imap.once('error', (err) => {
  console.error('❌ Connection error:', err);
  console.log('\nPossible issues:');
  console.log('1. Check that IMAP is enabled in Gmail settings');
  console.log('2. Verify the app-specific password is correct');
  console.log('3. Make sure 2-factor authentication is enabled');
});

imap.once('end', () => {
  console.log('\n👋 Connection closed');
});

console.log('🔄 Attempting to connect...');
imap.connect();