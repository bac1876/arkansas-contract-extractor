require('dotenv').config();
const Imap = require('imap');
const { simpleParser } = require('mailparser');

console.log('Checking email UID 91...\n');

const imap = new Imap({
  user: process.env.OFFER_SHEET_EMAIL || 'contractextraction@gmail.com',
  password: process.env.OFFER_SHEET_PASSWORD,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

imap.once('ready', () => {
  imap.openBox('INBOX', true, (err, box) => {
    if (err) {
      console.error('Error opening inbox:', err);
      imap.end();
      return;
    }
    
    const fetch = imap.fetch(91, {
      bodies: '',
      struct: true
    });
    
    fetch.on('message', (msg) => {
      msg.on('body', (stream) => {
        simpleParser(stream, (err, parsed) => {
          if (err) {
            console.error('Parse error:', err);
            return;
          }
          
          console.log('📧 Email Details:');
          console.log('From:', parsed.from?.text);
          console.log('Subject:', parsed.subject);
          console.log('Date:', parsed.date);
          console.log('Attachments:', parsed.attachments?.length || 0);
          
          if (parsed.attachments && parsed.attachments.length > 0) {
            console.log('\n📎 Attachments:');
            parsed.attachments.forEach(att => {
              console.log(`  - ${att.filename} (${att.contentType})`);
            });
          }
          
          imap.end();
        });
      });
    });
    
    fetch.once('error', (err) => {
      console.error('Fetch error:', err);
      imap.end();
    });
  });
});

imap.once('error', (err) => {
  console.error('Connection error:', err);
});

imap.connect();