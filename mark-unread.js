require('dotenv').config();
const Imap = require('imap');

const email = process.env.EMAIL_USER;
const password = process.env.EMAIL_PASSWORD;

const imap = new Imap({
  user: email,
  password: password,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

imap.once('error', err => {
  console.error('Error:', err.message);
  process.exit(1);
});

imap.once('ready', () => {
  imap.openBox('INBOX', false, (err, box) => {
    if (err) {
      console.error('Failed to open inbox:', err);
      process.exit(1);
    }
    
    console.log('Marking message 4 (475 CAto) as unread...');
    
    // Mark message sequence 4 as unread
    imap.seq.delFlags(4, '\\Seen', err => {
      if (!err) {
        console.log('✅ Email marked as unread - will be retried on next check');
      } else {
        console.error('Failed to mark as unread:', err);
      }
      imap.end();
    });
  });
});

imap.connect();