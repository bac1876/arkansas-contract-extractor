/**
 * Simple inbox check
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
import * as dotenv from 'dotenv';

dotenv.config();

const email = process.env.GMAIL_USER || 'contractextraction@gmail.com';
const password = process.env.GMAIL_PASSWORD || process.argv[2];

if (!password) {
  console.error('Please provide password');
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

imap.once('ready', () => {
  console.log('✅ Connected');
  
  imap.openBox('INBOX', false, (err: Error, box: any) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    
    console.log(`📬 Total messages: ${box.messages.total}`);
    
    // Get the last 2 messages
    const start = Math.max(1, box.messages.total - 1);
    const fetch = imap.seq.fetch(`${start}:${box.messages.total}`, {
      bodies: ''
    });
    
    let messageCount = 0;
    
    fetch.on('message', (msg: any, seqno: number) => {
      messageCount++;
      msg.on('body', (stream: any) => {
        simpleParser(stream, (err: Error, parsed: any) => {
          if (err) {
            console.error('Parse error:', err);
            return;
          }
          
          console.log(`\n📧 Message #${seqno}:`);
          console.log(`  From: ${parsed.from?.text}`);
          console.log(`  Subject: ${parsed.subject}`);
          console.log(`  Date: ${parsed.date}`);
          console.log(`  Message-ID: ${parsed.messageId}`);
          
          if (parsed.attachments && parsed.attachments.length > 0) {
            console.log(`  📎 Attachments:`);
            parsed.attachments.forEach((att: any) => {
              console.log(`    - ${att.filename} (${att.contentType})`);
            });
          } else {
            console.log(`  📭 No attachments`);
          }
          
          messageCount--;
          if (messageCount === 0) {
            console.log('\n✅ Done');
            imap.end();
          }
        });
      });
    });
  });
});

imap.once('error', (err: Error) => {
  console.error('IMAP Error:', err);
});

console.log('🔌 Connecting to Gmail...');
imap.connect();