/**
 * Process a specific email by message ID
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
import * as dotenv from 'dotenv';

dotenv.config();

// Get email number from command line argument
const EMAIL_NUMBER = parseInt(process.argv[2] || '41');
console.log(`📧 Will process email #${EMAIL_NUMBER}`);

async function processSpecificEmail() {
  const extractor = new ImageMagickExtractor();
  const calculator = new SellerNetSheetCalculator();
  const pdfGenerator = new PDFGenerator();
  const csvExporter = new CSVExporter();
  const listingInfo = new ListingInfoService();
  const drive = new GoogleDriveIntegration();
  
  await listingInfo.initialize();
  await drive.initialize();
  
  const email = process.env.GMAIL_USER || 'contractextraction@gmail.com';
  const password = process.env.GMAIL_PASSWORD;
  
  const imap = new Imap({
    user: email,
    password: password,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  });
  
  imap.once('ready', () => {
    console.log('✅ Connected');
    
    imap.openBox('INBOX', false, (err: Error, box: any) => {
      if (err) {
        console.error('Error:', err);
        return;
      }
      
      // Get the specified email
      const fetch = imap.seq.fetch(`${EMAIL_NUMBER}:${EMAIL_NUMBER}`, { bodies: '' });
      
      fetch.on('message', (msg: any, seqno: number) => {
        msg.on('body', (stream: any) => {
          simpleParser(stream, async (err: Error, parsed: any) => {
            if (err) {
              console.error('Parse error:', err);
              return;
            }
            
            console.log(`\n📧 Processing email: ${parsed.subject}`);
            console.log(`   From: ${parsed.from?.text}`);
            console.log(`   Message ID: ${parsed.messageId}`);
            
            // Process this email (removed message ID check)
            
            // Process attachments
            for (const attachment of parsed.attachments || []) {
              if (attachment.contentType === 'application/pdf') {
                console.log(`\n📎 Found PDF: ${attachment.filename}`);
                
                // Save PDF
                const timestamp = Date.now();
                const pdfPath = path.join('processed_contracts', 'pdfs', `${timestamp}_${attachment.filename}`);
                await fs.mkdir(path.dirname(pdfPath), { recursive: true });
                await fs.writeFile(pdfPath, attachment.content);
                
                // Extract data
                console.log('🔍 Extracting contract data...');
                const extractionResult = await extractor.extractFromPDF(pdfPath);
                
                if (extractionResult.success) {
                  console.log(`✅ Extraction successful: ${extractionResult.extractionRate}`);
                  
                  // Get property address
                  const propertyAddress = extractionResult.data?.property_address || '';
                  console.log(`📍 Property: ${propertyAddress}`);
                  
                  // Look up property data
                  const propertyData = listingInfo.getPropertyData(
                    propertyAddress,
                    { taxes: 3650, commission: 3 }
                  );
                  
                  console.log(`📊 Using ${propertyData.source} data: Taxes=$${propertyData.annualTaxes}, Commission=${(propertyData.commissionPercent * 100).toFixed(1)}%`);
                  
                  if (propertyData.taxWarning) {
                    console.log('❗ TAX WARNING: Using default tax value - NEEDS MANUAL VERIFICATION');
                  }
                  
                  // Generate net sheet
                  const netSheetInput = {
                    purchase_price: extractionResult.data?.purchase_price || 0,
                    seller_concessions: extractionResult.data?.para5_custom_text,
                    closing_date: extractionResult.data?.closing_date,
                    home_warranty: extractionResult.data?.home_warranty,
                    warranty_amount: extractionResult.data?.warranty_amount,
                    title_option: extractionResult.data?.title_option,
                    para32_other_terms: extractionResult.data?.para32_other_terms,
                    annual_taxes: propertyData.annualTaxes,
                    seller_commission_percent: propertyData.commissionPercent
                  };
                  
                  const netSheetData = calculator.calculate(netSheetInput);
                  
                  // Generate PDF and CSV
                  const pdfPath = await pdfGenerator.generateNetSheetPDF(
                    netSheetData,
                    propertyAddress,
                    extractionResult.data
                  );
                  console.log(`📑 Generated PDF: ${path.basename(pdfPath)}`);
                  
                  const csvPath = await csvExporter.exportNetSheet(
                    netSheetData,
                    propertyAddress,
                    extractionResult.data
                  );
                  console.log(`📄 Generated CSV: ${path.basename(csvPath)}`);
                  
                  // Upload to Google Drive
                  const uploadResults = await drive.uploadNetSheetFiles(pdfPath, csvPath);
                  if (uploadResults.pdfLink) {
                    console.log(`📤 PDF uploaded: ${uploadResults.pdfLink}`);
                  }
                  if (uploadResults.csvLink) {
                    console.log(`📤 CSV uploaded: ${uploadResults.csvLink}`);
                  }
                  
                } else {
                  console.error(`❌ Extraction failed: ${extractionResult.error}`);
                }
              }
            }
            
            console.log('\n✅ Done processing');
            imap.end();
            process.exit(0);
          });
        });
      });
    });
  });
  
  imap.once('error', (err: Error) => {
    console.error('IMAP Error:', err);
  });
  
  console.log('🔌 Connecting to Gmail...');
  imap.connect();
}

processSpecificEmail();