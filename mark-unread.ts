const Imap = require('imap');
import * as dotenv from 'dotenv';

dotenv.config();

const imap = new Imap({
  user: process.env.EMAIL_USER!,
  password: process.env.EMAIL_PASSWORD!,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
  authTimeout: 30000
});

imap.once('ready', () => {
  console.log('Connected to Gmail');
  
  imap.openBox('INBOX', false, (err, box) => {
    if (err) throw err;
    
    console.log('Inbox opened, total messages:', box.messages.total);
    
    // Get the UID of the most recent message
    const f = imap.seq.fetch(box.messages.total, {
      bodies: 'HEADER.FIELDS (FROM SUBJECT DATE)',
      struct: true
    });
    
    f.on('message', (msg, seqno) => {
      console.log('Processing message #%d', seqno);
      
      msg.on('body', (stream, info) => {
        let buffer = '';
        stream.on('data', (chunk) => {
          buffer += chunk.toString('utf8');
        });
        stream.once('end', () => {
          const header = Imap.parseHeader(buffer);
          console.log('Subject:', header.subject?.[0]);
          console.log('From:', header.from?.[0]);
          console.log('Date:', header.date?.[0]);
        });
      });
      
      msg.once('attributes', (attrs) => {
        console.log('UID:', attrs.uid);
        console.log('Flags:', attrs.flags);
        
        // Remove the \Seen flag to mark as unread
        imap.delFlags(attrs.uid, '\\Seen', (err) => {
          if (err) {
            console.error('Error marking as unread:', err);
          } else {
            console.log('✅ Successfully marked UID', attrs.uid, 'as unread');
          }
          imap.end();
        });
      });
    });
    
    f.once('error', (err) => {
      console.log('Fetch error: ' + err);
    });
    
    f.once('end', () => {
      console.log('Done fetching');
    });
  });
});

imap.once('error', (err: Error) => {
  console.log('IMAP error:', err);
});

imap.once('end', () => {
  console.log('Connection ended');
});

console.log('Connecting to Gmail...');
imap.connect();