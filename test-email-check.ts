/**
 * Test script to check all emails in the inbox
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
import * as dotenv from 'dotenv';

dotenv.config();

async function checkAllEmails() {
  const imap = new Imap({
    user: process.env.GMAIL_USER || 'contractextraction@gmail.com',
    password: process.env.GMAIL_PASSWORD || '',
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  });

  return new Promise((resolve, reject) => {
    imap.once('ready', () => {
      console.log('✅ Connected to Gmail');
      
      imap.openBox('INBOX', false, (err: Error, box: any) => {
        if (err) {
          console.error('Error opening inbox:', err);
          return;
        }

        console.log(`\n📬 Total messages in inbox: ${box.messages.total}`);
        
        // Get the last 5 messages
        const numToFetch = Math.min(5, box.messages.total);
        if (numToFetch === 0) {
          console.log('No messages in inbox');
          imap.end();
          return;
        }

        const start = Math.max(1, box.messages.total - numToFetch + 1);
        const fetchRange = `${start}:${box.messages.total}`;
        
        console.log(`\n📧 Fetching last ${numToFetch} messages (${fetchRange})...\n`);
        
        const fetch = imap.fetch(fetchRange, {
          bodies: '',
          struct: true
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

              const isUnread = msg.attributes && !msg.attributes.flags?.includes('\\Seen');
              const statusIcon = isUnread ? '🔵' : '⚪';
              
              console.log(`${statusIcon} Message #${seqno}:`);
              console.log(`   From: ${parsed.from?.text || 'Unknown'}`);
              console.log(`   Subject: ${parsed.subject || 'No Subject'}`);
              console.log(`   Date: ${parsed.date || 'Unknown date'}`);
              console.log(`   Read Status: ${isUnread ? 'UNREAD' : 'READ'}`);
              
              if (parsed.attachments && parsed.attachments.length > 0) {
                console.log(`   📎 Attachments:`);
                parsed.attachments.forEach((att: any) => {
                  console.log(`      - ${att.filename} (${att.contentType})`);
                });
              } else {
                console.log(`   📎 No attachments`);
              }
              console.log('');
            });
          });

          msg.once('attributes', (attrs: any) => {
            // Store attributes for use in body callback
            msg.attributes = attrs;
          });
        });

        fetch.once('end', () => {
          console.log(`✅ Checked ${messageCount} messages`);
          imap.end();
          resolve(true);
        });

        fetch.once('error', (err: Error) => {
          console.error('Fetch error:', err);
          imap.end();
          reject(err);
        });
      });
    });

    imap.once('error', (err: Error) => {
      console.error('IMAP Error:', err);
      reject(err);
    });

    console.log('📧 Connecting to contractextraction@gmail.com...');
    imap.connect();
  });
}

// Run the check
checkAllEmails()
  .then(() => {
    console.log('\n✅ Email check complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  });