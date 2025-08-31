import Imap from 'imap';

const config = {
  user: 'offers@searchnwa.com',
  password: 'ggao mydb xnmt zpfz',
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
};

const imap = new Imap(config);

imap.once('ready', () => {
  imap.openBox('INBOX', false, (err, box) => {
    if (err) throw err;
    
    // Search for all messages
    imap.search(['ALL'], (err, results) => {
      if (err) throw err;
      
      if (!results || results.length === 0) {
        console.log('No messages found');
        imap.end();
        return;
      }
      
      const lastUID = results[results.length - 1];
      console.log(`\nChecking last message (UID: ${lastUID}):\n`);
      
      const f = imap.fetch([lastUID], { 
        bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
        struct: true,
        markSeen: false
      });
      
      f.on('message', (msg, seqno) => {
        let headers = '';
        msg.on('body', (stream) => {
          stream.on('data', (chunk) => {
            headers += chunk.toString('utf8');
          });
        });
        
        msg.once('attributes', (attrs) => {
          console.log('Message flags:', attrs.flags);
          console.log('Is marked as Seen?', attrs.flags.includes('\\Seen'));
          
          if (attrs.flags.includes('\\Seen')) {
            console.log('✅ Message IS marked as read (which is why Railway skipped it)');
          } else {
            console.log('❌ Message is UNREAD (Railway should have processed it)');
          }
        });
        
        msg.once('end', () => {
          console.log('\nMessage details:');
          console.log(headers);
        });
      });
      
      f.once('end', () => {
        imap.end();
      });
    });
  });
});

imap.once('error', (err: any) => {
  console.error('IMAP error:', err);
});

imap.connect();