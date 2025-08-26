/**
 * Email Monitor - NEW EMAILS ONLY
 * This version only processes emails that arrive AFTER startup
 */

import { EmailMonitor } from './email-monitor';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function startNewEmailsOnlyMonitor() {
  console.log('📧 Arkansas Contract Email Monitor (NEW EMAILS ONLY)');
  console.log('=====================================================\n');
  console.log(`📮 Monitoring: ${process.env.GMAIL_USER}`);
  console.log('🆕 Will ONLY process emails that arrive from now on...\n');
  
  try {
    // First, mark all current emails as processed
    const currentTime = Date.now();
    console.log('⏰ Marking all emails before', new Date(currentTime).toLocaleString(), 'as processed...');
    
    // Create a processed emails file with a timestamp marker
    const processedData = {
      processedEmails: [],
      ignoreBeforeTimestamp: currentTime,
      startupTime: new Date(currentTime).toISOString()
    };
    
    fs.writeFileSync('processed_emails_new.json', JSON.stringify(processedData, null, 2));
    
    // Temporarily rename files to use new tracking
    if (fs.existsSync('processed_emails.json')) {
      fs.renameSync('processed_emails.json', 'processed_emails_backup.json');
    }
    fs.renameSync('processed_emails_new.json', 'processed_emails.json');
    
    const monitor = new EmailMonitor();
    
    // Email configuration
    const emailConfig = {
      user: process.env.GMAIL_USER || '',
      password: process.env.GMAIL_PASSWORD || '',
      host: 'imap.gmail.com',
      port: 993,
      tls: true
    };
    
    // Connect to email
    await monitor.connect(emailConfig);
    console.log('✅ Connected to Gmail successfully!\n');
    
    console.log('🎯 Ready for NEW emails only!');
    console.log('   • Send a contract to:', process.env.GMAIL_USER);
    console.log('   • It will be processed immediately');
    console.log('   • All old emails are being ignored');
    console.log('\nPress Ctrl+C to stop monitoring.\n');
    
    // Keep the process running
    setInterval(() => {
      // Keep alive - monitoring happens via IMAP events
    }, 60000);
    
  } catch (error: any) {
    console.error('❌ Failed to start email monitor:', error.message);
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping monitor...');
  
  // Restore original processed emails file if it exists
  if (fs.existsSync('processed_emails_backup.json')) {
    if (fs.existsSync('processed_emails.json')) {
      fs.unlinkSync('processed_emails.json');
    }
    fs.renameSync('processed_emails_backup.json', 'processed_emails.json');
    console.log('✅ Restored original processed emails tracking');
  }
  
  process.exit(0);
});

startNewEmailsOnlyMonitor().catch(console.error);