/**
 * Extraction Status Tracker
 * Provides comprehensive monitoring and notification of extraction health
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface ExtractionStatus {
  timestamp: string;
  email_id: string;
  subject: string;
  attachment: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'PENDING_RETRY';
  extraction_rate?: string;
  fields_extracted?: number;
  total_fields?: number;
  error?: string;
  retry_count?: number;
  fallback_used?: boolean;
}

interface SystemHealth {
  total_processed: number;
  successful: number;
  partial: number;
  failed: number;
  pending_retry: number;
  success_rate: number;
  last_successful: string | null;
  last_failure: string | null;
  uptime_minutes: number;
  monitor_started: string;
}

export class ExtractionStatusTracker {
  private statusFile = './extraction_status.json';
  private healthFile = './system_health.json';
  private manualReviewFile = './manual_review_queue.json';
  private startTime: Date;
  
  constructor() {
    this.startTime = new Date();
    this.initializeFiles();
  }
  
  private async initializeFiles() {
    // Initialize status file
    try {
      await fs.access(this.statusFile);
    } catch {
      await fs.writeFile(this.statusFile, JSON.stringify({ extractions: [] }, null, 2));
    }
    
    // Initialize health file
    try {
      await fs.access(this.healthFile);
    } catch {
      const initialHealth: SystemHealth = {
        total_processed: 0,
        successful: 0,
        partial: 0,
        failed: 0,
        pending_retry: 0,
        success_rate: 0,
        last_successful: null,
        last_failure: null,
        uptime_minutes: 0,
        monitor_started: this.startTime.toISOString()
      };
      await fs.writeFile(this.healthFile, JSON.stringify(initialHealth, null, 2));
    }
    
    // Initialize manual review queue
    try {
      await fs.access(this.manualReviewFile);
    } catch {
      await fs.writeFile(this.manualReviewFile, JSON.stringify({ queue: [] }, null, 2));
    }
  }
  
  /**
   * Log extraction attempt and result
   */
  async logExtraction(status: ExtractionStatus) {
    try {
      // Read existing status
      const data = JSON.parse(await fs.readFile(this.statusFile, 'utf-8'));
      
      // Add new status
      data.extractions.push(status);
      
      // Keep only last 100 entries
      if (data.extractions.length > 100) {
        data.extractions = data.extractions.slice(-100);
      }
      
      // Save back
      await fs.writeFile(this.statusFile, JSON.stringify(data, null, 2));
      
      // Update system health
      await this.updateSystemHealth(status);
      
      // Check if needs manual review
      if (status.status === 'FAILED' && status.retry_count && status.retry_count >= 3) {
        await this.addToManualReview(status);
      }
      
    } catch (error) {
      console.error('Error logging extraction status:', error);
    }
  }
  
  /**
   * Update system health metrics
   */
  private async updateSystemHealth(status: ExtractionStatus) {
    try {
      const health = JSON.parse(await fs.readFile(this.healthFile, 'utf-8')) as SystemHealth;
      
      // Update counters
      health.total_processed++;
      
      switch (status.status) {
        case 'SUCCESS':
          health.successful++;
          health.last_successful = status.timestamp;
          break;
        case 'PARTIAL':
          health.partial++;
          break;
        case 'FAILED':
          health.failed++;
          health.last_failure = status.timestamp;
          break;
        case 'PENDING_RETRY':
          health.pending_retry++;
          break;
      }
      
      // Calculate success rate
      const total = health.successful + health.partial + health.failed;
      if (total > 0) {
        health.success_rate = ((health.successful + health.partial) / total) * 100;
      }
      
      // Update uptime
      const now = new Date();
      const uptimeMs = now.getTime() - this.startTime.getTime();
      health.uptime_minutes = Math.floor(uptimeMs / 60000);
      
      await fs.writeFile(this.healthFile, JSON.stringify(health, null, 2));
      
      // Log warning if success rate drops below 70%
      if (health.success_rate < 70 && health.total_processed > 5) {
        console.log('⚠️  WARNING: Extraction success rate below 70%!');
        console.log(`   Current rate: ${health.success_rate.toFixed(1)}%`);
        console.log(`   Failed: ${health.failed}, Successful: ${health.successful}, Partial: ${health.partial}`);
      }
      
    } catch (error) {
      console.error('Error updating system health:', error);
    }
  }
  
  /**
   * Add contract to manual review queue
   */
  private async addToManualReview(status: ExtractionStatus) {
    try {
      const data = JSON.parse(await fs.readFile(this.manualReviewFile, 'utf-8'));
      
      data.queue.push({
        added_at: new Date().toISOString(),
        email_id: status.email_id,
        subject: status.subject,
        attachment: status.attachment,
        error: status.error,
        attempts: status.retry_count || 1,
        status: 'NEEDS_REVIEW'
      });
      
      await fs.writeFile(this.manualReviewFile, JSON.stringify(data, null, 2));
      
      console.log('📋 Added to manual review queue:', status.subject);
      console.log(`   Total items in queue: ${data.queue.length}`);
      
    } catch (error) {
      console.error('Error adding to manual review:', error);
    }
  }
  
  /**
   * Get system health report
   */
  async getHealthReport(): Promise<SystemHealth> {
    try {
      return JSON.parse(await fs.readFile(this.healthFile, 'utf-8'));
    } catch {
      return {
        total_processed: 0,
        successful: 0,
        partial: 0,
        failed: 0,
        pending_retry: 0,
        success_rate: 0,
        last_successful: null,
        last_failure: null,
        uptime_minutes: 0,
        monitor_started: this.startTime.toISOString()
      };
    }
  }
  
  /**
   * Get items needing manual review
   */
  async getManualReviewQueue() {
    try {
      const data = JSON.parse(await fs.readFile(this.manualReviewFile, 'utf-8'));
      return data.queue;
    } catch {
      return [];
    }
  }
  
  /**
   * Display current status
   */
  async displayStatus() {
    const health = await this.getHealthReport();
    const queue = await this.getManualReviewQueue();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYSTEM HEALTH REPORT');
    console.log('='.repeat(60));
    console.log(`⏱️  Uptime: ${health.uptime_minutes} minutes`);
    console.log(`📈 Success Rate: ${health.success_rate.toFixed(1)}%`);
    console.log(`✅ Successful: ${health.successful}`);
    console.log(`⚠️  Partial: ${health.partial}`);
    console.log(`❌ Failed: ${health.failed}`);
    console.log(`🔄 Pending Retry: ${health.pending_retry}`);
    console.log(`📋 Manual Review Queue: ${queue.length} items`);
    
    if (health.last_successful) {
      const lastSuccess = new Date(health.last_successful);
      const minutesAgo = Math.floor((Date.now() - lastSuccess.getTime()) / 60000);
      console.log(`✅ Last Success: ${minutesAgo} minutes ago`);
    }
    
    if (health.last_failure) {
      const lastFailure = new Date(health.last_failure);
      const minutesAgo = Math.floor((Date.now() - lastFailure.getTime()) / 60000);
      console.log(`❌ Last Failure: ${minutesAgo} minutes ago`);
    }
    
    console.log('='.repeat(60) + '\n');
  }
}

export default ExtractionStatusTracker;