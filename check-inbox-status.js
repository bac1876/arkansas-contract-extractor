const Imap = require('imap');
require('dotenv').config();

const email = process.env.EMAIL_USER || 'offers@searchnwa.com';
const password = process.env.EMAIL_PASSWORD || 'ggao mydb xnmt zpfz';

console.log('🔍 Checking inbox for:', email);

const imap = new Imap({
  user: email,
  password: password,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

function checkInbox() {
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
      
      // Check last 5 messages
      if (box.messages.total > 0) {
        const lastFive = Math.max(1, box.messages.total - 4);
        const fetch = imap.seq.fetch(`${lastFive}:*`, {
          bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
          markSeen: false
        });
        
        console.log('\n📋 Last 5 messages:');
        let msgCount = 0;
        
        fetch.on('message', (msg, seqno) => {
          let header = '';
          msg.on('body', (stream) => {
            stream.on('data', (chunk) => {
              header += chunk.toString('utf8');
            });
          });
          
          msg.once('end', () => {
            msgCount++;
            const lines = header.split('\r\n');
            const from = lines.find(l => l.startsWith('From:')) || 'From: Unknown';
            const subject = lines.find(l => l.startsWith('Subject:')) || 'Subject: No Subject';
            const date = lines.find(l => l.startsWith('Date:')) || 'Date: Unknown';
            
            console.log(`\n   Message ${msgCount}:`);
            console.log(`   ${from.substring(0, 50)}`);
            console.log(`   ${subject.substring(0, 50)}`);
            console.log(`   ${date.substring(0, 50)}`);
          });
        });
        
        fetch.once('end', () => {
          console.log('\n✅ Inbox check complete');
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
    console.log('👋 Disconnected from Gmail');
  });
  
  imap.connect();
}

checkInbox();