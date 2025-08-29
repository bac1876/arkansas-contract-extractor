/**
 * Health Monitor for Arkansas Contract Email Service
 * Checks system status and logs health metrics
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';
const Imap = require('imap');

dotenv.config();

interface HealthStatus {
  timestamp: string;
  status: 'healthy' | 'warning' | 'critical';
  emailConnection: boolean;
  unreadEmails: number;
  lastCheckTime: string;
  processedToday: number;
  errors: string[];
  details: any;
}

class MonitorHealth {
  private statusFile = 'monitor-status.json';
  private logFile = 'monitor-health.log';

  async checkHealth(): Promise<HealthStatus> {
    const status: HealthStatus = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      emailConnection: false,
      unreadEmails: 0,
      lastCheckTime: '',
      processedToday: 0,
      errors: [],
      details: {}
    };

    try {
      // Check email connection
      await this.checkEmailConnection(status);
      
      // Check processed emails today
      await this.checkProcessedEmails(status);
      
      // Check for any error logs
      await this.checkErrorLogs(status);
      
      // Determine overall health
      this.determineHealthStatus(status);
      
      // Save status
      await this.saveStatus(status);
      
      // Log health check
      await this.logHealth(status);
      
    } catch (error) {
      status.status = 'critical';
      status.errors.push(`Health check failed: ${error}`);
    }

    return status;
  }

  private async checkEmailConnection(status: HealthStatus): Promise<void> {
    return new Promise((resolve) => {
      const email = process.env.EMAIL_USER || 'offers@searchnwa.com';
      const password = process.env.EMAIL_PASSWORD;

      if (!password) {
        status.errors.push('No email password configured');
        resolve();
        return;
      }

      const imap = new Imap({
        user: email,
        password: password,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000
      });

      const timeout = setTimeout(() => {
        imap.end();
        status.errors.push('Email connection timeout');
        resolve();
      }, 15000);

      imap.once('ready', () => {
        clearTimeout(timeout);
        status.emailConnection = true;
        
        imap.openBox('INBOX', false, (err: Error, box: any) => {
          if (!err && box) {
            // Count unread emails
            imap.search(['UNSEEN'], (err: Error, uids: number[]) => {
              if (!err && uids) {
                status.unreadEmails = uids.length;
              }
              imap.end();
              resolve();
            });
          } else {
            imap.end();
            resolve();
          }
        });
      });

      imap.once('error', (err: Error) => {
        clearTimeout(timeout);
        status.errors.push(`IMAP error: ${err.message}`);
        resolve();
      });

      imap.connect();
    });
  }

  private async checkProcessedEmails(status: HealthStatus): Promise<void> {
    try {
      const processedFile = await fs.readFile('processed_emails.json', 'utf-8');
      const processed = JSON.parse(processedFile);
      
      // Count emails processed today
      const today = new Date().toDateString();
      const testResults = await fs.readdir('.');
      const todayFiles = testResults.filter(f => 
        f.startsWith('test_results_') && 
        f.includes(today.replace(/ /g, '_'))
      );
      
      status.processedToday = todayFiles.length;
      status.details.totalProcessed = processed.processedEmails?.length || 0;
      
      // Get last check time from most recent file
      if (todayFiles.length > 0) {
        const stats = await fs.stat(todayFiles[todayFiles.length - 1]);
        status.lastCheckTime = stats.mtime.toISOString();
      }
    } catch (error) {
      status.errors.push(`Could not check processed emails: ${error}`);
    }
  }

  private async checkErrorLogs(status: HealthStatus): Promise<void> {
    try {
      // Check if error log exists
      const errorLog = 'error.log';
      const exists = await fs.access(errorLog).then(() => true).catch(() => false);
      
      if (exists) {
        const stats = await fs.stat(errorLog);
        const recentErrors = Date.now() - stats.mtime.getTime() < 3600000; // Last hour
        
        if (recentErrors) {
          status.errors.push('Recent errors detected in error.log');
        }
      }
    } catch (error) {
      // No error log is actually good
    }
  }

  private determineHealthStatus(status: HealthStatus): void {
    if (!status.emailConnection) {
      status.status = 'critical';
    } else if (status.unreadEmails > 5) {
      status.status = 'warning';
      status.errors.push(`${status.unreadEmails} unread emails pending`);
    } else if (status.errors.length > 0) {
      status.status = 'warning';
    }
  }

  private async saveStatus(status: HealthStatus): Promise<void> {
    try {
      await fs.writeFile(this.statusFile, JSON.stringify(status, null, 2));
    } catch (error) {
      console.error('Could not save status file:', error);
    }
  }

  private async logHealth(status: HealthStatus): Promise<void> {
    const logEntry = `[${status.timestamp}] Status: ${status.status} | Connection: ${status.emailConnection} | Unread: ${status.unreadEmails} | Processed Today: ${status.processedToday}${status.errors.length > 0 ? ' | Errors: ' + status.errors.join(', ') : ''}\n`;
    
    try {
      await fs.appendFile(this.logFile, logEntry);
    } catch (error) {
      console.error('Could not write to log file:', error);
    }
  }

  async displayStatus(): Promise<void> {
    const status = await this.checkHealth();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 ARKANSAS CONTRACT MONITOR HEALTH CHECK');
    console.log('='.repeat(60));
    console.log(`⏰ Timestamp: ${new Date(status.timestamp).toLocaleString()}`);
    console.log(`🔍 Status: ${this.getStatusEmoji(status.status)} ${status.status.toUpperCase()}`);
    console.log(`📧 Email Connection: ${status.emailConnection ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`📬 Unread Emails: ${status.unreadEmails}`);
    console.log(`📈 Processed Today: ${status.processedToday}`);
    
    if (status.lastCheckTime) {
      const lastCheck = new Date(status.lastCheckTime);
      const minutesAgo = Math.floor((Date.now() - lastCheck.getTime()) / 60000);
      console.log(`⏱️  Last Activity: ${minutesAgo} minutes ago`);
    }
    
    if (status.errors.length > 0) {
      console.log('\n⚠️  Issues:');
      status.errors.forEach(err => console.log(`   - ${err}`));
    }
    
    console.log('='.repeat(60));
    
    // Recommendations
    if (status.status !== 'healthy') {
      console.log('\n💡 Recommendations:');
      if (!status.emailConnection) {
        console.log('   1. Check internet connection');
        console.log('   2. Verify email credentials in .env');
        console.log('   3. Run: npx ts-node email-monitor.ts');
      }
      if (status.unreadEmails > 5) {
        console.log('   - Monitor may be stuck. Restart with: monitor-keeper.bat');
      }
    } else {
      console.log('\n✅ System is healthy and processing emails normally');
    }
    
    console.log('\n');
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '🔴';
      default: return '❓';
    }
  }
}

// CLI usage
if (require.main === module) {
  const monitor = new MonitorHealth();
  monitor.displayStatus().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Health check failed:', err);
    process.exit(1);
  });
}

export default MonitorHealth;