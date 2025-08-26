/**
 * Email Monitor Service - Runs continuously to check for new contracts
 */

import { EmailMonitor } from './email-monitor';
import * as dotenv from 'dotenv';

dotenv.config();

async function startEmailMonitor() {
  console.log('📧 Arkansas Contract Email Monitor Service');
  console.log('==========================================\n');
  console.log(`📮 Monitoring: ${process.env.GMAIL_USER}`);
  console.log('🔄 Checking for new emails continuously...\n');
  
  try {
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
    
    // Monitoring happens automatically after connection
    console.log('👀 Monitoring for new contracts...');
    console.log('   • Emails with PDF attachments will be processed');
    console.log('   • Net sheets will be generated as:');
    console.log('     - netsheet_[property_address].pdf');
    console.log('     - netsheet_[property_address].csv');
    console.log('\nPress Ctrl+C to stop monitoring.\n');
    
    // Keep the process running
    setInterval(() => {
      // Keep alive - monitoring happens via IMAP events
    }, 60000);
    
  } catch (error: any) {
    console.error('❌ Failed to start email monitor:', error.message);
    
    if (error.message?.includes('AUTHENTICATIONFAILED')) {
      console.log('\n⚠️  Authentication failed. Please check:');
      console.log('1. GMAIL_USER in .env file');
      console.log('2. GMAIL_PASSWORD (app password) in .env file');
      console.log('3. Enable "Less secure app access" or use App Password');
    }
    
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down email monitor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down email monitor...');
  process.exit(0);
});

// Start the monitor
startEmailMonitor().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});