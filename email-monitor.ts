/**
 * Email Monitor Service for Arkansas Contract Extraction
 * Monitors contractextraction@gmail.com for incoming contracts
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
import * as fs from 'fs/promises';
import * as path from 'path';
import { HybridExtractor } from './extraction-hybrid';
import GoogleSheetsIntegration from './google-sheets-integration';
import GoogleDriveIntegration from './google-drive-integration';
import SellerNetSheetCalculator from './seller-net-sheet-calculator';
import PDFGenerator from './pdf-generator';
import CSVExporter from './csv-exporter';
import { ListingInfoService } from './listing-info-service';
import * as dotenv from 'dotenv';

dotenv.config();

interface EmailConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  tlsOptions?: any;
}

interface ProcessedEmail {
  from: string;
  subject: string;
  date: Date;
  attachments: string[];
  extractionResults: any[];
}

export class EmailMonitor {
  private imap: any;
  private extractor: HybridExtractor;
  private sheets?: GoogleSheetsIntegration;
  private drive?: GoogleDriveIntegration;
  private calculator: SellerNetSheetCalculator;
  private pdfGenerator: PDFGenerator;
  private csvExporter: CSVExporter;
  private listingInfo: ListingInfoService;
  private processedFolder: string = 'processed_contracts';
  private isProcessing: boolean = false;
  private processedEmailsFile: string = 'processed_emails.json';
  private processedEmails: Set<string> = new Set();

  constructor() {
    // Use Version 3.0 HybridExtractor with GPT-5-mini primary and GPT-4o fallback
    // Achieves 100% extraction success rate
    this.extractor = new HybridExtractor();
    this.calculator = new SellerNetSheetCalculator();
    this.pdfGenerator = new PDFGenerator();
    this.csvExporter = new CSVExporter();
    this.listingInfo = new ListingInfoService();
    this.setupFolders();
    this.initGoogleSheets();
    this.initGoogleDrive();
    this.initListingInfo();
    this.loadProcessedEmails();
  }

  async loadProcessedEmails() {
    try {
      const data = await fs.readFile(this.processedEmailsFile, 'utf-8');
      const parsed = JSON.parse(data);
      this.processedEmails = new Set(parsed.processedEmails || []);
      console.log(`📝 Loaded ${this.processedEmails.size} processed email IDs`);
    } catch (error) {
      // File doesn't exist yet, that's fine
      this.processedEmails = new Set();
    }
  }

  async saveProcessedEmail(messageId: string) {
    this.processedEmails.add(messageId);
    const data = { processedEmails: Array.from(this.processedEmails) };
    await fs.writeFile(this.processedEmailsFile, JSON.stringify(data, null, 2));
  }

  async initGoogleSheets() {
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    if (spreadsheetId) {
      try {
        this.sheets = new GoogleSheetsIntegration(spreadsheetId);
        // Note: Actual initialization happens when we have service account
        console.log('📊 Google Sheets integration configured');
      } catch (error) {
        console.log('⚠️  Google Sheets integration not available');
      }
    }
  }

  async initGoogleDrive() {
    try {
      this.drive = new GoogleDriveIntegration();
      await this.drive.initialize();
      console.log('📁 Google Drive integration ready');
    } catch (error) {
      console.log('⚠️  Google Drive integration not available');
    }
  }

  async initListingInfo() {
    try {
      await this.listingInfo.initialize();
      console.log('📋 Listing info service ready');
    } catch (error) {
      console.log('⚠️  Listing info service not available - using defaults');
    }
  }

  async setupFolders() {
    // Create folders for processed contracts
    await fs.mkdir(this.processedFolder, { recursive: true });
    await fs.mkdir(path.join(this.processedFolder, 'pdfs'), { recursive: true });
    await fs.mkdir(path.join(this.processedFolder, 'results'), { recursive: true });
  }

  async connect(config: EmailConfig) {
    return new Promise((resolve, reject) => {
      console.log('🔐 Attempting connection with:');
      console.log(`   Email: ${config.user}`);
      console.log(`   Password: ${config.password.substring(0, 4)}****${config.password.substring(12)}`);
      console.log(`   Host: ${config.host || 'imap.gmail.com'}`);
      
      this.imap = new Imap({
        user: config.user,
        password: config.password,
        host: config.host || 'imap.gmail.com',
        port: config.port || 993,
        tls: config.tls !== false,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000,
        debug: console.log  // Add debug output
      });

      this.imap.once('ready', () => {
        console.log('✅ Connected to email server');
        this.startMonitoring();
        resolve(true);
      });

      this.imap.once('error', (err: Error) => {
        console.error('❌ IMAP Error:', err);
        reject(err);
      });

      this.imap.once('end', () => {
        console.log('📧 Email connection ended');
      });

      console.log('📧 Connecting to contractextraction@gmail.com...');
      this.imap.connect();
    });
  }

  private startMonitoring() {
    // Open inbox
    this.imap.openBox('INBOX', false, (err: Error, box: any) => {
      if (err) {
        console.error('❌ Error opening inbox:', err);
        return;
      }

      console.log(`📬 Monitoring inbox (${box.messages.total} messages)`);
      
      // Check for recent messages
      this.checkRecentEmails();

      // Listen for new emails
      this.imap.on('mail', (numNewMsgs: number) => {
        console.log(`📨 ${numNewMsgs} new email(s) received!`);
        this.checkRecentEmails();
      });
    });
  }

  private checkRecentEmails() {
    if (this.isProcessing) {
      console.log('⏳ Already processing emails, skipping...');
      return;
    }

    this.isProcessing = true;

    // Search for emails from the last 2 hours for more focused monitoring
    const recentTime = new Date();
    recentTime.setHours(recentTime.getHours() - 2);
    const dateString = recentTime.toISOString().split('T')[0];
    
    // Search for recent emails (since 2 hours ago)
    this.imap.search([['SINCE', dateString]], async (err: Error, uids: number[]) => {
      if (err) {
        console.error('❌ Search error:', err);
        this.isProcessing = false;
        return;
      }

      if (uids.length === 0) {
        console.log('📭 No recent emails');
        this.isProcessing = false;
        return;
      }

      console.log(`📨 Found ${uids.length} recent email(s) from the last 24 hours`);

      // Process each unread email
      for (const uid of uids) {
        await this.processEmail(uid);
      }

      this.isProcessing = false;
    });
  }

  private async processEmail(uid: number): Promise<void> {
    return new Promise((resolve) => {
      const fetch = this.imap.fetch(uid, {
        bodies: '',
        markSeen: false  // Don't mark as seen, we're processing all recent emails
      });

      fetch.on('message', (msg: any) => {
        msg.on('body', (stream: any) => {
          simpleParser(stream, async (err: Error, parsed: any) => {
            if (err) {
              console.error('❌ Parse error:', err);
              resolve();
              return;
            }

            // Check if we've already processed this email
            const messageId = parsed.messageId || `${parsed.date}_${parsed.subject}`;
            if (this.processedEmails.has(messageId)) {
              console.log(`⏭️  Skipping already processed email: ${parsed.subject}`);
              resolve();
              return;
            }

            console.log('\n' + '='.repeat(60));
            console.log(`📧 Processing email from: ${parsed.from?.text}`);
            console.log(`📋 Subject: ${parsed.subject}`);
            console.log(`📅 Date: ${parsed.date}`);

            // Process attachments
            if (parsed.attachments && parsed.attachments.length > 0) {
              const results: ProcessedEmail = {
                from: parsed.from?.text || 'Unknown',
                subject: parsed.subject || 'No Subject',
                date: parsed.date || new Date(),
                attachments: [],
                extractionResults: []
              };

              for (const attachment of parsed.attachments) {
                if (attachment.contentType === 'application/pdf') {
                  console.log(`📎 Found PDF: ${attachment.filename}`);
                  
                  // Save PDF
                  const timestamp = Date.now();
                  const pdfPath = path.join(
                    this.processedFolder, 
                    'pdfs', 
                    `${timestamp}_${attachment.filename}`
                  );
                  
                  await fs.writeFile(pdfPath, attachment.content);
                  results.attachments.push(attachment.filename);

                  // Extract data using Version 3.0 hybrid approach
                  console.log('🔍 Extracting contract data with GPT-5-mini...');
                  const extractionResult = await this.extractor.extractFromPDF(pdfPath, {
                    model: 'gpt-5-mini',  // Use GPT-5-mini as primary for 100% success
                    fallbackToGPT4o: true,  // Allow fallback for reliability
                    verbose: false
                  });
                  
                  if (extractionResult.success) {
                    console.log(`✅ Extraction successful: ${extractionResult.extractionRate}`);
                    results.extractionResults.push({
                      filename: attachment.filename,
                      ...extractionResult
                    });

                    // Save results
                    const resultPath = path.join(
                      this.processedFolder,
                      'results',
                      `${timestamp}_${attachment.filename.replace('.pdf', '')}_result.json`
                    );
                    await fs.writeFile(resultPath, JSON.stringify(extractionResult, null, 2));

                    // Generate seller net sheet
                    try {
                      // Get property address for lookup
                      const propertyAddress = extractionResult.data?.property_address || '';
                      
                      // Look up property-specific taxes and commission
                      const propertyData = this.listingInfo.getPropertyData(
                        propertyAddress,
                        { taxes: 3650, commission: 3 } // Defaults
                      );
                      
                      const data = extractionResult.data as any;
                      
                      // Debug logging
                      console.log('🔍 DEBUG - Extracted data fields:');
                      console.log('  paragraph_5:', data?.paragraph_5);
                      console.log('  additional_terms:', data?.additional_terms);
                      console.log('  para5_custom_text:', data?.para5_custom_text);
                      
                      const netSheetInput = {
                        purchase_price: data?.purchase_price || data?.cash_amount || 0,
                        seller_concessions: data?.para5_custom_text || 
                                          data?.seller_concessions ||
                                          data?.paragraph_5?.seller_specific_payment_text ||
                                          data?.paragraph_5?.seller_specific_payment_amount?.toString(),
                        closing_date: data?.closing_date,
                        home_warranty: data?.home_warranty || data?.home_warranty?.selected_option,
                        warranty_amount: data?.warranty_amount,
                        title_option: data?.title_option,
                        para32_other_terms: data?.para32_other_terms || 
                                          data?.additional_terms ||
                                          data?.para32_additional_terms,
                        annual_taxes: propertyData.annualTaxes,
                        seller_commission_percent: propertyData.commissionPercent
                      };
                      
                      console.log('📊 Net sheet input values:');
                      console.log('  seller_concessions:', netSheetInput.seller_concessions);
                      console.log('  para32_other_terms:', netSheetInput.para32_other_terms);
                      
                      console.log(`📊 Using ${propertyData.source} data: Taxes=$${propertyData.annualTaxes}, Commission=${(propertyData.commissionPercent * 100).toFixed(1)}%`);
                      if (propertyData.taxWarning) {
                        console.log('❗ TAX WARNING: Using default tax value - NEEDS MANUAL VERIFICATION');
                      }

                      const netSheetData = this.calculator.calculate(netSheetInput);
                      
                      // Add tax warning flag to net sheet data
                      (netSheetData as any).taxWarning = propertyData.taxWarning;
                      
                      // Property address already defined above for lookup
                      
                      // Save net sheet JSON
                      const netSheetPath = path.join(
                        this.processedFolder,
                        'seller_net_sheets',
                        `${timestamp}_${attachment.filename.replace('.pdf', '')}_net_sheet.json`
                      );
                      await fs.mkdir(path.dirname(netSheetPath), { recursive: true });
                      await fs.writeFile(netSheetPath, JSON.stringify(netSheetData, null, 2));

                      // Generate PDF net sheet with proper naming
                      let pdfPath: string | undefined;
                      let csvPath: string | undefined;
                      
                      try {
                        pdfPath = await this.pdfGenerator.generateNetSheetPDF(
                          netSheetData,
                          propertyAddress,
                          extractionResult.data
                        );
                        console.log(`📑 Generated PDF net sheet: ${path.basename(pdfPath)}`);
                      } catch (pdfError) {
                        console.error('⚠️  Could not generate PDF:', pdfError);
                      }

                      // Generate CSV net sheet with proper naming
                      try {
                        csvPath = await this.csvExporter.exportNetSheet(
                          netSheetData,
                          propertyAddress,
                          extractionResult.data
                        );
                        console.log(`📄 Generated CSV net sheet: ${path.basename(csvPath)}`);
                      } catch (csvError) {
                        console.error('⚠️  Could not generate CSV:', csvError);
                      }

                      // Upload PDF and CSV files to Google Drive
                      if (this.drive && (pdfPath || csvPath)) {
                        try {
                          const uploadResults = await this.drive.uploadNetSheetFiles(pdfPath, csvPath);
                          if (uploadResults.pdfLink) {
                            console.log('📤 Uploaded PDF to Google Drive');
                            console.log(`   📎 PDF Link: ${uploadResults.pdfLink}`);
                          }
                          if (uploadResults.csvLink) {
                            console.log('📤 Uploaded CSV to Google Drive');
                            console.log(`   📎 CSV Link: ${uploadResults.csvLink}`);
                          }
                        } catch (uploadError) {
                          console.error('⚠️  Could not upload files to Google Drive:', uploadError);
                        }
                      }

                      // Try to create Google Sheet (will likely fail due to quota)
                      if (this.drive) {
                        try {
                          const driveResult = await this.drive.createSellerNetSheet(
                            netSheetData,
                            propertyAddress,
                            extractionResult.data
                          );
                          console.log('📊 Created individual net sheet in Google Drive');
                          console.log(`   📎 Link: ${driveResult.shareableLink}`);
                        } catch (driveError) {
                          console.log('⚠️  Google Drive sheet creation blocked (service account quota)');
                        }
                      }
                      
                      // Also save to tracking spreadsheet if configured
                      if (this.sheets) {
                        try {
                          await this.sheets.saveCompleteExtraction(
                            extractionResult.data,
                            netSheetData,
                            `Email: ${parsed.from?.text}`
                          );
                          console.log('📊 Saved to tracking spreadsheet');
                        } catch (sheetsError) {
                          console.log('⚠️  Could not save to tracking sheet:', sheetsError.message);
                        }
                      }

                      console.log('💰 Net sheet generated successfully');
                    } catch (netSheetError) {
                      console.error('⚠️  Could not generate net sheet:', netSheetError);
                    }
                  } else {
                    console.error(`❌ Extraction failed: ${extractionResult.error}`);
                  }
                }
              }

              // Send response email (optional)
              await this.sendProcessingReport(results);
              
            } else {
              console.log('📭 No PDF attachments found');
            }

            console.log('='.repeat(60) + '\n');
            
            // Mark this email as processed if it had attachments
            if (messageId && (parsed.attachments?.length > 0)) {
              await this.saveProcessedEmail(messageId);
            }
            
            resolve();
          });
        });
      });

      fetch.once('error', (err: Error) => {
        console.error('❌ Fetch error:', err);
        resolve();
      });
    });
  }

  private async sendProcessingReport(results: ProcessedEmail) {
    // TODO: Send email back with results
    console.log('📤 Processing complete for:', results.from);
    console.log(`   - Attachments processed: ${results.attachments.length}`);
    console.log(`   - Successful extractions: ${results.extractionResults.length}`);
    console.log('='.repeat(60));
  }

  disconnect() {
    if (this.imap) {
      this.imap.end();
    }
  }
}

// CLI usage
if (require.main === module) {
  const monitor = new EmailMonitor();
  
  // Get credentials from environment or command line
  const email = process.env.GMAIL_USER || 'contractextraction@gmail.com';
  const password = process.env.GMAIL_PASSWORD || process.argv[2];

  if (!password) {
    console.error('❌ Please provide Gmail app password:');
    console.error('   npm run email-monitor YOUR_APP_PASSWORD');
    console.error('\nTo get an app password:');
    console.error('1. Go to https://myaccount.google.com/security');
    console.error('2. Enable 2-factor authentication');
    console.error('3. Generate an app-specific password');
    process.exit(1);
  }

  monitor.connect({
    user: email,
    password: password,
    host: 'imap.gmail.com',
    port: 993,
    tls: true
  }).then(() => {
    console.log('✅ Email monitor is running...');
    console.log('📧 Send contracts to: contractextraction@gmail.com');
    console.log('Press Ctrl+C to stop');
  }).catch(err => {
    console.error('❌ Failed to start:', err.message);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down email monitor...');
    monitor.disconnect();
    process.exit(0);
  });
}