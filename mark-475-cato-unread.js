const Imap = require('imap');
require('dotenv').config();

const email = process.env.EMAIL_USER || 'offers@searchnwa.com';
const password = process.env.EMAIL_PASSWORD || 'ggao mydb xnmt zpfz';

console.log('🔍 Marking 475 Cato email as unread...');

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
    
    // Search for Brian Curtis email
    imap.search(['ALL', ['FROM', 'brian@searchnwa.com']], (err, results) => {
      if (err) {
        console.error('❌ Search error:', err);
        imap.end();
        return;
      }
      
      if (results.length === 0) {
        console.log('❌ No email from Brian found');
        imap.end();
        return;
      }
      
      console.log(`📧 Found ${results.length} email(s) from Brian Curtis`);
      
      // Mark the latest one as unread
      const latest = results[results.length - 1];
      imap.delFlags(latest, 'Seen', (err) => {
        if (err) {
          console.error('❌ Error marking unread:', err);
        } else {
          console.log('✅ 475 Cato email marked as UNREAD');
          console.log('   Should now be processed');
        }
        imap.end();
      });
    });
  });
});

imap.once('error', (err) => {
  console.error('❌ IMAP Error:', err.message);
});

imap.once('end', () => {
  console.log('👋 Disconnected');
});

imap.connect();