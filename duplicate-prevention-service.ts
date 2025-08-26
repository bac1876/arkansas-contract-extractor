/**
 * Duplicate Prevention Service
 * Prevents duplicate processing and infinite loops in email monitoring
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

interface ProcessedContract {
  messageId: string;
  attachmentHash: string;
  propertyAddress: string;
  processedAt: Date;
  pdfPath?: string;
  netSheetPath?: string;
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: string;
  existingContract?: ProcessedContract;
}

export class DuplicatePreventionService {
  private processedContracts: Map<string, ProcessedContract> = new Map();
  private readonly contractsFile = 'processed_contracts_db.json';
  private readonly maxProcessingPerHour = 100; // Circuit breaker
  private processingCounts: Map<string, number[]> = new Map(); // Track processing times
  
  constructor() {
    this.loadProcessedContracts();
  }

  /**
   * Load previously processed contracts from disk
   */
  private async loadProcessedContracts() {
    try {
      const data = await fs.readFile(this.contractsFile, 'utf-8');
      const contracts = JSON.parse(data);
      contracts.forEach((contract: ProcessedContract) => {
        this.processedContracts.set(contract.attachmentHash, contract);
      });
      console.log(`📚 Loaded ${this.processedContracts.size} processed contracts`);
    } catch (error) {
      console.log('📝 Starting with empty contracts database');
    }
  }

  /**
   * Save processed contracts to disk
   */
  private async saveProcessedContracts() {
    const contracts = Array.from(this.processedContracts.values());
    await fs.writeFile(this.contractsFile, JSON.stringify(contracts, null, 2));
  }

  /**
   * Generate hash for attachment content
   */
  public generateAttachmentHash(content: Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Check if a contract has already been processed
   */
  public async checkDuplicate(
    messageId: string,
    attachmentContent: Buffer,
    propertyAddress?: string
  ): Promise<DuplicateCheckResult> {
    const attachmentHash = this.generateAttachmentHash(attachmentContent);
    
    // Check by hash (most reliable)
    if (this.processedContracts.has(attachmentHash)) {
      const existing = this.processedContracts.get(attachmentHash)!;
      const hoursAgo = (Date.now() - new Date(existing.processedAt).getTime()) / (1000 * 60 * 60);
      
      return {
        isDuplicate: true,
        reason: `Contract already processed ${hoursAgo.toFixed(1)} hours ago`,
        existingContract: existing
      };
    }

    // Check by property address (if same property processed recently)
    if (propertyAddress) {
      const recentSameProperty = Array.from(this.processedContracts.values()).find(
        contract => {
          const hoursSince = (Date.now() - new Date(contract.processedAt).getTime()) / (1000 * 60 * 60);
          return contract.propertyAddress === propertyAddress && hoursSince < 24;
        }
      );

      if (recentSameProperty) {
        return {
          isDuplicate: true,
          reason: `Same property was processed recently`,
          existingContract: recentSameProperty
        };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Record a successfully processed contract
   */
  public async recordProcessedContract(
    messageId: string,
    attachmentContent: Buffer,
    propertyAddress: string,
    pdfPath?: string,
    netSheetPath?: string
  ) {
    const attachmentHash = this.generateAttachmentHash(attachmentContent);
    
    const contract: ProcessedContract = {
      messageId,
      attachmentHash,
      propertyAddress,
      processedAt: new Date(),
      pdfPath,
      netSheetPath
    };

    this.processedContracts.set(attachmentHash, contract);
    await this.saveProcessedContracts();
    
    console.log(`✅ Recorded processed contract: ${propertyAddress}`);
  }

  /**
   * Circuit breaker - prevent infinite loops
   */
  public checkProcessingRate(emailId: string): boolean {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // Get or create processing times for this email
    if (!this.processingCounts.has(emailId)) {
      this.processingCounts.set(emailId, []);
    }
    
    const times = this.processingCounts.get(emailId)!;
    
    // Remove old entries
    const recentTimes = times.filter(time => time > oneHourAgo);
    
    // Check if we're over the limit
    if (recentTimes.length >= this.maxProcessingPerHour) {
      console.error(`🚨 CIRCUIT BREAKER: Email ${emailId} processed ${recentTimes.length} times in the last hour!`);
      return false; // Block processing
    }
    
    // Add current time and save
    recentTimes.push(now);
    this.processingCounts.set(emailId, recentTimes);
    
    return true; // Allow processing
  }

  /**
   * Clean up old processed contracts (older than 30 days)
   */
  public async cleanupOldContracts() {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let removed = 0;
    
    for (const [hash, contract] of this.processedContracts.entries()) {
      if (new Date(contract.processedAt).getTime() < thirtyDaysAgo) {
        this.processedContracts.delete(hash);
        removed++;
      }
    }
    
    if (removed > 0) {
      await this.saveProcessedContracts();
      console.log(`🧹 Cleaned up ${removed} old contract records`);
    }
  }

  /**
   * Get statistics about processed contracts
   */
  public getStatistics() {
    const stats = {
      totalProcessed: this.processedContracts.size,
      last24Hours: 0,
      lastWeek: 0,
      byProperty: new Map<string, number>()
    };

    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    for (const contract of this.processedContracts.values()) {
      const processedTime = new Date(contract.processedAt).getTime();
      
      if (processedTime > oneDayAgo) {
        stats.last24Hours++;
      }
      if (processedTime > oneWeekAgo) {
        stats.lastWeek++;
      }

      const count = stats.byProperty.get(contract.propertyAddress) || 0;
      stats.byProperty.set(contract.propertyAddress, count + 1);
    }

    return stats;
  }

  /**
   * Find and remove duplicate PDFs
   */
  public async findAndRemoveDuplicatePDFs() {
    const pdfDir = path.join('processed_contracts', 'pdfs');
    const files = await fs.readdir(pdfDir);
    
    // Group files by property address
    const filesByProperty = new Map<string, string[]>();
    
    for (const file of files) {
      // Extract property address from filename
      const match = file.match(/\d+_(.*?)\.pdf$/);
      if (match) {
        const property = match[1];
        if (!filesByProperty.has(property)) {
          filesByProperty.set(property, []);
        }
        filesByProperty.get(property)!.push(file);
      }
    }

    // Find and remove duplicates (keep the newest)
    let duplicatesRemoved = 0;
    for (const [property, propertyFiles] of filesByProperty.entries()) {
      if (propertyFiles.length > 1) {
        // Sort by timestamp (in filename)
        propertyFiles.sort((a, b) => {
          const timestampA = parseInt(a.split('_')[0]);
          const timestampB = parseInt(b.split('_')[0]);
          return timestampB - timestampA; // Newest first
        });

        // Keep the newest, delete the rest
        for (let i = 1; i < propertyFiles.length; i++) {
          const filePath = path.join(pdfDir, propertyFiles[i]);
          await fs.unlink(filePath);
          console.log(`🗑️ Removed duplicate: ${propertyFiles[i]}`);
          duplicatesRemoved++;
        }
      }
    }

    if (duplicatesRemoved > 0) {
      console.log(`✅ Removed ${duplicatesRemoved} duplicate PDFs`);
    }

    return duplicatesRemoved;
  }
}