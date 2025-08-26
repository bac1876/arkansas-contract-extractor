/**
 * Mark all current emails as processed to skip the backlog
 */

const Imap = require('imap');
import * as fs from 'fs';

const imap = new Imap({
  user: 'contractextraction@gmail.com',
  password: 'fetsszcvjpwstyfw',
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

imap.once('ready', () => {
  console.log('📧 Connected to Gmail...');
  
  imap.openBox('INBOX', false, (err, box) => {
    if (err) throw err;
    
    console.log(`📬 Found ${box.messages.total} emails in inbox`);
    
    // Search for all emails
    imap.search(['ALL'], (err, results) => {
      if (err) throw err;
      
      if (!results || results.length === 0) {
        console.log('No emails found');
        imap.end();
        return;
      }
      
      console.log(`🔍 Processing ${results.length} emails to mark as processed...`);
      
      const processedEmails: string[] = [];
      let processed = 0;
      
      const f = imap.fetch(results, { 
        bodies: 'HEADER.FIELDS (MESSAGE-ID FROM SUBJECT)',
        struct: false 
      });
      
      f.on('message', (msg, seqno) => {
        let messageId = '';
        let subject = '';
        
        msg.on('body', (stream, info) => {
          let buffer = '';
          stream.on('data', chunk => buffer += chunk.toString('utf8'));
          stream.once('end', () => {
            // Extract message ID
            const idMatch = buffer.match(/Message-ID:\s*<([^>]+)>/i);
            if (idMatch) {
              messageId = `<${idMatch[1]}>`;
            }
            
            // Extract subject
            const subjectMatch = buffer.match(/Subject:\s*(.+)/i);
            if (subjectMatch) {
              subject = subjectMatch[1].trim();
            }
          });
        });
        
        msg.once('end', () => {
          if (messageId) {
            processedEmails.push(messageId);
            processed++;
            console.log(`  ✓ [${processed}/${results.length}] ${subject || 'No subject'}`);
          }
        });
      });
      
      f.once('end', () => {
        // Save all message IDs as processed
        const data = { processedEmails };
        fs.writeFileSync('processed_emails.json', JSON.stringify(data, null, 2));
        
        console.log(`\n✅ Marked ${processedEmails.length} emails as processed`);
        console.log('📝 Updated processed_emails.json');
        console.log('\n🎯 System will now only process NEW emails going forward!');
        
        imap.end();
      });
    });
  });
});

imap.once('error', (err: any) => {
  console.error('IMAP Error:', err);
});

imap.once('end', () => {
  console.log('📭 Connection closed');
  process.exit(0);
});

console.log('🔄 Marking all current emails as processed...');
imap.connect();