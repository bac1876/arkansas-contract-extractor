const Imap = require('imap');
require('dotenv').config();

const email = process.env.EMAIL_USER || 'offers@searchnwa.com';
const password = process.env.EMAIL_PASSWORD || 'ggao mydb xnmt zpfz';

console.log('🔍 Checking ALL emails in inbox...');

const imap = new Imap({
  user: email,
  password: password,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

imap.once('ready', () => {
  console.log('✅ Connected to Gmail');
  
  imap.openBox('INBOX', false, (err, box) => {
    if (err) {
      console.error('❌ Error opening inbox:', err);
      imap.end();
      return;
    }
    
    console.log('📧 Inbox status:');
    console.log('   Total messages:', box.messages.total);
    console.log('   Unread messages:', box.messages.unseen || 0);
    
    // Get ALL messages
    if (box.messages.total > 0) {
      const fetch = imap.seq.fetch('1:*', {
        bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
        markSeen: false,
        struct: true
      });
      
      console.log('\n📋 ALL messages:');
      let msgCount = 0;
      
      fetch.on('message', (msg, seqno) => {
        let header = '';
        let flags = [];
        
        msg.on('body', (stream) => {
          stream.on('data', (chunk) => {
            header += chunk.toString('utf8');
          });
        });
        
        msg.once('attributes', (attrs) => {
          flags = attrs.flags;
        });
        
        msg.once('end', () => {
          msgCount++;
          const lines = header.split('\r\n');
          const from = lines.find(l => l.startsWith('From:')) || 'From: Unknown';
          const subject = lines.find(l => l.startsWith('Subject:')) || 'Subject: No Subject';
          const date = lines.find(l => l.startsWith('Date:')) || 'Date: Unknown';
          
          const isRead = flags.includes('\\Seen');
          const status = isRead ? '📖' : '📬';
          
          console.log(`\n   Message ${msgCount}: ${status}`);
          console.log(`   ${from.substring(0, 60)}`);
          console.log(`   ${subject.substring(0, 60)}`);
          console.log(`   ${date.substring(0, 50)}`);
        });
      });
      
      fetch.once('end', () => {
        console.log('\n✅ Found', msgCount, 'total messages');
        imap.end();
      });
    } else {
      console.log('📭 Inbox is empty');
      imap.end();
    }
  });
});

imap.once('error', (err) => {
  console.error('❌ IMAP Error:', err.message);
});

imap.once('end', () => {
  console.log('👋 Disconnected');
});

imap.connect();