/**
 * Email Monitor Service for Arkansas Contract Extraction
 * Monitors offers@searchnwa.com for incoming contracts
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
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
import CSVExporter from './csv-exporter';
import { ListingInfoService } from './listing-info-service';
import * as dotenv from 'dotenv';
const express = require('express');
const http = require('http');

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
  private csvExporter: CSVExporter;
  private listingInfo: ListingInfoService;
  private processedFolder: string = 'processed_contracts';
  private isProcessing: boolean = false;
  private processedEmailsFile: string = 'processed_emails.json';
  private processedEmails: Set<string> = new Set();
  private checkInterval: NodeJS.Timer | null = null;
  private lastCheckTime: Date = new Date();

  constructor() {
    // Use RobustExtractor with multiple retries and fallback logic
    // Ensures extraction always attempts multiple times before giving up
    this.robustExtractor = new RobustExtractor();
    this.extractor = new HybridExtractor();
    this.fallbackExtractor = new FallbackExtractor();
    this.statusTracker = new ExtractionStatusTracker();
    this.calculator = new SellerNetSheetCalculator();
    this.pdfGenerator = new PDFGenerator();
    this.agentInfoGenerator = new AgentInfoSheetGenerator();
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
        if (this.imap && this.imap._state === 'authenticated') {
          this.imap._send('NOOP'); // Keep-alive
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
      console.log('⏳ Already processing emails, skipping...');
      return;
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
        return;
      }

      if (uids.length === 0) {
        console.log('📭 No recent emails');
        this.isProcessing = false;
        return;
      }

      console.log(`📨 Found ${uids.length} unread email(s)`);

      // Process each unread email
      for (const uid of uids) {
        await this.processEmail(uid);
      }

      this.isProcessing = false;
    });
  }

  private async processEmail(uid: number): Promise<void> {
    return new Promise((resolve) => {
      try {
        const emailUid = uid; // Store uid for use in mark as read
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
            if (parsed.attachments && parsed.attachments.length > 0) {

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

                  // Extract data using Robust Extractor with multiple retries
                  console.log('🔍 Starting robust extraction with automatic retries...');
                  let extractionResult: any;
                  
                  try {
                    // Use the robust extractor which handles all retry logic internally
                    const robustResult = await this.robustExtractor.extractFromPDF(pdfPath);
                    
                    // Convert robust result to expected format
                    extractionResult = {
                      success: robustResult.success || robustResult.isPartial,
                      partial: robustResult.isPartial,
                      data: robustResult.data,
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
                    
                    // This should rarely happen as robust extractor handles most errors internally
                    extractionResult = {
                      success: false,
                      error: extractionError instanceof Error ? extractionError.message : 'Catastrophic extraction failure'
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

                      // Generate Agent Information Sheet
                      try {
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
                        
                        const agentInfoPath = await this.agentInfoGenerator.generateAgentInfoSheet(agentInfoData);
                        console.log(`📋 Generated agent info sheet: ${path.basename(agentInfoPath)}`);
                        
                        // Upload agent info sheet to Google Drive
                        if (this.drive && agentInfoPath) {
                          try {
                            const agentInfoUpload = await this.drive.uploadFile(
                              agentInfoPath,  // Pass file path directly, not buffer
                              path.basename(agentInfoPath),
                              'application/pdf'
                            );
                            console.log('📤 Uploaded agent info sheet to Google Drive');
                            console.log(`   📎 Link: ${agentInfoUpload.webViewLink || agentInfoUpload.shareableLink}`);
                          } catch (uploadError) {
                            console.error('⚠️  Could not upload agent info sheet:', uploadError);
                          }
                        }
                      } catch (agentInfoError) {
                        console.error('⚠️  Could not generate agent info sheet:', agentInfoError);
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
                        } catch (sheetsError: any) {
                          console.log('⚠️  Could not save to tracking sheet:', sheetsError.message);
                        }
                      }

                      console.log('💰 Net sheet generated successfully');
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
              console.log('📭 No PDF attachments found');
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
              
              // Then add the label using Gmail's X-GM-LABELS extension
              this.imap._send(`UID STORE ${emailUid} +X-GM-LABELS ("Processed Contracts")`, (err: Error) => {
                if (err) {
                  console.error('⚠️  Could not add label:', err);
                } else {
                  console.log('✅ Added "Processed Contracts" label');
                }
              });
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

  // Start health check server FIRST for Railway (before any async operations)
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  // Multiple health check endpoints for Railway compatibility
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy',
      service: 'email-monitor',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });
  
  app.get('/api/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy',
      service: 'email-monitor',
      uptime: process.uptime()
    });
  });
  
  app.get('/', (req, res) => {
    res.status(200).send('Arkansas Contract Email Monitor v3.5 - Running');
  });
  
  // Start server immediately and synchronously
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏥 Health check server running on port ${PORT}`);
    console.log(`📍 Health endpoints: /health, /api/health, /`);
  });
  
  // Log that health server is ready
  console.log('✅ Health check server started successfully');

  // Now connect to email (async operation)
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