const Imap = require('imap');
require('dotenv').config();

const email = process.env.EMAIL_USER || 'offers@searchnwa.com';
const password = process.env.EMAIL_PASSWORD || 'ggao mydb xnmt zpfz';

console.log('🔍 Marking test email as unread...');

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
    
    // Search for the test email
    imap.search(['ALL', ['SUBJECT', 'Test Contract - 890 Clark']], (err, results) => {
      if (err) {
        console.error('❌ Search error:', err);
        imap.end();
        return;
      }
      
      if (results.length === 0) {
        console.log('❌ No test email found');
        imap.end();
        return;
      }
      
      console.log(`📧 Found ${results.length} test email(s)`);
      
      // Mark as unread (remove SEEN flag)
      imap.delFlags(results, 'Seen', (err) => {
        if (err) {
          console.error('❌ Error marking unread:', err);
        } else {
          console.log('✅ Test email marked as UNREAD');
          console.log('   Railway should now process it');
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