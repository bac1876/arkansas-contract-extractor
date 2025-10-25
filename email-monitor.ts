/**
 * Email Monitor Service for Arkansas Contract Extraction
 * Monitors offers@searchnwa.com for incoming contracts
 */

// Load dependencies
const Imap = require('imap');
const { simpleParser } = require('mailparser');
import * as nodemailer from 'nodemailer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { RobustExtractor } from './extraction-robust';
import { HybridExtractor } from './extraction-hybrid';
import { FallbackExtractor } from './extraction-fallback';
import { ExtractionStatusTracker } from './extraction-status-tracker';
import GoogleSheetsIntegration from './google-sheets-integration';
import GoogleDriveIntegration from './google-drive-integration';
import SellerNetSheetCalculator from './seller-net-sheet-calculator';
import PDFGenerator from './pdf-generator';
import AgentInfoSheetGenerator from './agent-info-sheet-generator';
import OfferSummaryGenerator from './offer-summary-generator';
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
  private robustExtractor: RobustExtractor;
  private extractor: HybridExtractor;
  private fallbackExtractor: FallbackExtractor;
  private statusTracker: ExtractionStatusTracker;
  private sheets?: GoogleSheetsIntegration;
  private drive?: GoogleDriveIntegration;
  private calculator: SellerNetSheetCalculator;
  private pdfGenerator: PDFGenerator;
  private agentInfoGenerator: AgentInfoSheetGenerator;
  private offerSummaryGenerator: OfferSummaryGenerator;
  private listingInfo: ListingInfoService;
  private processedFolder: string = 'processed_contracts';
  private isProcessing: boolean = false;
  private processedEmailsFile: string = 'processed_emails.json';
  private processedEmails: Set<string> = new Set();
  private checkInterval: NodeJS.Timer | null = null;
  private lastCheckTime: Date = new Date();
  private emailTransporter?: nodemailer.Transporter;
  private currentEmailAccount?: string;

  constructor() {
    // Set ImageMagick policy path to allow PDF processing
    // This overrides the default restrictive policy - see Section 4.2 of deployment guide
    if (process.platform !== 'win32') {
      process.env.MAGICK_CONFIGURE_PATH = '/app/config';
      console.log('🎨 Set MAGICK_CONFIGURE_PATH for custom ImageMagick policy');
    }
    
    // Use RobustExtractor with multiple retries and fallback logic
    // Ensures extraction always attempts multiple times before giving up
    this.robustExtractor = new RobustExtractor();
    this.extractor = new HybridExtractor();
    this.fallbackExtractor = new FallbackExtractor();
    this.statusTracker = new ExtractionStatusTracker();
    this.calculator = new SellerNetSheetCalculator();
    this.pdfGenerator = new PDFGenerator();
    this.agentInfoGenerator = new AgentInfoSheetGenerator();
    this.offerSummaryGenerator = new OfferSummaryGenerator();
    this.listingInfo = new ListingInfoService();
    this.setupFolders();
    this.initGoogleSheets();
    this.initGoogleDrive();
    this.initDropbox();
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

  private async trackFailedExtraction(messageId: string, emailUid: number, subject: string, filename: string, error: string) {
    const failedFile = 'failed_extractions.json';
    let failures: any[] = [];
    
    try {
      const existing = await fs.readFile(failedFile, 'utf-8');
      failures = JSON.parse(existing);
    } catch {
      // File doesn't exist yet
    }
    
    // Check if this failure already exists
    const existingIndex = failures.findIndex(f => f.messageId === messageId);
    
    if (existingIndex >= 0) {
      // Update retry count
      failures[existingIndex].retryCount = (failures[existingIndex].retryCount || 0) + 1;
      failures[existingIndex].lastAttempt = new Date().toISOString();
      
      // After 3 retries, mark as permanently failed
      if (failures[existingIndex].retryCount >= 3) {
        console.error(`❌ PERMANENT FAILURE after 3 retries: ${filename}`);
        // Mark as read to stop retrying
        this.imap.addFlags(emailUid, '\\Seen', (err: Error) => {
          if (!err) console.log('📧 Marked failed email as read after 3 attempts');
        });
        await this.saveProcessedEmail(messageId);
      }
    } else {
      // New failure
      failures.push({
        messageId,
        subject,
        filename,
        error,
        firstAttempt: new Date().toISOString(),
        lastAttempt: new Date().toISOString(),
        retryCount: 1
      });
    }
    
    await fs.writeFile(failedFile, JSON.stringify(failures, null, 2));
  }

  async initGoogleSheets() {
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    if (spreadsheetId) {
      try {
        this.sheets = new GoogleSheetsIntegration(spreadsheetId);
        await this.sheets.initialize();
        console.log('📊 Google Sheets integration configured and initialized');
      } catch (error) {
        console.log('⚠️  Google Sheets integration not available:', error.message);
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

  async initDropbox() {
    try {
      const dropbox = new DropboxIntegration();
      if (dropbox.isConfigured()) {
        const initialized = await dropbox.initialize();
        if (initialized) {
          this.dropbox = dropbox;
          console.log('☁️  Dropbox integration ready');
        }
      } else {
        console.log('ℹ️  Dropbox not configured - skipping');
      }
    } catch (error) {
      console.error('⚠️  Dropbox initialization failed:', error);
      // Continue without Dropbox - it's optional
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

      // Store current email account for later use
      this.currentEmailAccount = config.user;

      // Initialize email transporter for sending replies (only for contractextraction@gmail.com)
      if (config.user === 'contractextraction@gmail.com') {
        console.log('📤 Initializing email reply service for contractextraction@gmail.com');
        this.emailTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: config.user,
            pass: config.password
          }
        });
      }

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
        this.startHealthMonitoring();
        resolve(true);
      });

      this.imap.once('error', (err: Error) => {
        console.error('❌ IMAP Error:', err);
        // Try to reconnect after error
        setTimeout(() => {
          console.log('🔄 Attempting to reconnect after error...');
          this.reconnect();
        }, 5000);
        reject(err);
      });

      this.imap.once('end', () => {
        console.log('📧 Email connection ended');
        // Try to reconnect after connection ends
        setTimeout(() => {
          console.log('🔄 Attempting to reconnect after disconnect...');
          this.reconnect();
        }, 5000);
      });

      console.log(`📧 Connecting to ${config.user}...`);
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
      
      // Check for recent messages immediately
      this.checkRecentEmails();

      // Set up polling interval - check every 30 seconds
      console.log('⏰ Setting up 30-second polling interval...');
      this.checkInterval = setInterval(() => {
        console.log(`🔄 Checking for new emails... [${new Date().toLocaleTimeString()}]`);
        this.checkRecentEmails();
      }, 30000); // Check every 30 seconds

      // Also listen for new emails (belt and suspenders approach)
      this.imap.on('mail', (numNewMsgs: number) => {
        console.log(`📨 ${numNewMsgs} new email(s) received!`);
        this.checkRecentEmails();
      });

      // Keep connection alive with periodic NOOP
      setInterval(() => {
        if (this.imap && this.imap.state === 'authenticated') {
          // Keep connection alive - imap library handles this internally
          // Just check the connection is still valid
        }
      }, 60000); // Every 60 seconds
    });
  }
  
  private startHealthMonitoring() {
    // Display health status every 5 minutes
    setInterval(async () => {
      await this.statusTracker.displayStatus();
    }, 5 * 60 * 1000);
    
    // Display initial status after 10 seconds
    setTimeout(async () => {
      await this.statusTracker.displayStatus();
    }, 10000);
  }

  private checkRecentEmails() {
    if (this.isProcessing) {
      console.log('⏳ Already processing emails, will check when done...');
      return;
    }

    // Stop polling while we process
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('⏸️ Paused polling while processing...');
    }

    this.isProcessing = true;

    // Search for emails from the last 24 hours to ensure we don't miss any
    const recentTime = new Date();
    recentTime.setHours(recentTime.getHours() - 24);
    const dateString = recentTime.toISOString().split('T')[0];
    
    // Search for UNSEEN (unread) emails only - not historical
    this.imap.search([['UNSEEN']], async (err: Error, uids: number[]) => {
      if (err) {
        console.error('❌ Search error:', err);
        this.isProcessing = false;
        this.restartPolling();
        return;
      }

      if (uids.length === 0) {
        console.log('📭 No recent emails');
        this.isProcessing = false;
        this.restartPolling();
        return;
      }

      console.log(`📨 Found ${uids.length} unread email(s)`);

      // Process each unread email
      for (const uid of uids) {
        await this.processEmail(uid);
      }

      this.isProcessing = false;
      
      // After processing, immediately check for new emails
      console.log('✅ Processing complete, checking for new emails...');
      this.checkRecentEmails();
      
      // Restart polling interval
      this.restartPolling();
    });
  }
  
  private restartPolling() {
    if (!this.checkInterval) {
      console.log('🔄 Restarting 30-second polling interval...');
      this.checkInterval = setInterval(() => {
        console.log(`🔄 Checking for new emails... [${new Date().toLocaleTimeString()}]`);
        this.checkRecentEmails();
      }, 30000);
    }
  }

  private async processEmail(uid: number): Promise<void> {
    return new Promise((resolve) => {
      try {
        const emailUid = uid; // Store uid for use in mark as read
        const fetch = this.imap.fetch(uid, {
          bodies: '',
          struct: true,  // IMPORTANT: Need struct to get attachments
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
              
              try {  // Add inner try-catch for processing

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

            // Initialize results outside the if block so it's available for error handling
            const results: ProcessedEmail = {
              from: parsed.from?.text || 'Unknown',
              subject: parsed.subject || 'No Subject',
              date: parsed.date || new Date(),
              attachments: [],
              extractionResults: []
            };

            // Process attachments
            console.log(`📋 Checking attachments: ${parsed.attachments?.length || 0} found`);
            if (parsed.attachments && parsed.attachments.length > 0) {
              console.log('🔍 Attachment details:');
              parsed.attachments.forEach((att, idx) => {
                console.log(`  [${idx}] Type: ${att.contentType}, Name: ${att.filename}, Size: ${att.size || 'unknown'}`);
              });

              for (const attachment of parsed.attachments) {
                console.log(`🔎 Checking attachment: ${attachment.filename} (${attachment.contentType})`);
                if (attachment.contentType === 'application/pdf') {
                  console.log(`📎 Found PDF: ${attachment.filename}`);
                  
                  // Save PDF
                  const timestamp = Date.now();
                  const originalContractPath = path.join(
                    this.processedFolder,
                    'pdfs',
                    `${timestamp}_${attachment.filename}`
                  );

                  await fs.writeFile(originalContractPath, attachment.content);
                  console.log(`💾 PDF saved to: ${originalContractPath}`);
                  console.log(`   Size: ${attachment.content.length} bytes`);
                  results.attachments.push(attachment.filename);

                  // Extract data using Robust Extractor with multiple retries
                  console.log('🔍 Starting robust extraction with automatic retries...');
                  let extractionResult: any;
                  
                  try {
                    // Use the robust extractor which handles all retry logic internally
                    const robustResult = await this.robustExtractor.extractFromPDF(originalContractPath);
                    
                    console.log('📄 Extraction completed:');
                    console.log(`   Success: ${robustResult.success}`);
                    console.log(`   Method: ${robustResult.method}`);
                    console.log(`   Extraction Rate: ${robustResult.extractionRate}%`);
                    console.log(`   Fields Extracted: ${robustResult.fieldsExtracted}/${robustResult.totalFields}`);
                    console.log(`   Property Address: ${robustResult.data?.property_address || 'EMPTY'}`);
                    console.log(`   Purchase Price: ${robustResult.data?.purchase_price || 'EMPTY'}`);
                    
                    // Convert robust result to expected format
                    extractionResult = {
                      success: robustResult.success || robustResult.isPartial,
                      partial: robustResult.isPartial,
                      data: robustResult.data || {},  // Ensure data is never undefined
                      error: robustResult.error,
                      extractionRate: robustResult.extractionRate,
                      fieldsExtracted: robustResult.fieldsExtracted,
                      totalFields: robustResult.totalFields,
                      attempts: robustResult.attempts,
                      finalMethod: robustResult.finalMethod
                    };
                    
                    // Log extraction summary
                    if (robustResult.attempts.length > 0) {
                      console.log(`📊 Extraction completed after ${robustResult.attempts.length} attempt(s)`);
                      console.log(`   Method: ${robustResult.finalMethod || 'Unknown'}`);
                      console.log(`   Fields: ${robustResult.fieldsExtracted}/${robustResult.totalFields}`);
                    }
                    
                  } catch (extractionError) {
                    console.error('❌ Robust extraction system failed:', extractionError);
                    if (extractionError instanceof Error) {
                      console.error('   Error message:', extractionError.message);
                      console.error('   Stack trace:', extractionError.stack);
                    }
                    
                    // This should rarely happen as robust extractor handles most errors internally
                    extractionResult = {
                      success: false,
                      error: extractionError instanceof Error ? extractionError.message : 'Catastrophic extraction failure',
                      fieldsExtracted: 0,
                      totalFields: 41
                    };
                  }
                  
                  if (extractionResult.success || extractionResult.partial) {
                    const status = extractionResult.success ? '✅ Extraction successful' : '⚠️ Partial extraction (fallback)';
                    console.log(`${status}: ${extractionResult.extractionRate || 'N/A'}`);
                    results.extractionResults.push({
                      filename: attachment.filename,
                      ...extractionResult
                    });
                    
                    // Log to status tracker
                    await this.statusTracker.logExtraction({
                      timestamp: new Date().toISOString(),
                      email_id: messageId || 'unknown',
                      subject: parsed.subject || 'No Subject',
                      attachment: attachment.filename,
                      status: extractionResult.success ? 'SUCCESS' : 'PARTIAL',
                      extraction_rate: extractionResult.extractionRate,
                      fallback_used: extractionResult.partial || false,
                      fields_extracted: extractionResult.data ? Object.keys(extractionResult.data).filter(k => extractionResult.data[k] != null).length : 0,
                      total_fields: 41
                    });

                    // Save results
                    const resultPath = path.join(
                      this.processedFolder,
                      'results',
                      `${timestamp}_${attachment.filename.replace('.pdf', '')}_result.json`
                    );
                    await fs.writeFile(resultPath, JSON.stringify(extractionResult, null, 2));

                    // Generate seller net sheet
                    if (!extractionResult.success && extractionResult.fieldsExtracted === 0) {
                      console.log('⚠️  Skipping net sheet generation - no data extracted');
                      results.extractionResults.push({
                        attachment: attachment.filename,
                        success: false,
                        error: 'No data extracted - cannot generate net sheet',
                        fieldsExtracted: 0,
                        totalFields: 41
                      });
                      continue; // Skip to next attachment
                    }
                    
                    // Check for critical fields before generating net sheet
                    const propertyAddress = extractionResult.data?.property_address || '';
                    const purchasePrice = extractionResult.data?.purchase_price || 0;
                    
                    if (!propertyAddress || purchasePrice === 0) {
                      console.log('⚠️  Skipping net sheet generation - missing critical data');
                      console.log(`   Property Address: "${propertyAddress}"`);
                      console.log(`   Purchase Price: $${purchasePrice}`);
                      results.extractionResults.push({
                        attachment: attachment.filename,
                        success: false,
                        error: `Missing critical data - Property: "${propertyAddress}", Price: $${purchasePrice}`,
                        fieldsExtracted: extractionResult.fieldsExtracted || 0,
                        totalFields: 41
                      });
                      continue; // Skip to next attachment
                    }

                    try {
                      // Get extraction data - needed by both net sheet AND generators
                      const data = extractionResult.data as any;

                      // Look up property data - needed by both net sheet AND agent info sheet
                      const propertyData = this.listingInfo.getPropertyData(
                        propertyAddress,
                        { taxes: 3650, commission: 3 } // Defaults
                      );

                      // NET SHEET GENERATION - Only for offers@searchnwa.com
                      if (this.currentEmailAccount === 'offers@searchnwa.com') {

                        // Debug logging
                        console.log('🔍 DEBUG - Extracted data fields:');
                        console.log('  paragraph_5:', data?.paragraph_5);
                        console.log('  additional_terms:', data?.additional_terms);
                        console.log('  para5_custom_text:', data?.para5_custom_text);

                        const netSheetInput = {
                          purchase_price: data?.purchase_price || 0,
                          cash_amount: data?.cash_amount || 0,
                          seller_concessions: data?.seller_pays_buyer_costs ||
                                            data?.para5_custom_text ||
                                            data?.seller_concessions ||
                                            data?.paragraph_5?.seller_specific_payment_text ||
                                            data?.paragraph_5?.seller_specific_payment_amount?.toString(),
                          closing_date: data?.closing_date,
                          para15_home_warranty: data?.para15_home_warranty,
                          para15_warranty_paid_by: data?.para15_warranty_paid_by,
                          para15_warranty_cost: data?.para15_warranty_cost,
                          home_warranty: data?.para15_home_warranty || data?.home_warranty || data?.home_warranty?.selected_option,
                          warranty_amount: data?.para15_warranty_cost || data?.warranty_amount,
                          title_option: data?.para10_title_option || data?.title_option,
                          para32_other_terms: data?.para32_additional_terms || data?.para32_other_terms ||
                                            data?.additional_terms,
                          para11_survey_option: data?.para11_survey_option,
                          para11_survey_paid_by: data?.para11_survey_paid_by,
                          buyer_agency_fee: data?.buyer_agency_fee,  // Add buyer agency fee
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

                        // Generate PDF net sheet
                        try {
                          pdfPath = await this.pdfGenerator.generateNetSheetPDF(
                            netSheetData,
                            propertyAddress,
                            extractionResult.data
                          );
                          console.log(`📑 Generated net sheet: ${path.basename(pdfPath)}`);
                        } catch (pdfError) {
                          console.error('⚠️  Could not generate PDF:', pdfError);
                        }

                        // Upload PDF file to Google Drive
                        if (this.drive && pdfPath) {
                          try {
                            const uploadResults = await this.drive.uploadNetSheetFiles(pdfPath, undefined);
                            if (uploadResults.pdfLink) {
                              console.log('📤 Uploaded PDF to Google Drive');
                              console.log(`   📎 PDF Link: ${uploadResults.pdfLink}`);
                            }
                          } catch (uploadError) {
                            console.error('⚠️  Could not upload files to Google Drive:', uploadError);
                          }
                        }

                        console.log('💰 Net sheet generated successfully');
                      }

                      // Generate Agent Information Sheet OR Offer Summary
                      try {
                        let agentInfoResult;

                        // For contractextraction@gmail.com: Generate Offer Summary
                        if (this.currentEmailAccount === 'contractextraction@gmail.com') {
                          const offerSummaryData = {
                            property_address: propertyAddress,
                            purchase_price: data?.purchase_price || data?.cash_amount || 0,
                            buyers: data?.buyers || data?.buyer_names,
                            closing_date: data?.closing_date,
                            seller_concessions: data?.para5_custom_text || data?.seller_pays_buyer_costs,
                            loan_type: data?.loan_type,
                            earnest_money: data?.earnest_money,
                            non_refundable: data?.non_refundable,
                            non_refundable_amount: data?.non_refundable_amount,
                            para11_survey_option: data?.para11_survey_option,
                            para11_survey_paid_by: data?.para11_survey_paid_by,
                            para13_items_included: data?.para13_items_included,
                            para13_items_excluded: data?.para13_items_excluded,
                            para14_contingency: data?.para14_contingency,
                            para15_home_warranty: data?.para15_home_warranty,
                            para15_warranty_cost: data?.para15_warranty_cost,
                            para15_warranty_paid_by: data?.para15_warranty_paid_by,
                            buyer_agency_fee: data?.buyer_agency_fee,
                            selling_agent_name: data?.selling_agent_name,
                            selling_agent_phone: data?.selling_agent_phone
                          };

                          agentInfoResult = await this.offerSummaryGenerator.generateOfferSummary(offerSummaryData);
                          console.log(`📋 Generated offer summary ${agentInfoResult.type.toUpperCase()}: ${path.basename(agentInfoResult.path)}`);
                        }
                        // For offers@searchnwa.com: Generate Agent Info Sheet (existing behavior)
                        else {
                          const agentInfoData = {
                            property_address: propertyAddress,
                            purchase_price: data?.purchase_price || data?.cash_amount || 0,
                            buyers: data?.buyers || data?.buyer_names,
                            closing_date: data?.closing_date,
                            contract_expiration_date: data?.para38_expiration_date,
                            contract_expiration_time: data?.para38_expiration_time,
                            listing_agent_commission: propertyData.commissionPercent ? propertyData.commissionPercent * 100 : undefined,
                            selling_agent_commission: 3, // Default 3% - could be extracted from contract if specified
                            selling_firm_name: data?.selling_firm_name,
                            selling_agent_name: data?.selling_agent_name,
                            selling_agent_phone: data?.selling_agent_phone,
                            selling_agent_email: data?.selling_agent_email,
                            selling_agent_arec: data?.selling_agent_arec,
                            selling_agent_mls: data?.selling_agent_mls,
                            para15_other_details: data?.para15_other_details,
                            // Additional contract details for notes
                            earnest_money: data?.earnest_money,
                            non_refundable: data?.non_refundable,
                            non_refundable_amount: data?.non_refundable_amount,
                            para14_contingency: data?.para14_contingency,
                            para13_items_included: data?.para13_items_included,
                            para13_items_excluded: data?.para13_items_excluded
                          };

                          agentInfoResult = await this.agentInfoGenerator.generateAgentInfoSheet(agentInfoData);
                          console.log(`📋 Generated agent info sheet ${agentInfoResult.type.toUpperCase()}: ${path.basename(agentInfoResult.path)}`);
                        }

                        // Upload agent info sheet to Google Drive (only for offers@searchnwa.com)
                        if (this.currentEmailAccount === 'offers@searchnwa.com' && this.drive && agentInfoResult) {
                          try {
                            // Use correct MIME type based on actual file type
                            const fileName = path.basename(agentInfoResult.path);
                            const fileExt = path.extname(fileName).toLowerCase();
                            let mimeType = 'application/pdf';

                            if (fileExt === '.html') {
                              mimeType = 'text/html';
                              console.log('   Uploading as HTML (PDF generation failed)');
                            }

                            const agentInfoUpload = await this.drive.uploadFile(
                              agentInfoResult.path,
                              fileName,
                              mimeType
                            );
                            console.log('📤 Uploaded agent info sheet to Google Drive');
                            console.log(`   📎 Link: ${agentInfoUpload.webViewLink || agentInfoUpload.shareableLink}`);
                          } catch (uploadError) {
                            console.error('⚠️  Could not upload agent info sheet:', uploadError);
                          }
                        }

                        // Upload to Dropbox if configured (only for offers@searchnwa.com)
                        if (this.currentEmailAccount === 'offers@searchnwa.com' && this.dropbox && this.dropbox.isReady()) {
                          try {
                            console.log('📤 Uploading to Dropbox...');
                            const dropboxResults = await this.dropbox.uploadContractFiles(
                              pdfPath,
                              agentInfoResult.path
                            );

                            if (dropboxResults.netSheetLink || dropboxResults.agentInfoLink) {
                              console.log('☁️  Files backed up to Dropbox successfully');
                            }
                          } catch (dropboxError) {
                            console.error('⚠️  Dropbox upload failed:', dropboxError);
                            // Continue - Dropbox is optional
                          }
                        }

                        // Send email back with offer sheet (only for contractextraction@gmail.com)
                        if (this.emailTransporter && this.currentEmailAccount === 'contractextraction@gmail.com') {
                          try {
                            console.log('📤 Sending email back to sender with offer sheet...');

                            const mailOptions = {
                              from: '"Arkansas Contract Agent - Offer Sheet" <contractextraction@gmail.com>',
                              to: parsed.from?.text,
                              subject: `Offer ${propertyAddress}`,
                              html: `
                                <div style="font-family: Arial, sans-serif;">
                                  <h2>Contract Processing Complete</h2>
                                  <p>Your contract has been processed successfully.</p>
                                  <p><strong>Property:</strong> ${propertyAddress}</p>
                                  <p><strong>Purchase Price:</strong> $${extractionResult.data.purchase_price?.toLocaleString() || 'N/A'}</p>
                                  <p><strong>Buyers:</strong> ${Array.isArray(extractionResult.data.buyers) ? extractionResult.data.buyers.join(', ') : extractionResult.data.buyers || 'N/A'}</p>
                                  <hr>
                                  <p>Please find attached:</p>
                                  <ul>
                                    <li>Offer Sheet (Agent Information)</li>
                                    <li>Original Contract PDF</li>
                                  </ul>
                                  <p style="color: #666; font-size: 12px;">Processed at: ${new Date().toLocaleString()}</p>
                                </div>
                              `,
                              attachments: [
                                {
                                  filename: path.basename(agentInfoResult.path),
                                  path: agentInfoResult.path
                                },
                                {
                                  filename: path.basename(originalContractPath),
                                  path: originalContractPath
                                }
                              ]
                            };

                            await this.emailTransporter.sendMail(mailOptions);
                            console.log(`✅ Email sent successfully to: ${parsed.from?.text}`);
                          } catch (emailError) {
                            console.error('⚠️  Failed to send email back:', emailError);
                            // Continue - this is not critical
                          }
                        }
                      } catch (agentInfoError) {
                        console.error('⚠️  Could not generate agent info sheet:', agentInfoError);
                      }

                      // Google Sheets operations - Only for offers@searchnwa.com
                      if (this.currentEmailAccount === 'offers@searchnwa.com') {
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
                          } catch (sheetsError: any) {
                            console.log('⚠️  Could not save to tracking sheet:', sheetsError.message);
                          }
                        }
                      }
                    } catch (netSheetError) {
                      console.error('⚠️  Could not generate net sheet:', netSheetError);
                    }
                  } else {
                    console.error(`❌ Extraction failed: ${extractionResult.error}`);
                    
                    // Log failed extraction
                    const retryCount = await this.getRetryCount(messageId || '');
                    await this.statusTracker.logExtraction({
                      timestamp: new Date().toISOString(),
                      email_id: messageId || 'unknown',
                      subject: parsed.subject || 'No Subject',
                      attachment: attachment.filename,
                      status: retryCount >= 3 ? 'FAILED' : 'PENDING_RETRY',
                      error: extractionResult.error || 'Unknown error',
                      retry_count: retryCount,
                      fields_extracted: 0,
                      total_fields: 41
                    });
                    
                    // Still try to generate a basic net sheet with minimal data
                    console.log('⚠️  Attempting to generate net sheet with available data...');
                    
                    // Use whatever data we have, even if partial
                    const partialData = extractionResult.data || {};
                    if (partialData.property_address && partialData.purchase_price) {
                      try {
                        const basicNetSheet = {
                          purchase_price: partialData.purchase_price || 0,
                          closing_date: partialData.closing_date,
                          annual_taxes: 3650, // Default
                          seller_commission_percent: 0.03 // Default
                        };
                        
                        const netSheetData = this.calculator.calculate(basicNetSheet);
                        // Generate PDF net sheet
                        const pdfPath = await this.pdfGenerator.generateNetSheetPDF(
                          netSheetData,
                          partialData.property_address,
                          partialData
                        );
                        
                        console.log(`📄 Generated basic net sheet despite extraction failure`);
                        
                        // Upload to Google Drive if available
                        if (this.drive && pdfPath) {
                          try {
                            const upload = await this.drive.uploadFile(
                              pdfPath,  // Pass file path directly, not buffer
                              path.basename(pdfPath),
                              'application/pdf'
                            );
                            console.log(`📤 Uploaded basic net sheet to Google Drive`);
                            console.log(`   📎 Link: ${upload.webViewLink}`);
                          } catch (uploadErr) {
                            console.error('⚠️  Could not upload to Drive:', uploadErr);
                          }
                        }
                      } catch (netSheetErr) {
                        console.error('❌ Could not generate net sheet with partial data:', netSheetErr);
                      }
                    }
                  }
                }
              }

              // Send response email (optional)
              await this.sendProcessingReport(results);
              
            } else {
              console.log('📭 No attachments found in email');
              console.log(`  From: ${parsed.from?.text || 'unknown'}`);
              console.log(`  Subject: ${parsed.subject || 'unknown'}`);
              console.log(`  Has text body: ${!!parsed.text}`);
              console.log(`  Has HTML body: ${!!parsed.html}`);
            }

            console.log('='.repeat(60) + '\n');
            
            // Only mark as processed if extraction was successful
            const hasSuccessfulExtraction = results.extractionResults.some(r => r.success);
            
            if (messageId && hasSuccessfulExtraction) {
              await this.saveProcessedEmail(messageId);
              
              // Mark email as read AND add "Processed Contracts" label
              console.log(`✅ Marking email as read and adding "Processed Contracts" label...`);
              
              // First mark as read
              this.imap.addFlags(emailUid, '\\Seen', (err: Error) => {
                if (err) {
                  console.error('⚠️  Could not mark email as read:', err);
                } else {
                  console.log('✅ Email marked as read');
                }
              });
              
              // Gmail label adding would require additional configuration
              // The email is already marked as read which is sufficient for tracking
            } else if (messageId && !hasSuccessfulExtraction && parsed.attachments?.length > 0) {
              // Track failed extraction but don't mark as processed
              console.error('❌ EXTRACTION FAILED - Email will be retried on next check');
              await this.trackFailedExtraction(messageId, emailUid, parsed.subject || 'No Subject', 
                                               parsed.attachments[0]?.filename || 'Unknown',
                                               'Extraction failed - will retry');
              
              // Don't mark as read so it will be retried
              console.log('⚠️  Keeping email unread for retry...');
            }
            
              } catch (processingError) {
                console.error('❌ Error processing email:', processingError);
                // Continue processing other emails even if this one fails
              }
            
            resolve();
            });
          });
        });

      fetch.once('error', (err: Error) => {
        console.error('❌ Fetch error:', err);
        resolve();
      });
      } catch (outerError) {
        console.error('❌ Fatal error in processEmail:', outerError);
        resolve(); // Always resolve to prevent hanging
      }
    });
  }

  private async sendProcessingReport(results: ProcessedEmail) {
    // TODO: Send email back with results
    console.log('📤 Processing complete for:', results.from);
    console.log(`   - Attachments processed: ${results.attachments.length}`);
    console.log(`   - Successful extractions: ${results.extractionResults.length}`);
    console.log('='.repeat(60));
  }

  private async reconnect() {
    try {
      // Clean up existing connection
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
      
      // Get credentials from environment
      const email = process.env.EMAIL_USER || 'offers@searchnwa.com';
      const password = process.env.EMAIL_PASSWORD;
      
      if (!password) {
        console.error('❌ Cannot reconnect - no password available');
        return;
      }
      
      console.log('🔌 Reconnecting to email server...');
      await this.connect({
        user: email,
        password: password,
        host: 'imap.gmail.com',
        port: 993,
        tls: true
      });
      console.log('✅ Reconnected successfully');
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
      // Try again in 30 seconds
      setTimeout(() => {
        console.log('🔄 Retrying reconnection...');
        this.reconnect();
      }, 30000);
    }
  }

  private async getRetryCount(emailId: string): Promise<number> {
    try {
      const failedFile = 'failed_extractions.json';
      const data = JSON.parse(await fs.readFile(failedFile, 'utf-8').catch(() => '{"failures":[]}'));
      const failure = data.failures.find((f: any) => f.email_id === emailId);
      return failure ? failure.retry_count : 0;
    } catch {
      return 0;
    }
  }
  
  disconnect() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (this.imap) {
      this.imap.end();
    }
  }
}

// CLI usage
if (require.main === module) {
  const monitor = new EmailMonitor();
  
  // Get credentials from environment or command line
  const email = process.env.EMAIL_USER || 'offers@searchnwa.com';
  const password = process.env.EMAIL_PASSWORD || process.argv[2];

  if (!password) {
    console.error('❌ Please provide Gmail app password:');
    console.error('   npm run email-monitor YOUR_APP_PASSWORD');
    console.error('\nTo get an app password:');
    console.error('1. Go to https://myaccount.google.com/security');
    console.error('2. Enable 2-factor authentication');
    console.error('3. Generate an app-specific password');
    process.exit(1);
  }

  // Health check server already started at the top of the file
  console.log('✅ Connecting to email server...');

  // Connect to email (async operation)
  monitor.connect({
    user: email,
    password: password,
    host: 'imap.gmail.com',
    port: 993,
    tls: true
  }).then(() => {
    console.log('✅ Email monitor is running...');
    console.log(`📧 Send contracts to: ${email}`);
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