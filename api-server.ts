/**
 * Express API server to receive PDFs from AWS Lambda
 * This replaces the IMAP email monitor with a webhook approach
 */

import express from 'express';
import bodyParser from 'body-parser';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { GPT5Extractor } from './extraction-gpt5';
import { SellerNetSheetCalculator } from './seller-net-sheet-calculator';
import { AgentInfoSheetGenerator } from './agent-info-sheet-generator';
import { GoogleDriveUploader } from './google-drive-uploader';
import { GoogleSheetsIntegration } from './google-sheets-integration';
import { ListingInfoService } from './listing-info-service';
import ExtractionValidator from './extraction-validator';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Increase payload limit for base64 PDFs
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Initialize services
let driveUploader: GoogleDriveUploader;
let sheetsIntegration: GoogleSheetsIntegration;
let listingService: ListingInfoService;

async function initializeServices() {
  console.log('🚀 Initializing services...');
  
  driveUploader = new GoogleDriveUploader();
  sheetsIntegration = new GoogleSheetsIntegration();
  listingService = new ListingInfoService();
  
  await driveUploader.initialize();
  await sheetsIntegration.initialize();
  await listingService.loadFromSheet(sheetsIntegration);
  
  console.log('✅ All services initialized');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      drive: driveUploader ? 'ready' : 'not initialized',
      sheets: sheetsIntegration ? 'ready' : 'not initialized',
      listings: listingService ? 'ready' : 'not initialized'
    }
  });
});

// Main contract processing endpoint
app.post('/api/process-contract', async (req, res) => {
  console.log('📧 Received contract processing request');
  
  try {
    // Validate API key
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.API_KEY}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { filename, content, from, subject, date, messageId } = req.body;
    
    if (!filename || !content) {
      return res.status(400).json({ error: 'Missing filename or content' });
    }
    
    console.log(`📎 Processing PDF: ${filename}`);
    console.log(`   From: ${from}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Date: ${date}`);
    
    // Save PDF to disk
    const timestamp = Date.now();
    const pdfDir = path.join(__dirname, 'processed_contracts', 'pdfs');
    fs.mkdirSync(pdfDir, { recursive: true });
    
    const pdfPath = path.join(pdfDir, `${timestamp}_${filename}`);
    const pdfBuffer = Buffer.from(content, 'base64');
    fs.writeFileSync(pdfPath, pdfBuffer);
    console.log(`💾 Saved PDF: ${pdfPath}`);
    
    // Extract data using GPT-5
    console.log('🔍 Extracting contract data with GPT-5-mini...');
    const extractor = new GPT5Extractor();
    const extractionResult = await extractor.extractFromPDF(pdfPath);
    
    if (!extractionResult.success || !extractionResult.data) {
      throw new Error('Extraction failed: ' + extractionResult.error);
    }
    
    console.log(`✅ Extraction successful: ${extractionResult.fieldsExtracted}/41 fields`);
    
    // Validate extraction
    const validationReport = ExtractionValidator.generateReport(filename, extractionResult.data);
    console.log(validationReport);
    
    // Generate seller net sheet
    console.log('📊 Generating seller net sheet...');
    const calculator = new SellerNetSheetCalculator(listingService);
    const netSheetData = await calculator.calculateNetSheet(extractionResult.data);
    
    // Generate PDF and CSV net sheets
    const pdfNetSheetPath = await calculator.generatePDFNetSheet(netSheetData);
    const csvNetSheetPath = await calculator.generateCSVNetSheet(netSheetData);
    
    console.log('📄 Generated net sheets:');
    console.log(`   PDF: ${pdfNetSheetPath}`);
    console.log(`   CSV: ${csvNetSheetPath}`);
    
    // Upload to Google Drive
    console.log('📤 Uploading to Google Drive...');
    const pdfUrl = await driveUploader.uploadNetSheet(pdfNetSheetPath, 'pdf');
    const csvUrl = await driveUploader.uploadNetSheet(csvNetSheetPath, 'csv');
    
    console.log('✅ Uploaded net sheets:');
    console.log(`   PDF: ${pdfUrl}`);
    console.log(`   CSV: ${csvUrl}`);
    
    // Generate and upload agent info sheet
    console.log('📋 Generating agent info sheet...');
    const agentGenerator = new AgentInfoSheetGenerator();
    const agentSheetPath = await agentGenerator.generateAgentInfoSheet(extractionResult.data);
    const agentUrl = await driveUploader.uploadAgentInfoSheet(agentSheetPath);
    console.log(`✅ Uploaded agent info sheet: ${agentUrl}`);
    
    // Create Google Sheet
    console.log('📊 Creating Google Sheet...');
    const sheetUrl = await sheetsIntegration.createIndividualNetSheet(netSheetData);
    console.log(`✅ Created Google Sheet: ${sheetUrl}`);
    
    // Save to tracking sheet
    try {
      await sheetsIntegration.saveCompleteExtraction(extractionResult.data);
      console.log('✅ Saved to tracking sheet');
    } catch (error) {
      console.error('⚠️  Failed to save to tracking sheet:', error);
    }
    
    // Log processing to file
    const logEntry = {
      timestamp: new Date().toISOString(),
      messageId,
      from,
      subject,
      filename,
      extractionSuccess: true,
      fieldsExtracted: extractionResult.fieldsExtracted,
      propertyAddress: extractionResult.data.property_address,
      purchasePrice: extractionResult.data.purchase_price,
      buyers: extractionResult.data.buyers,
      urls: {
        pdfNetSheet: pdfUrl,
        csvNetSheet: csvUrl,
        agentSheet: agentUrl,
        googleSheet: sheetUrl
      }
    };
    
    const logFile = path.join(__dirname, 'processing_log.json');
    let logs = [];
    if (fs.existsSync(logFile)) {
      logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
    }
    logs.push(logEntry);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    
    // Return success response
    res.json({
      success: true,
      message: 'Contract processed successfully',
      data: {
        propertyAddress: extractionResult.data.property_address,
        purchasePrice: extractionResult.data.purchase_price,
        buyers: extractionResult.data.buyers,
        fieldsExtracted: extractionResult.fieldsExtracted,
        urls: {
          pdfNetSheet: pdfUrl,
          csvNetSheet: csvUrl,
          agentSheet: agentUrl,
          googleSheet: sheetUrl
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error processing contract:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Start server
async function start() {
  try {
    await initializeServices();
    
    app.listen(PORT, () => {
      console.log(`🚀 API server running on port ${PORT}`);
      console.log(`📧 Webhook endpoint: http://localhost:${PORT}/api/process-contract`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log('');
      console.log('Configure AWS Lambda to POST to this endpoint when emails arrive.');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
start();