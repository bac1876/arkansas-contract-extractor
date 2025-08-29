/**
 * Quick script to check email queue status
 */

const Imap = require('imap');
import * as dotenv from 'dotenv';

dotenv.config();

async function checkQueue() {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASSWORD,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000,
      connTimeout: 10000
    });

    imap.once('ready', function() {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          console.error('Error opening inbox:', err);
          imap.end();
          reject(err);
          return;
        }
        
        const totalCount = box.messages.total;
        
        // Search for unread messages
        imap.search(['UNSEEN'], (err, results) => {
          if (err) {
            console.error('Error searching:', err);
            imap.end();
            reject(err);
            return;
          }
          
          const unreadCount = results.length;
          
          console.log('\n📧 CONTRACT QUEUE STATUS');
          console.log('=' + '='.repeat(50));
          console.log(`📮 Email: contractextraction@gmail.com`);
          console.log(`📬 Total messages in inbox: ${totalCount}`);
          console.log(`📨 Unread messages: ${unreadCount}`);
          console.log('');
          
          if (unreadCount === 0) {
            console.log('✅ QUEUE IS CLEAR!');
            console.log('   All contracts have been processed.');
            console.log('   No pending emails waiting for extraction.');
          } else {
            console.log(`⚠️  ${unreadCount} CONTRACT(S) IN QUEUE`);
            console.log('   These emails are waiting to be processed.');
            console.log('   Run "npm run monitor-emails" to process them.');
            
            // Get details of unread messages
            if (results.length > 0) {
              const f = imap.fetch(results.slice(0, 3), { // Show first 3
                bodies: 'HEADER.FIELDS (FROM SUBJECT DATE)',
                struct: true
              });
              
              console.log('\n   First few unread emails:');
              
              f.on('message', (msg, seqno) => {
                msg.on('body', (stream, info) => {
                  let buffer = '';
                  stream.on('data', chunk => buffer += chunk.toString('utf8'));
                  stream.once('end', () => {
                    const header = Imap.parseHeader(buffer);
                    console.log(`   - From: ${header.from?.[0] || 'Unknown'}`);
                    console.log(`     Subject: ${header.subject?.[0] || 'No subject'}`);
                  });
                });
              });
              
              f.once('end', () => {
                imap.end();
                resolve(unreadCount);
              });
            } else {
              imap.end();
              resolve(unreadCount);
            }
          }
          
          if (results.length === 0) {
            console.log('=' + '='.repeat(50));
            imap.end();
            resolve(unreadCount);
          }
        });
      });
    });

    imap.once('error', function(err) {
      console.log('❌ Connection error:', err.message);
      reject(err);
    });

    imap.connect();
  });
}

checkQueue()
  .then(count => {
    console.log(`\n✓ Check complete. Queue has ${count} unread message(s).`);
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Failed to check queue:', err.message);
    process.exit(1);
  });