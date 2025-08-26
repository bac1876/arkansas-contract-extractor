/**
 * Improved Email Monitor with Duplicate Prevention
 * Prevents infinite loops and duplicate processing
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
import * as fs from 'fs/promises';
import * as path from 'path';
import { ImageMagickExtractor } from './extraction-imagemagick';
import GoogleDriveIntegration from './google-drive-integration';
import SellerNetSheetCalculator from './seller-net-sheet-calculator';
import PDFGenerator from './pdf-generator';
import CSVExporter from './csv-exporter';
import { ListingInfoService } from './listing-info-service';
import { DuplicatePreventionService } from './duplicate-prevention-service';
import * as dotenv from 'dotenv';

dotenv.config();

// Health check variables
let lastProcessedTime = Date.now();
let totalProcessed = 0;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 10;
const HEALTH_CHECK_INTERVAL = 60000; // 1 minute
const IDLE_TIMEOUT = 300000; // 5 minutes

export class ImprovedEmailMonitor {
  private imap: any;
  private duplicateService: DuplicatePreventionService;
  private extractor: ImageMagickExtractor;
  private drive: GoogleDriveIntegration;
  private calculator: SellerNetSheetCalculator;
  private pdfGenerator: PDFGenerator;
  private csvExporter: CSVExporter;
  private listingInfo: ListingInfoService;
  private processedEmails: Set<string>;
  private isProcessing: boolean = false;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private lastEmailCheck: number = 0;
  private emailCheckCount: number = 0;

  constructor() {
    this.duplicateService = new DuplicatePreventionService();
    this.extractor = new ImageMagickExtractor();
    this.calculator = new SellerNetSheetCalculator();
    this.pdfGenerator = new PDFGenerator();
    this.csvExporter = new CSVExporter();
    this.listingInfo = new ListingInfoService();
    this.processedEmails = new Set();

    this.imap = new Imap({
      user: process.env.GMAIL_USER!,
      password: process.env.GMAIL_PASSWORD!,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    this.setupHandlers();
    this.startHealthCheck();
  }

  private setupHandlers() {
    this.imap.once('ready', () => this.onReady());
    this.imap.once('error', (err: Error) => this.onError(err));
    this.imap.once('end', () => this.onEnd());
  }

  private async onReady() {
    console.log('✅ Connected to Gmail');
    await this.loadProcessedEmails();
    
    this.imap.openBox('INBOX', false, (err: Error) => {
      if (err) {
        console.error('Failed to open inbox:', err);
        return;
      }

      console.log('📬 Monitoring inbox for new emails...');
      this.setupIdleMonitoring();
    });
  }

  private setupIdleMonitoring() {
    // Listen for new mail events
    this.imap.on('mail', (numNewMsgs: number) => {
      console.log(`📨 ${numNewMsgs} new email(s) received!`);
      this.checkNewEmails();
    });

    // Check for unread emails on startup
    this.checkNewEmails();
    
    // Set up periodic checking (every 30 seconds)
    setInterval(() => {
      if (!this.isProcessing) {
        this.checkNewEmails();
      }
    }, 30000);
  }

  private async checkNewEmails() {
    // Prevent concurrent processing
    if (this.isProcessing) {
      console.log('⏳ Already processing, skipping check');
      return;
    }

    // Circuit breaker check
    const timeSinceLastCheck = Date.now() - this.lastEmailCheck;
    if (timeSinceLastCheck < 5000) { // Minimum 5 seconds between checks
      console.log('⚡ Rate limiting: Too many checks');
      return;
    }

    this.lastEmailCheck = Date.now();
    this.emailCheckCount++;

    // Check if we're in a loop
    if (this.emailCheckCount > 10 && timeSinceLastCheck < 60000) {
      console.error('🚨 LOOP DETECTED: Too many email checks in short time');
      this.restartMonitoring();
      return;
    }

    this.isProcessing = true;

    try {
      // Search for UNSEEN emails only
      this.imap.search(['UNSEEN'], async (err: Error, results: number[]) => {
        if (err) {
          console.error('Search error:', err);
          this.isProcessing = false;
          return;
        }

        if (!results || results.length === 0) {
          console.log('📭 No new unread emails');
          this.isProcessing = false;
          // No IDLE support in this version - will check periodically // Resume IDLE
          return;
        }

        console.log(`📧 Found ${results.length} unread email(s)`);
        
        // Process only unread emails
        for (const seqno of results) {
          await this.processEmail(seqno);
        }

        this.isProcessing = false;
        // No IDLE support in this version - will check periodically // Resume IDLE
      });
    } catch (error) {
      console.error('Error checking emails:', error);
      this.isProcessing = false;
      consecutiveErrors++;
      
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error('🚨 Too many consecutive errors, restarting...');
        this.restartMonitoring();
      }
    }
  }

  private async processEmail(seqno: number) {
    const fetch = this.imap.fetch(seqno, { 
      bodies: '',
      markSeen: true // Mark as read after fetching
    });

    return new Promise((resolve) => {
      fetch.on('message', (msg: any) => {
        msg.on('body', (stream: any) => {
          simpleParser(stream, async (err: Error, parsed: any) => {
            if (err) {
              console.error('Parse error:', err);
              resolve(null);
              return;
            }

            // Check if already processed
            if (this.processedEmails.has(parsed.messageId)) {
              console.log(`⏭️ Already processed: ${parsed.subject}`);
              resolve(null);
              return;
            }

            // Circuit breaker check
            if (!this.duplicateService.checkProcessingRate(parsed.messageId)) {
              console.error('🚨 Circuit breaker triggered for:', parsed.messageId);
              resolve(null);
              return;
            }

            console.log(`\n📧 Processing: ${parsed.subject || 'No subject'}`);
            console.log(`   From: ${parsed.from?.text}`);

            // Process attachments
            for (const attachment of parsed.attachments || []) {
              if (attachment.contentType === 'application/pdf') {
                await this.processPDFAttachment(attachment, parsed);
              }
            }

            // Record as processed
            this.processedEmails.add(parsed.messageId);
            await this.saveProcessedEmails();
            
            lastProcessedTime = Date.now();
            totalProcessed++;
            consecutiveErrors = 0; // Reset error counter on success
            
            resolve(null);
          });
        });
      });

      fetch.once('end', () => resolve(null));
    });
  }

  private async processPDFAttachment(attachment: any, email: any) {
    console.log(`📎 Processing PDF: ${attachment.filename}`);

    // Check for duplicate
    const duplicateCheck = await this.duplicateService.checkDuplicate(
      email.messageId,
      attachment.content
    );

    if (duplicateCheck.isDuplicate) {
      console.log(`⚠️ DUPLICATE DETECTED: ${duplicateCheck.reason}`);
      if (duplicateCheck.existingContract) {
        console.log(`   Original processed at: ${duplicateCheck.existingContract.processedAt}`);
        console.log(`   Property: ${duplicateCheck.existingContract.propertyAddress}`);
      }
      return;
    }

    try {
      // Save PDF
      const timestamp = Date.now();
      const pdfPath = path.join('processed_contracts', 'pdfs', `${timestamp}_${attachment.filename}`);
      await fs.mkdir(path.dirname(pdfPath), { recursive: true });
      await fs.writeFile(pdfPath, attachment.content);

      // Extract data
      console.log('🔍 Extracting contract data...');
      const extractionResult = await this.extractor.extractFromPDF(pdfPath);

      if (extractionResult.success && extractionResult.data) {
        const propertyAddress = extractionResult.data.property_address || 'Unknown';
        console.log(`✅ Extraction successful: ${extractionResult.extractionRate}`);
        console.log(`📍 Property: ${propertyAddress}`);

        // Generate net sheets
        const netSheetData = await this.generateNetSheets(extractionResult.data, propertyAddress);

        // Record successful processing
        await this.duplicateService.recordProcessedContract(
          email.messageId,
          attachment.content,
          propertyAddress,
          pdfPath,
          netSheetData?.pdfPath
        );

        // Upload to Google Drive
        if (netSheetData) {
          await this.uploadToGoogleDrive(netSheetData.pdfPath!, netSheetData.csvPath!);
        }
      } else {
        console.error(`❌ Extraction failed: ${extractionResult.error}`);
      }
    } catch (error) {
      console.error('Error processing PDF:', error);
      consecutiveErrors++;
    }
  }

  private async generateNetSheets(contractData: any, propertyAddress: string) {
    try {
      const propertyData = this.listingInfo.getPropertyData(
        propertyAddress,
        { taxes: 3650, commission: 3 }
      );

      const netSheetInput = {
        purchase_price: contractData.purchase_price || 0,
        seller_concessions: contractData.para5_custom_text,
        closing_date: contractData.closing_date,
        home_warranty: contractData.home_warranty,
        warranty_amount: contractData.warranty_amount,
        title_option: contractData.title_option,
        para32_other_terms: contractData.para32_other_terms,
        annual_taxes: propertyData.annualTaxes,
        seller_commission_percent: propertyData.commissionPercent
      };

      const netSheetData = this.calculator.calculate(netSheetInput);

      const pdfPath = await this.pdfGenerator.generateNetSheetPDF(
        netSheetData,
        propertyAddress,
        contractData
      );

      const csvPath = await this.csvExporter.exportNetSheet(
        netSheetData,
        propertyAddress,
        contractData
      );

      console.log(`📑 Generated net sheets: PDF and CSV`);
      return { pdfPath, csvPath };
    } catch (error) {
      console.error('Error generating net sheets:', error);
      return null;
    }
  }

  private async uploadToGoogleDrive(pdfPath: string, csvPath: string) {
    try {
      await this.drive.initialize();
      const results = await this.drive.uploadNetSheetFiles(pdfPath, csvPath);
      
      if (results.pdfLink) {
        console.log(`📤 PDF uploaded: ${results.pdfLink}`);
      }
      if (results.csvLink) {
        console.log(`📤 CSV uploaded: ${results.csvLink}`);
      }
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
    }
  }

  private async loadProcessedEmails() {
    try {
      const data = await fs.readFile('processed_emails.json', 'utf-8');
      const emails = JSON.parse(data);
      emails.processedEmails.forEach((id: string) => this.processedEmails.add(id));
      console.log(`📝 Loaded ${this.processedEmails.size} processed email IDs`);
    } catch (error) {
      console.log('📝 Starting with empty processed emails list');
    }
  }

  private async saveProcessedEmails() {
    const data = {
      processedEmails: Array.from(this.processedEmails)
    };
    await fs.writeFile('processed_emails.json', JSON.stringify(data, null, 2));
  }

  private startHealthCheck() {
    this.healthCheckTimer = setInterval(() => {
      const idleTime = Date.now() - lastProcessedTime;
      
      console.log(`\n💓 Health Check:`);
      console.log(`   Last processed: ${Math.floor(idleTime / 60000)} minutes ago`);
      console.log(`   Total processed: ${totalProcessed}`);
      console.log(`   Consecutive errors: ${consecutiveErrors}`);
      console.log(`   Email checks: ${this.emailCheckCount}`);
      
      // Clean up old contracts periodically
      if (totalProcessed % 50 === 0) {
        this.duplicateService.cleanupOldContracts();
      }

      // Reset email check counter periodically
      if (this.emailCheckCount > 0 && idleTime > 60000) {
        this.emailCheckCount = 0;
      }

      // Check for stuck state
      if (idleTime > IDLE_TIMEOUT && this.isProcessing) {
        console.error('🚨 Processing seems stuck, resetting...');
        this.isProcessing = false;
        // No IDLE support in this version - will check periodically
      }
    }, HEALTH_CHECK_INTERVAL);
  }

  private restartMonitoring() {
    console.log('🔄 Restarting email monitoring...');
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.imap.end();
    
    // Restart after a delay
    setTimeout(() => {
      consecutiveErrors = 0;
      this.emailCheckCount = 0;
      this.connect();
    }, 5000);
  }

  private onError(err: Error) {
    console.error('IMAP Error:', err);
    consecutiveErrors++;
    
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      this.restartMonitoring();
    }
  }

  private onEnd() {
    console.log('📭 Connection ended');
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }

  public connect() {
    console.log('📧 Arkansas Contract Email Monitor (Improved)');
    console.log('==========================================');
    console.log('📮 Monitoring:', process.env.GMAIL_USER);
    console.log('🔄 Duplicate prevention: ENABLED');
    console.log('⚡ Circuit breaker: ENABLED');
    console.log('💓 Health checks: ENABLED');
    
    this.imap.connect();
  }

  public async runCleanup() {
    console.log('🧹 Running cleanup...');
    const duplicatesRemoved = await this.duplicateService.findAndRemoveDuplicatePDFs();
    const stats = this.duplicateService.getStatistics();
    
    console.log('\n📊 Statistics:');
    console.log(`   Total contracts: ${stats.totalProcessed}`);
    console.log(`   Last 24 hours: ${stats.last24Hours}`);
    console.log(`   Last week: ${stats.lastWeek}`);
    console.log(`   Duplicates removed: ${duplicatesRemoved}`);
  }
}

// Start the monitor if run directly
if (require.main === module) {
  const monitor = new ImprovedEmailMonitor();
  
  // Run cleanup on startup
  monitor.runCleanup().then(() => {
    monitor.connect();
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    process.exit(0);
  });
}