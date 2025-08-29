/**
 * Mark all emails in inbox as read to start fresh
 */

const Imap = require('imap');
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const email = process.env.GMAIL_USER || 'contractextraction@gmail.com';
const password = process.env.GMAIL_PASSWORD;

if (!password) {
  console.error('❌ Email password not found in environment variables');
  process.exit(1);
}

const imap = new Imap({
  user: email,
  password: password,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

console.log('🔐 Connecting to Gmail...');

imap.once('ready', () => {
  console.log('✅ Connected to Gmail');
  
  imap.openBox('INBOX', false, (err: Error, box: any) => {
    if (err) {
      console.error('❌ Error opening inbox:', err);
      imap.end();
      return;
    }
    
    console.log(`📬 Inbox has ${box.messages.total} messages`);
    
    // Search for ALL unread emails
    imap.search(['UNSEEN'], (err: Error, uids: number[]) => {
      if (err) {
        console.error('❌ Error searching:', err);
        imap.end();
        return;
      }
      
      if (uids.length === 0) {
        console.log('✅ No unread emails found - inbox is clean!');
        imap.end();
        return;
      }
      
      console.log(`📧 Found ${uids.length} unread emails`);
      console.log('🔄 Marking all as read...');
      
      // Mark all unread emails as read
      imap.addFlags(uids, '\\Seen', (err: Error) => {
        if (err) {
          console.error('❌ Error marking emails as read:', err);
        } else {
          console.log(`✅ Successfully marked ${uids.length} emails as read`);
          console.log('📧 Inbox is now clean - ready for new contracts only!');
        }
        imap.end();
      });
    });
  });
});

imap.once('error', (err: Error) => {
  console.error('❌ IMAP Error:', err);
});

imap.once('end', () => {
  console.log('📧 Connection closed');
});

console.log('🔐 Attempting to connect...');
imap.connect();