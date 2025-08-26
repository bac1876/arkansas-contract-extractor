const Imap = require('imap');
require('dotenv').config();

const imap = new Imap({
  user: process.env.GMAIL_USER,
  password: process.env.GMAIL_PASSWORD,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
  authTimeout: 10000
});

imap.once('ready', () => {
  imap.openBox('INBOX', true, (err: any, box: any) => {
    if (err) throw err;
    console.log('Total messages:', box.messages.total);
    
    // Check for UNSEEN messages
    imap.search(['UNSEEN'], (err: any, results: any) => {
      if (err) throw err;
      console.log('Unread messages:', results.length);
      
      // Check last 5 messages
      const f = imap.seq.fetch(Math.max(1, box.messages.total - 4) + ':*', {
        bodies: 'HEADER.FIELDS (FROM SUBJECT DATE)',
        struct: false
      });
      
      f.on('message', (msg: any, seqno: number) => {
        console.log('\nMessage #' + seqno);
        msg.on('body', (stream: any) => {
          let buffer = '';
          stream.on('data', (chunk: any) => { buffer += chunk.toString('utf8'); });
          stream.once('end', () => {
            const parsed = Imap.parseHeader(buffer);
            console.log('From:', parsed.from?.[0]);
            console.log('Subject:', parsed.subject?.[0]);
          });
        });
      });
      
      f.once('end', () => {
        console.log('\nDone');
        imap.end();
      });
    });
  });
});

imap.once('error', (err: any) => { console.log(err); });
imap.connect();