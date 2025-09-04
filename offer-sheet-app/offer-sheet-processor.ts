/**
 * Offer Sheet Processor
 * Main service that monitors email, processes contracts, and sends formatted offer sheets
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
import * as fs from 'fs/promises';
import * as path from 'path';
import { OfferSheetImageMagickExtractor } from './offer-sheet-imagemagick-extractor';
import { SimpleFormatter } from './simple-formatter';
import { AzureEmailService } from './azure-email-service';
import { loadEmailConfig } from './config/email-config';
import * as dotenv from 'dotenv';

dotenv.config();

interface ProcessedEmail {
  uid: number;
  from: string;
  subject: string;
  date: Date;
  contractFile: string | null;
}

export class OfferSheetProcessor {
  private imap: any;
  private extractor: OfferSheetImageMagickExtractor;
  private formatter: SimpleFormatter;
  private emailService: AzureEmailService;
  private config = loadEmailConfig();
  private processedEmails: Set<number> = new Set();
  private isProcessing: boolean = false;
  
  constructor() {
    this.extractor = new OfferSheetImageMagickExtractor();
    this.formatter = new SimpleFormatter();
    this.emailService = new AzureEmailService();
    
    this.setupDirectories();
    this.loadProcessedEmails();
  }
  
  private async setupDirectories() {
    // Create necessary directories
    await fs.mkdir(this.config.processing.attachmentsDir, { recursive: true });
    await fs.mkdir('offer-sheet-app/logs', { recursive: true });
  }
  
  private async loadProcessedEmails() {
    try {
      const data = await fs.readFile(this.config.processing.processedEmailsFile, 'utf-8');
      const parsed = JSON.parse(data);
      this.processedEmails = new Set(parsed.processedUIDs || []);
      console.log(`📝 Loaded ${this.processedEmails.size} processed email UIDs`);
    } catch (error) {
      // File doesn't exist yet
      this.processedEmails = new Set();
    }
  }
  
  private async saveProcessedEmails() {
    const data = {
      processedUIDs: Array.from(this.processedEmails),
      lastUpdated: new Date().toISOString()
    };
    await fs.writeFile(
      this.config.processing.processedEmailsFile,
      JSON.stringify(data, null, 2)
    );
  }
  
  /**
   * Start monitoring emails
   */
  async start() {
    console.log('🚀 Starting Offer Sheet Processor...');
    
    // Test email connection
    const emailConnected = await this.emailService.testConnection();
    if (!emailConnected) {
      console.error('❌ Could not connect to email service. Check configuration.');
      return;
    }
    
    // Connect to inbox
    this.connectToInbox();
    
    // Set up periodic checking
    setInterval(() => {
      if (!this.isProcessing) {
        this.checkForNewEmails();
      }
    }, this.config.processing.checkIntervalMinutes * 60 * 1000);
  }
  
  private connectToInbox() {
    this.imap = new Imap({
      user: this.config.incoming.user,
      password: this.config.incoming.password,
      host: this.config.incoming.host,
      port: this.config.incoming.port,
      tls: this.config.incoming.tls,
      tlsOptions: this.config.incoming.tlsOptions
    });
    
    this.imap.once('ready', () => {
      console.log('✅ Connected to inbox');
      this.checkForNewEmails();
    });
    
    this.imap.once('error', (err: any) => {
      console.error('IMAP error:', err);
    });
    
    this.imap.once('end', () => {
      console.log('IMAP connection ended');
    });
    
    this.imap.connect();
  }
  
  private async checkForNewEmails() {
    if (this.isProcessing) {
      console.log('⏳ Already processing emails...');
      return;
    }
    
    this.isProcessing = true;
    console.log('📬 Checking for new emails...');
    
    // Create a fresh connection for each check to ensure we see new emails
    const imap = new Imap({
      user: this.config.incoming.user,
      password: this.config.incoming.password,
      host: this.config.incoming.host,
      port: this.config.incoming.port,
      tls: this.config.incoming.tls,
      tlsOptions: this.config.incoming.tlsOptions
    });
    
    imap.once('ready', () => {
      imap.openBox('INBOX', false, async (err: any, box: any) => {
        if (err) {
          console.error('Error opening inbox:', err);
          this.isProcessing = false;
          imap.end();
          return;
        }
        
        // Search for unprocessed emails with attachments
        imap.search(['UNSEEN'], async (err: any, results: number[]) => {
          if (err) {
            console.error('Search error:', err);
            this.isProcessing = false;
            imap.end();
            return;
          }
          
          if (results.length === 0) {
            console.log('📭 No new emails');
            this.isProcessing = false;
            imap.end();
            return;
          }
          
          console.log(`📨 Found ${results.length} new emails`);
          
          // Store imap reference for processing
          this.imap = imap;
          
          for (const uid of results) {
            if (!this.processedEmails.has(uid)) {
              await this.processEmail(uid);
            }
          }
          
          this.isProcessing = false;
          imap.end();
        });
      });
    });
    
    imap.once('error', (err: any) => {
      console.error('IMAP error:', err);
      this.isProcessing = false;
    });
    
    imap.connect();
  }
  
  private async processEmail(uid: number) {
    console.log(`\n📧 Processing email UID: ${uid}`);
    
    const fetch = this.imap.fetch(uid, {
      bodies: '',
      struct: true
    });
    
    return new Promise((resolve) => {
      fetch.on('message', (msg: any, seqno: number) => {
        msg.on('body', (stream: any, info: any) => {
          simpleParser(stream, async (err: any, parsed: any) => {
            if (err) {
              console.error('Parse error:', err);
              resolve(null);
              return;
            }
            
            // Process the email
            const processed = await this.handleParsedEmail(uid, parsed);
            
            if (processed) {
              // Mark as processed
              this.processedEmails.add(uid);
              await this.saveProcessedEmails();
              
              // Mark as read
              this.imap.addFlags(uid, '\\Seen', (err: any) => {
                if (err) console.error('Error marking as read:', err);
              });
            }
            
            resolve(processed);
          });
        });
      });
      
      fetch.once('error', (err: any) => {
        console.error('Fetch error:', err);
        resolve(null);
      });
    });
  }
  
  private async handleParsedEmail(uid: number, parsed: any): Promise<boolean> {
    const from = parsed.from?.text || 'Unknown';
    const subject = parsed.subject || 'No Subject';
    
    console.log(`📨 From: ${from}`);
    console.log(`📋 Subject: ${subject}`);
    
    // Look for PDF attachments
    if (!parsed.attachments || parsed.attachments.length === 0) {
      console.log('⚠️ No attachments found');
      return false;
    }
    
    for (const attachment of parsed.attachments) {
      if (attachment.contentType === 'application/pdf') {
        console.log(`📎 Found PDF: ${attachment.filename}`);
        
        // Save the PDF
        const pdfPath = path.join(
          this.config.processing.attachmentsDir,
          `contract_${uid}_${attachment.filename}`
        );
        await fs.writeFile(pdfPath, attachment.content);
        
        try {
          // Extract data
          console.log('🔍 Extracting offer sheet data...');
          const extractionResult = await this.extractor.extractFromPDF(pdfPath);
          
          if (!extractionResult.success || !extractionResult.data) {
            console.error('❌ Extraction failed:', extractionResult.error);
            return false;
          }
          
          const offerData = extractionResult.data;
          
          // Format email
          console.log('📝 Formatting offer sheet...');
          const htmlContent = this.formatter.formatOfferSheet(offerData);
          const textContent = this.formatter.formatPlainText(offerData);
          
          // Send response
          console.log('📤 Sending formatted offer sheet...');
          const sent = await this.emailService.sendContractOfferSheet(
            from.includes('<') ? from.match(/<(.+)>/)?.[1] || from : from,
            pdfPath,
            htmlContent,
            textContent
          );
          
          if (sent) {
            console.log('✅ Offer sheet sent successfully!');
            
            // Log the processing
            await this.logProcessing({
              uid,
              from,
              subject,
              date: new Date(),
              contractFile: attachment.filename
            });
            
            return true;
          }
        } catch (error) {
          console.error('❌ Error processing contract:', error);
        }
      }
    }
    
    return false;
  }
  
  private async logProcessing(email: ProcessedEmail) {
    const logFile = path.join('offer-sheet-app/logs', 'processing.log');
    const logEntry = `${new Date().toISOString()} - Processed: ${email.subject} from ${email.from}\n`;
    await fs.appendFile(logFile, logEntry);
  }
  
  /**
   * Stop the processor
   */
  stop() {
    console.log('Stopping Offer Sheet Processor...');
    if (this.imap) {
      this.imap.end();
    }
  }
}

// Main execution
if (require.main === module) {
  const processor = new OfferSheetProcessor();
  
  // Start the processor
  processor.start();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nGracefully shutting down...');
    processor.stop();
    process.exit(0);
  });
}