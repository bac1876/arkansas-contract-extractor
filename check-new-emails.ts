/**
 * Quick check for new emails
 */

const Imap = require('imap');
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
    
    console.log(`📬 Total messages in inbox: ${box.messages.total}`);
    
    // Get the last 5 messages
    const fetch = imap.seq.fetch(`${Math.max(1, box.messages.total - 4)}:${box.messages.total}`, {
      bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
      struct: true
    });
    
    fetch.on('message', (msg: any, seqno: number) => {
      console.log(`\n📧 Message #${seqno}:`);
      msg.on('body', (stream: any, info: any) => {
        let buffer = '';
        stream.on('data', (chunk: any) => {
          buffer += chunk.toString('utf8');
        });
        stream.once('end', () => {
          const parsed = Imap.parseHeader(buffer);
          console.log(`  From: ${parsed.from?.[0]}`);
          console.log(`  Subject: ${parsed.subject?.[0]}`);
          console.log(`  Date: ${parsed.date?.[0]}`);
        });
      });
      
      msg.once('attributes', (attrs: any) => {
        const parts = imap.utils.parseStructure(attrs.struct);
        const attachments = parts.filter((part: any) => {
          return part.disposition && part.disposition.type.toUpperCase() === 'ATTACHMENT';
        });
        
        if (attachments.length > 0) {
          console.log(`  📎 Attachments: ${attachments.map((a: any) => a.disposition.params?.filename).join(', ')}`);
        }
      });
    });
    
    fetch.once('end', () => {
      console.log('\n✅ Done checking emails');
      imap.end();
    });
  });
});

imap.once('error', (err: Error) => {
  console.error('IMAP Error:', err);
});

console.log('🔌 Connecting to Gmail...');
imap.connect();