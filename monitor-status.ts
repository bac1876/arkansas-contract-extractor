/**
 * Email Monitor Status Dashboard
 * Shows real-time status of the email monitoring service
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface MonitorStatus {
  isRunning: boolean;
  connectionStatus: string;
  processedToday: number;
  lastProcessed?: Date;
  recentFiles: string[];
  errors: string[];
}

class EmailMonitorDashboard {
  private processedFolder = 'processed_contracts';
  private netSheetsFolder = 'seller_net_sheets';
  
  async getStatus(): Promise<MonitorStatus> {
    const status: MonitorStatus = {
      isRunning: false,
      connectionStatus: 'Unknown',
      processedToday: 0,
      recentFiles: [],
      errors: []
    };

    try {
      // Check if IMAP connection is active
      const { stdout: netstatOutput } = await execAsync('netstat -an | findstr ":993"');
      if (netstatOutput.includes('ESTABLISHED')) {
        status.isRunning = true;
        status.connectionStatus = 'Connected to Gmail IMAP';
      } else {
        status.connectionStatus = 'Not connected';
      }

      // Check for Node processes running email monitor
      const { stdout: tasklistOutput } = await execAsync('tasklist | findstr "node"');
      const nodeProcesses = tasklistOutput.split('\n').filter(line => line.trim());
      
      // Get today's processed files
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check processed contracts folder
      const processedPath = path.join(this.processedFolder, 'results');
      try {
        const files = await fs.readdir(processedPath);
        
        for (const file of files) {
          const filePath = path.join(processedPath, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime >= today) {
            status.processedToday++;
            status.recentFiles.push(file);
          }
          
          // Track the most recent processing
          if (!status.lastProcessed || stats.mtime > status.lastProcessed) {
            status.lastProcessed = stats.mtime;
          }
        }
      } catch (err) {
        // Folder might not exist yet
      }

      // Check for net sheets generated today
      try {
        const netSheetFiles = await fs.readdir(this.netSheetsFolder);
        const todayNetSheets = [];
        
        for (const file of netSheetFiles) {
          const filePath = path.join(this.netSheetsFolder, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime >= today) {
            todayNetSheets.push(file);
          }
        }
        
        if (todayNetSheets.length > 0) {
          status.recentFiles.push(`${todayNetSheets.length} net sheets generated`);
        }
      } catch (err) {
        // Folder might not exist
      }

    } catch (error: any) {
      status.errors.push(error.message);
    }

    return status;
  }

  formatStatus(status: MonitorStatus): string {
    const lines: string[] = [];
    
    lines.push('📧 Arkansas Contract Email Monitor Status');
    lines.push('=' .repeat(50));
    lines.push('');
    
    // Connection status
    lines.push(`🔌 Status: ${status.isRunning ? '✅ RUNNING' : '❌ NOT RUNNING'}`);
    lines.push(`📡 Connection: ${status.connectionStatus}`);
    lines.push('');
    
    // Processing stats
    lines.push('📊 Today\'s Activity:');
    lines.push(`   📄 Contracts Processed: ${status.processedToday}`);
    
    if (status.lastProcessed) {
      const timeAgo = this.getTimeAgo(status.lastProcessed);
      lines.push(`   ⏰ Last Processed: ${timeAgo}`);
    }
    
    if (status.recentFiles.length > 0) {
      lines.push('');
      lines.push('📁 Recent Files:');
      status.recentFiles.slice(0, 5).forEach(file => {
        lines.push(`   • ${file}`);
      });
    }
    
    if (status.errors.length > 0) {
      lines.push('');
      lines.push('⚠️  Errors:');
      status.errors.forEach(err => {
        lines.push(`   • ${err}`);
      });
    }
    
    lines.push('');
    lines.push('=' .repeat(50));
    lines.push('');
    lines.push('💡 Tips:');
    lines.push('   • Send contracts to: contractextraction@gmail.com');
    lines.push('   • PDFs will be automatically processed');
    lines.push('   • Net sheets generated as: netsheet_[address].pdf');
    lines.push('');
    lines.push('🔄 To start monitor: npm run monitor-emails');
    lines.push('📊 To check status: npm run monitor-status');
    
    return lines.join('\n');
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  async watchStatus() {
    console.clear();
    
    // Initial status
    const status = await this.getStatus();
    console.log(this.formatStatus(status));
    
    // Update every 5 seconds
    setInterval(async () => {
      console.clear();
      const newStatus = await this.getStatus();
      console.log(this.formatStatus(newStatus));
      console.log(`\n🔄 Auto-refreshing every 5 seconds... (Press Ctrl+C to exit)`);
    }, 5000);
  }
}

// Run the dashboard
if (require.main === module) {
  const dashboard = new EmailMonitorDashboard();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--watch') || args.includes('-w')) {
    // Continuous monitoring mode
    dashboard.watchStatus().catch(console.error);
  } else {
    // Single status check
    dashboard.getStatus()
      .then(status => {
        console.log(dashboard.formatStatus(status));
      })
      .catch(console.error);
  }
}

export default EmailMonitorDashboard;