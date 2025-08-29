/**
 * Script to process the 890 Clark email that's marked as read
 */

const Imap = require('imap');
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import { GPT5Extractor } from './extraction-gpt5';
import { SellerNetSheetCalculator } from './seller-net-sheet-calculator';
import { AgentInfoSheetGenerator } from './agent-info-sheet-generator';
import { GoogleDriveUploader } from './google-drive-uploader';
import { ListingInfoService } from './listing-info-service';
import { GoogleSheetsIntegration } from './google-sheets-integration';
import * as path from 'path';

dotenv.config();

const execAsync = promisify(exec);
const writeFileAsync = promisify(fs.writeFile);

async function processRecentEmail() {
  console.log('🔍 Looking for 890 Clark email...');
  
  const imap = new Imap({
    user: process.env.EMAIL_USER!,
    password: process.env.EMAIL_PASSWORD!,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    authTimeout: 30000
  });

  const driveUploader = new GoogleDriveUploader();
  const listingService = new ListingInfoService();
  const sheets = new GoogleSheetsIntegration();
  
  await driveUploader.initialize();
  await sheets.initialize();
  await listingService.loadFromSheet(sheets);

  return new Promise((resolve, reject) => {
    imap.once('ready', () => {
      console.log('✅ Connected to Gmail');
      
      imap.openBox('INBOX', false, async (err, box) => {
        if (err) {
          reject(err);
          return;
        }
        
        console.log('📬 Inbox has', box.messages.total, 'messages');
        
        // Get the most recent message
        const f = imap.seq.fetch(box.messages.total, {
          bodies: '',
          struct: true
        });
        
        f.on('message', (msg, seqno) => {
          console.log('📧 Processing message #%d', seqno);
          
          msg.on('body', (stream, info) => {
            let buffer = '';
            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8');
            });
            
            stream.once('end', async () => {
              // Parse the email
              const parsed = Imap.parseHeader(buffer);
              
              // Look for PDF attachments
              const attachmentPromises: Promise<any>[] = [];
              
              msg.once('attributes', (attrs) => {
                if (attrs.struct) {
                  findAttachments(attrs.struct, (partID, fileName) => {
                    if (fileName && fileName.toLowerCase().endsWith('.pdf')) {
                      console.log('📎 Found PDF:', fileName);
                      
                      const promise = new Promise((resolve) => {
                        const f = imap.fetch(attrs.uid, {
                          bodies: partID,
                          struct: false
                        });
                        
                        f.on('message', (msg) => {
                          msg.on('body', (stream) => {
                            let data = '';
                            stream.on('data', (chunk) => {
                              data += chunk.toString('base64');
                            });
                            stream.once('end', async () => {
                              // Process the PDF
                              const pdfBuffer = Buffer.from(data, 'base64');
                              const timestamp = Date.now();
                              const pdfPath = path.join(__dirname, 'processed_contracts', 'pdfs', `${timestamp}_${fileName}`);
                              
                              // Ensure directory exists
                              fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
                              
                              // Save PDF
                              await writeFileAsync(pdfPath, pdfBuffer);
                              console.log('💾 Saved PDF:', pdfPath);
                              
                              // Extract data
                              console.log('🔍 Extracting with GPT-5...');
                              const extractor = new GPT5Extractor();
                              const result = await extractor.extractFromPDF(pdfPath);
                              
                              if (result.success && result.data) {
                                console.log('✅ Extraction successful');
                                
                                // Generate net sheets
                                const calculator = new SellerNetSheetCalculator(listingService);
                                const netSheetData = await calculator.calculateNetSheet(result.data);
                                
                                const pdfNetSheet = await calculator.generatePDFNetSheet(netSheetData);
                                const csvNetSheet = await calculator.generateCSVNetSheet(netSheetData);
                                
                                // Upload to Drive
                                const pdfUrl = await driveUploader.uploadNetSheet(pdfNetSheet, 'pdf');
                                const csvUrl = await driveUploader.uploadNetSheet(csvNetSheet, 'csv');
                                
                                console.log('📤 Uploaded to Google Drive:');
                                console.log('   PDF:', pdfUrl);
                                console.log('   CSV:', csvUrl);
                                
                                // Generate agent info sheet
                                const agentGen = new AgentInfoSheetGenerator();
                                const agentSheet = await agentGen.generateAgentInfoSheet(result.data);
                                const agentUrl = await driveUploader.uploadAgentInfoSheet(agentSheet);
                                console.log('   Agent Info:', agentUrl);
                                
                                // Create Google Sheet
                                const sheetUrl = await sheets.createIndividualNetSheet(netSheetData);
                                console.log('   Google Sheet:', sheetUrl);
                              }
                              
                              resolve(true);
                            });
                          });
                        });
                      });
                      
                      attachmentPromises.push(promise);
                    }
                  });
                }
              });
            });
          });
        });
        
        f.once('end', () => {
          Promise.all(attachmentPromises).then(() => {
            imap.end();
            resolve(true);
          });
        });
      });
    });
    
    imap.once('error', (err: Error) => {
      console.error('IMAP error:', err);
      reject(err);
    });
    
    imap.connect();
  });
}

function findAttachments(struct: any, callback: (partID: string, fileName: string) => void, partID = '') {
  for (let i = 0; i < struct.length; i++) {
    const part = struct[i];
    const currentPartID = partID ? `${partID}.${i + 1}` : `${i + 1}`;
    
    if (Array.isArray(part)) {
      findAttachments(part, callback, currentPartID);
    } else if (part.disposition && part.disposition[0] === 'attachment') {
      const fileName = part.disposition[1]?.filename || part.params?.name;
      if (fileName) {
        callback(currentPartID, fileName);
      }
    }
  }
}

// Run it
processRecentEmail()
  .then(() => {
    console.log('✅ Processing complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });