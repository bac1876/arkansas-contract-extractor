/**
 * Monitor Health Checker
 * Secondary monitoring process that ensures the main monitor is always running
 */

import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import * as path from 'path';

class MonitorHealthChecker {
  private healthFile = './system_health.json';
  private alertFile = './monitor_alerts.log';
  private mainMonitorProcess: any = null;
  private lastHealthyTime: Date = new Date();
  
  async checkHealth(): Promise<boolean> {
    try {
      // Check if health file exists and is recent
      const stats = await fs.stat(this.healthFile);
      const fileAge = Date.now() - stats.mtime.getTime();
      
      // If file hasn't been updated in 2 minutes, consider monitor unhealthy
      if (fileAge > 2 * 60 * 1000) {
        await this.logAlert(`Health file not updated for ${Math.floor(fileAge / 60000)} minutes`);
        return false;
      }
      
      // Check health metrics
      const health = JSON.parse(await fs.readFile(this.healthFile, 'utf-8'));
      
      // Check if monitor has been running for at least 1 minute
      if (health.uptime_minutes < 1) {
        console.log('⏳ Monitor just started, waiting for initialization...');
        return true;
      }
      
      // Check success rate
      if (health.success_rate < 50 && health.total_processed > 3) {
        await this.logAlert(`Low success rate: ${health.success_rate.toFixed(1)}%`);
      }
      
      // Check for recent failures
      if (health.last_failure) {
        const lastFailure = new Date(health.last_failure);
        const failureAge = Date.now() - lastFailure.getTime();
        
        if (failureAge < 5 * 60 * 1000 && !health.last_successful) {
          await this.logAlert('Recent failures with no successes');
        }
      }
      
      this.lastHealthyTime = new Date();
      return true;
      
    } catch (error) {
      await this.logAlert(`Cannot read health file: ${error}`);
      return false;
    }
  }
  
  private async logAlert(message: string) {
    const timestamp = new Date().toISOString();
    const alertMessage = `[${timestamp}] ⚠️ ALERT: ${message}\n`;
    
    console.log(alertMessage);
    
    try {
      await fs.appendFile(this.alertFile, alertMessage);
    } catch (error) {
      console.error('Failed to write alert to file:', error);
    }
  }
  
  async restartMonitor() {
    console.log('🔄 Restarting email monitor...');
    
    // Kill existing monitor if running
    if (this.mainMonitorProcess) {
      console.log('❌ Killing existing monitor process...');
      this.mainMonitorProcess.kill();
      this.mainMonitorProcess = null;
      
      // Wait for process to die
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Start new monitor
    console.log('✨ Starting new monitor process...');
    this.mainMonitorProcess = spawn('npx', ['ts-node', 'email-monitor.ts'], {
      detached: false,
      stdio: 'inherit',
      shell: true
    });
    
    this.mainMonitorProcess.on('error', (error: any) => {
      console.error('❌ Monitor process error:', error);
      this.mainMonitorProcess = null;
    });
    
    this.mainMonitorProcess.on('exit', (code: number) => {
      console.log(`📤 Monitor process exited with code ${code}`);
      this.mainMonitorProcess = null;
    });
  }
  
  async run() {
    console.log('🏥 Health Checker Started');
    console.log('Monitoring email monitor health...');
    
    // Check health every 1 minute
    setInterval(async () => {
      const isHealthy = await this.checkHealth();
      
      if (!isHealthy) {
        const minutesSinceHealthy = Math.floor((Date.now() - this.lastHealthyTime.getTime()) / 60000);
        
        console.log(`⚠️  Monitor appears unhealthy (${minutesSinceHealthy} minutes)`);
        
        // Restart if unhealthy for more than 3 minutes
        if (minutesSinceHealthy > 3) {
          await this.logAlert('Monitor unhealthy for 3+ minutes, restarting...');
          await this.restartMonitor();
          
          // Reset last healthy time after restart
          this.lastHealthyTime = new Date();
        }
      } else {
        // Periodically show we're still checking
        const now = new Date();
        if (now.getMinutes() % 10 === 0 && now.getSeconds() < 60) {
          console.log(`✅ [${now.toLocaleTimeString()}] Monitor is healthy`);
        }
      }
    }, 60000); // Check every minute
    
    // Initial check after 30 seconds
    setTimeout(async () => {
      const isHealthy = await this.checkHealth();
      if (!isHealthy) {
        console.log('⚠️  Initial health check failed, starting monitor...');
        await this.restartMonitor();
      }
    }, 30000);
  }
}

// Run the health checker
const checker = new MonitorHealthChecker();
checker.run().catch(console.error);

// Keep process running
process.on('SIGINT', () => {
  console.log('\n👋 Health checker shutting down...');
  process.exit(0);
});