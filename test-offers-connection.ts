/**
 * Test connection to offers@searchnwa.com
 */

const Imap = require('imap');
import * as dotenv from 'dotenv';

dotenv.config();

console.log('🔐 Testing connection to offers@searchnwa.com...');
console.log('   User:', process.env.EMAIL_USER);
console.log('   Password:', process.env.EMAIL_PASSWORD?.replace(/./g, '*'));

const imap = new Imap({
  user: process.env.EMAIL_USER!,
  password: process.env.EMAIL_PASSWORD!,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

imap.once('ready', () => {
  console.log('✅ Successfully connected to offers@searchnwa.com!');
  
  imap.openBox('INBOX', true, (err, box) => {
    if (err) {
      console.error('❌ Error opening inbox:', err);
      imap.end();
      return;
    }
    
    console.log('📬 Inbox opened successfully');
    console.log('   Total messages:', box.messages.total);
    console.log('   Unread messages:', box.messages.new);
    console.log('   Recent messages:', box.recent);
    
    // Search for unread messages
    imap.search(['UNSEEN'], (err, results) => {
      if (err) {
        console.error('❌ Error searching:', err);
      } else {
        console.log('📨 Unread message UIDs:', results.length > 0 ? results : 'None');
      }
      
      imap.end();
    });
  });
});

imap.once('error', (err: Error) => {
  console.error('❌ Connection error:', err.message);
  if (err.message.includes('Invalid credentials')) {
    console.log('\n⚠️  Invalid credentials. Please check:');
    console.log('   1. The app password is correct (no spaces)');
    console.log('   2. 2-Step Verification is enabled for offers@searchnwa.com');
    console.log('   3. The app password was generated for offers@searchnwa.com');
  }
});

imap.once('end', () => {
  console.log('🔚 Connection closed');
});

console.log('📡 Connecting...');
imap.connect();