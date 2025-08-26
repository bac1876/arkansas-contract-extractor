/**
 * Comprehensive Email Monitor Health Check
 * Checks all aspects of the email monitoring system
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

interface HealthCheck {
  service: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  message: string;
  details?: any;
}

class MonitorHealthCheck {
  private checks: HealthCheck[] = [];
  
  async runHealthChecks() {
    console.log('🏥 Running Email Monitor Health Checks...\n');
    
    // Check 1: Email Credentials
    await this.checkEmailCredentials();
    
    // Check 2: IMAP Connection
    await this.checkIMAPConnection();
    
    // Check 3: File System
    await this.checkFileSystem();
    
    // Check 4: Google Integration
    await this.checkGoogleIntegration();
    
    // Check 5: Processing History
    await this.checkProcessingHistory();
    
    // Check 6: Error Logs
    await this.checkErrorLogs();
    
    // Display results
    this.displayResults();
  }
  
  async checkEmailCredentials() {
    const check: HealthCheck = {
      service: 'Email Credentials',
      status: 'OK',
      message: ''
    };
    
    if (!process.env.GMAIL_USER) {
      check.status = 'ERROR';
      check.message = 'GMAIL_USER not set in .env file';
    } else if (!process.env.GMAIL_PASSWORD) {
      check.status = 'ERROR';
      check.message = 'GMAIL_PASSWORD not set in .env file';
    } else {
      check.message = `Configured for: ${process.env.GMAIL_USER}`;
      check.details = {
        email: process.env.GMAIL_USER,
        passwordLength: process.env.GMAIL_PASSWORD.length
      };
    }
    
    this.checks.push(check);
  }
  
  async checkIMAPConnection() {
    const check: HealthCheck = {
      service: 'IMAP Connection',
      status: 'OK',
      message: ''
    };
    
    try {
      const { stdout } = await execAsync('netstat -an | findstr ":993"');
      if (stdout.includes('ESTABLISHED')) {
        check.message = 'Connected to Gmail IMAP server';
        check.details = {
          port: 993,
          status: 'ESTABLISHED'
        };
      } else {
        check.status = 'WARNING';
        check.message = 'No active IMAP connection found';
      }
    } catch (error) {
      check.status = 'ERROR';
      check.message = 'Could not check IMAP connection';
    }
    
    this.checks.push(check);
  }
  
  async checkFileSystem() {
    const check: HealthCheck = {
      service: 'File System',
      status: 'OK',
      message: ''
    };
    
    const requiredFolders = [
      'processed_contracts',
      'processed_contracts/pdfs',
      'processed_contracts/results',
      'seller_net_sheets'
    ];
    
    const missingFolders = [];
    for (const folder of requiredFolders) {
      try {
        await fs.access(folder);
      } catch {
        missingFolders.push(folder);
      }
    }
    
    if (missingFolders.length > 0) {
      check.status = 'WARNING';
      check.message = `Missing folders: ${missingFolders.join(', ')}`;
      check.details = { missingFolders };
    } else {
      check.message = 'All required folders exist';
      check.details = { folders: requiredFolders };
    }
    
    this.checks.push(check);
  }
  
  async checkGoogleIntegration() {
    const check: HealthCheck = {
      service: 'Google Integration',
      status: 'OK',
      message: ''
    };
    
    const hasServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const hasSpreadsheetId = !!process.env.GOOGLE_SPREADSHEET_ID;
    const hasFolderId = !!process.env.GOOGLE_DRIVE_SHARED_FOLDER_ID;
    
    if (!hasServiceAccount) {
      check.status = 'WARNING';
      check.message = 'Google service account not configured';
    } else if (!hasSpreadsheetId && !hasFolderId) {
      check.status = 'WARNING';
      check.message = 'Neither Google Sheets nor Drive configured';
    } else {
      const configs = [];
      if (hasSpreadsheetId) configs.push('Sheets');
      if (hasFolderId) configs.push('Drive');
      check.message = `Configured: ${configs.join(', ')}`;
      check.details = {
        serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        hasSpreadsheet: hasSpreadsheetId,
        hasFolder: hasFolderId
      };
    }
    
    this.checks.push(check);
  }
  
  async checkProcessingHistory() {
    const check: HealthCheck = {
      service: 'Processing History',
      status: 'OK',
      message: ''
    };
    
    try {
      const resultsPath = 'processed_contracts/results';
      const files = await fs.readdir(resultsPath);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let totalProcessed = files.length;
      let processedToday = 0;
      let lastProcessed: Date | null = null;
      
      for (const file of files) {
        const filePath = path.join(resultsPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime >= today) {
          processedToday++;
        }
        
        if (!lastProcessed || stats.mtime > lastProcessed) {
          lastProcessed = stats.mtime;
        }
      }
      
      check.message = `Total: ${totalProcessed}, Today: ${processedToday}`;
      check.details = {
        totalProcessed,
        processedToday,
        lastProcessed: lastProcessed?.toISOString()
      };
      
      if (totalProcessed === 0) {
        check.status = 'WARNING';
        check.message = 'No contracts processed yet';
      }
    } catch (error) {
      check.status = 'WARNING';
      check.message = 'No processing history found';
    }
    
    this.checks.push(check);
  }
  
  async checkErrorLogs() {
    const check: HealthCheck = {
      service: 'Error Logs',
      status: 'OK',
      message: 'No recent errors'
    };
    
    // Check for common error patterns in recent processing
    try {
      const resultsPath = 'processed_contracts/results';
      const files = await fs.readdir(resultsPath);
      
      const recentErrors = [];
      const oneHourAgo = new Date(Date.now() - 3600000);
      
      for (const file of files.slice(-5)) { // Check last 5 files
        const filePath = path.join(resultsPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);
        
        if (!data.success) {
          const stats = await fs.stat(filePath);
          if (stats.mtime > oneHourAgo) {
            recentErrors.push({
              file,
              error: data.error,
              time: stats.mtime
            });
          }
        }
      }
      
      if (recentErrors.length > 0) {
        check.status = 'WARNING';
        check.message = `${recentErrors.length} recent error(s)`;
        check.details = recentErrors;
      }
    } catch {
      // No errors to report
    }
    
    this.checks.push(check);
  }
  
  displayResults() {
    console.log('=' .repeat(60));
    console.log('HEALTH CHECK RESULTS');
    console.log('=' .repeat(60));
    console.log('');
    
    let hasErrors = false;
    let hasWarnings = false;
    
    for (const check of this.checks) {
      const statusIcon = 
        check.status === 'OK' ? '✅' :
        check.status === 'WARNING' ? '⚠️ ' :
        '❌';
      
      console.log(`${statusIcon} ${check.service}`);
      console.log(`   ${check.message}`);
      
      if (check.details && process.argv.includes('--verbose')) {
        console.log(`   Details: ${JSON.stringify(check.details, null, 2).replace(/\n/g, '\n   ')}`);
      }
      
      console.log('');
      
      if (check.status === 'ERROR') hasErrors = true;
      if (check.status === 'WARNING') hasWarnings = true;
    }
    
    console.log('=' .repeat(60));
    console.log('SUMMARY');
    console.log('=' .repeat(60));
    
    if (hasErrors) {
      console.log('❌ System has errors that need attention');
    } else if (hasWarnings) {
      console.log('⚠️  System is operational with warnings');
    } else {
      console.log('✅ All systems operational');
    }
    
    console.log('');
    console.log('Quick Actions:');
    console.log('  • Start monitor: npm run monitor-emails');
    console.log('  • Check status: npm run monitor-status');
    console.log('  • Live dashboard: npm run monitor-watch');
    console.log('  • Verbose health: npx ts-node monitor-health-check.ts --verbose');
  }
}

// Run health check
if (require.main === module) {
  const healthCheck = new MonitorHealthCheck();
  healthCheck.runHealthChecks().catch(console.error);
}

export default MonitorHealthCheck;