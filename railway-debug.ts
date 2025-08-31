/**
 * Railway Debug Script - Check environment variables and email connectivity
 * This will help us understand why Railway isn't detecting PDFs
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface EnvironmentCheck {
  variable: string;
  present: boolean;
  value?: string;
  masked?: string;
}

class RailwayDebugger {
  
  static checkEnvironmentVariables(): EnvironmentCheck[] {
    const requiredVars = [
      'EMAIL_USER',
      'EMAIL_PASSWORD', 
      'EMAIL_HOST',
      'EMAIL_PORT',
      'OPENAI_API_KEY'
    ];

    const checks: EnvironmentCheck[] = [];

    requiredVars.forEach(varName => {
      const value = process.env[varName];
      const check: EnvironmentCheck = {
        variable: varName,
        present: !!value,
        value: value
      };

      // Mask sensitive values
      if (varName.includes('PASSWORD') || varName.includes('KEY')) {
        check.masked = value ? `${value.substring(0, 4)}****${value.substring(value.length - 4)}` : undefined;
      } else {
        check.masked = value;
      }

      checks.push(check);
    });

    return checks;
  }

  static async testEmailConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const Imap = require('imap');
        
        const email = process.env.EMAIL_USER;
        const password = process.env.EMAIL_PASSWORD;
        const host = process.env.EMAIL_HOST || 'imap.gmail.com';
        const port = parseInt(process.env.EMAIL_PORT || '993');

        console.log('🔐 Testing email connection...');
        console.log(`   Email: ${email}`);
        console.log(`   Host: ${host}:${port}`);

        if (!email || !password) {
          console.error('❌ Missing email credentials');
          resolve(false);
          return;
        }

        const imap = new Imap({
          user: email,
          password: password,
          host: host,
          port: port,
          tls: true,
          tlsOptions: { rejectUnauthorized: false },
          authTimeout: 10000
        });

        imap.once('ready', () => {
          console.log('✅ Email connection successful');
          
          // Try to open inbox
          imap.openBox('INBOX', true, (err: Error, box: any) => {
            if (err) {
              console.error('❌ Error opening inbox:', err.message);
              resolve(false);
            } else {
              console.log(`✅ Inbox opened - ${box.messages.total} messages`);
              resolve(true);
            }
            imap.end();
          });
        });

        imap.once('error', (err: Error) => {
          console.error('❌ Email connection failed:', err.message);
          resolve(false);
        });

        setTimeout(() => {
          console.error('❌ Email connection timed out');
          resolve(false);
        }, 15000);

        imap.connect();
      } catch (error) {
        console.error('❌ Email test error:', error);
        resolve(false);
      }
    });
  }

  static checkSystemResources() {
    const memUsage = process.memoryUsage();
    
    console.log('💾 System Resources:');
    console.log(`   RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
    console.log(`   Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    console.log(`   Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
    console.log(`   External: ${Math.round(memUsage.external / 1024 / 1024)}MB`);
    console.log(`   Node Version: ${process.version}`);
    console.log(`   Platform: ${process.platform}`);
  }

  static async runDiagnostics() {
    console.log('🏥 Railway Environment Diagnostics');
    console.log('=' .repeat(50));
    
    // Check environment variables
    console.log('\n📋 Environment Variables:');
    const envChecks = this.checkEnvironmentVariables();
    envChecks.forEach(check => {
      const status = check.present ? '✅' : '❌';
      console.log(`   ${status} ${check.variable}: ${check.masked || 'NOT SET'}`);
    });

    // Check system resources
    console.log('\n');
    this.checkSystemResources();

    // Test email connection
    console.log('\n📧 Email Connectivity Test:');
    const emailWorking = await this.testEmailConnection();
    
    // Summary
    console.log('\n📊 Diagnostic Summary:');
    const missingVars = envChecks.filter(c => !c.present);
    if (missingVars.length > 0) {
      console.log(`   ❌ Missing environment variables: ${missingVars.map(v => v.variable).join(', ')}`);
    } else {
      console.log('   ✅ All environment variables present');
    }
    
    console.log(`   ${emailWorking ? '✅' : '❌'} Email connection: ${emailWorking ? 'Working' : 'Failed'}`);
    
    if (!emailWorking) {
      console.log('\n🔍 Possible Issues:');
      console.log('   - Railway environment variables not set correctly');
      console.log('   - Network/firewall blocking IMAP connection');
      console.log('   - Gmail app password expired or invalid');
      console.log('   - Railway IP blocked by Gmail');
    }
    
    return {
      environmentOK: missingVars.length === 0,
      emailOK: emailWorking,
      canProcessEmails: missingVars.length === 0 && emailWorking
    };
  }
}

// Run diagnostics when executed directly
if (require.main === module) {
  console.log('🚀 Starting Railway diagnostics...');
  
  RailwayDebugger.runDiagnostics()
    .then(results => {
      console.log('\n🎯 Diagnostics Complete');
      
      if (results.canProcessEmails) {
        console.log('✅ System ready to process emails');
      } else {
        console.log('❌ System NOT ready - check errors above');
      }
      
      process.exit(results.canProcessEmails ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Diagnostics failed:', error);
      process.exit(1);
    });
}

export default RailwayDebugger;