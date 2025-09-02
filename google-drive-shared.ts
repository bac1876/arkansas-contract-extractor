/**
 * Google Drive Integration for Shared Drives
 * Uses Shared Drive to avoid storage quota issues
 */

import { google } from 'googleapis';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

export class GoogleDriveShared {
  private drive: any;
  private sheets: any;
  private auth: any;
  private sharedDriveId: string;
  
  constructor() {
    this.sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID || '';
  }
  
  /**
   * Initialize Google APIs with service account
   */
  async initialize() {
    try {
      // Use service account authentication
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'service-account-key.json',
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/spreadsheets'
        ]
      });
      
      this.auth = auth;
      this.drive = google.drive({ version: 'v3', auth: auth as any });
      this.sheets = google.sheets({ version: 'v4', auth: auth as any });
      
      console.log('✅ Google Drive API initialized');
      console.log(`📁 Using Shared Drive: ${this.sharedDriveId}`);
      
      // Test access to the Shared Drive
      await this.testSharedDriveAccess();
      
    } catch (error) {
      console.error('Failed to initialize Google Drive:', error);
      throw error;
    }
  }
  
  /**
   * Test access to the Shared Drive
   */
  private async testSharedDriveAccess() {
    try {
      // Get Shared Drive info
      const drive = await this.drive.drives.get({
        driveId: this.sharedDriveId
      });
      
      console.log(`✅ Connected to Shared Drive: ${drive.data.name}`);
      
    } catch (error: any) {
      if (error.code === 404) {
        console.error('❌ Shared Drive not found. Check the ID in .env');
      } else if (error.code === 403) {
        console.error('❌ No access to Shared Drive. Make sure service account is added as Content Manager');
      } else {
        console.error('❌ Error accessing Shared Drive:', error.message);
      }
      throw error;
    }
  }
  
  /**
   * Create a new seller net sheet spreadsheet in Shared Drive
   */
  async createSellerNetSheet(netSheetData: any, propertyAddress: string, contractData?: any) {
    try {
      // Generate spreadsheet name
      const date = new Date().toISOString().split('T')[0];
      const cleanAddress = propertyAddress.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 50);
      const spreadsheetName = `Net Sheet - ${cleanAddress} - ${date}`;
      
      console.log('📊 Creating spreadsheet in Shared Drive...');
      
      // Create spreadsheet directly in Shared Drive
      const spreadsheet = await this.drive.files.create({
        requestBody: {
          name: spreadsheetName,
          mimeType: 'application/vnd.google-apps.spreadsheet',
          parents: [this.sharedDriveId]
        },
        supportsAllDrives: true,  // Important for Shared Drives
        fields: 'id, name, webViewLink'
      });
      
      const spreadsheetId = spreadsheet.data.id;
      console.log(`✅ Created spreadsheet: ${spreadsheetName}`);
      console.log(`   ID: ${spreadsheetId}`);
      console.log(`   🔗 Link: ${spreadsheet.data.webViewLink}`);
      
      // Populate the spreadsheet with net sheet data
      await this.populateNetSheet(spreadsheetId, netSheetData, propertyAddress, contractData);
      
      // Make it publicly viewable (optional)
      try {
        await this.drive.permissions.create({
          fileId: spreadsheetId,
          requestBody: {
            type: 'anyone',
            role: 'reader'
          },
          supportsAllDrives: true
        });
        console.log('📌 Sheet is publicly viewable');
      } catch (permError) {
        // Non-critical error - sheet still works without public access
        console.log('ℹ️  Sheet is private (accessible via link)');
      }
      
      return {
        spreadsheetId,
        spreadsheetName,
        shareableLink: spreadsheet.data.webViewLink
      };
      
    } catch (error: any) {
      console.error('Failed to create seller net sheet:', error.message);
      
      if (error.message?.includes('storageQuotaExceeded')) {
        console.error('❌ Storage quota exceeded - this shouldn\'t happen with Shared Drives!');
        console.error('   Please verify the service account has Content Manager role');
      }
      
      throw error;
    }
  }
  
  /**
   * Populate the net sheet with data in professional format
   */
  private async populateNetSheet(spreadsheetId: string, netSheetData: any, propertyAddress: string, contractData?: any) {
    try {
      // Format currency
      const formatCurrency = (value: number) => {
        return value ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';
      };
      
      // Prepare the data
      const values = [
        ['SELLER NET SHEET'],
        [''],
        ['Property Address:', propertyAddress],
        ['Date:', new Date().toLocaleDateString()],
        [''],
        ['', '', ''], 
        ['Sales Price', '', formatCurrency(netSheetData.sales_price || 0)],
        [''],
        ['LESS SELLER\'S COSTS:'],
        [''],
        ['Seller Concessions', '', formatCurrency(netSheetData.seller_concessions || 0)],
        [''],
        ['Taxes Prorated', `(${netSheetData.days_of_tax || 0} days @ ${formatCurrency(netSheetData.tax_per_day || 0)}/day)`, formatCurrency(netSheetData.taxes_prorated || 0)],
        [''],
        ['Commission - Seller', '(3% of sales price)', formatCurrency(netSheetData.commission_seller || 0)],
        [''],
        ['Buyer Agency Fees', '', formatCurrency(netSheetData.buyer_agency_fees || 0)],
        [''],
        ['Closing Fee', '', formatCurrency(netSheetData.closing_fee || 0)],
        [''],
        ['Title Search', '', formatCurrency(netSheetData.title_search || 0)],
        [''],
        ['Title Insurance', '', formatCurrency(netSheetData.title_insurance || 0)],
        [''],
        ['Title & Recording Fees', '', formatCurrency(netSheetData.title_recording_fees || 0)],
        [''],
        ['Pest Transfer', '', formatCurrency(netSheetData.pest_transfer || 0)],
        [''],
        ['Tax Stamps', '(Purchase price × 0.0033 ÷ 2)', formatCurrency(netSheetData.tax_stamps || 0)],
        [''],
        ['Home Warranty', '', formatCurrency(netSheetData.home_warranty || 0)],
        [''],
        ['', '', ''], 
        ['TOTAL COSTS', '', formatCurrency(netSheetData.total_costs || 0)],
        [''],
        ['', '', ''], 
        ['ESTIMATED NET TO SELLER', '', formatCurrency(netSheetData.cash_to_seller || 0)],
        [''],
        [''],
        ['NOTES:'],
        ['• This is an estimate only. Actual costs may vary.'],
        ['• Please consult with your real estate professional and closing attorney for exact figures.'],
        ['• Generated by Arkansas Contract Agent']
      ];
      
      // Update the spreadsheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sheet1!A1:C50',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values
        }
      });
      
      // Format the spreadsheet
      await this.formatNetSheet(spreadsheetId);
      
      console.log('✅ Net sheet populated with data');
      
    } catch (error) {
      console.error('Failed to populate net sheet:', error);
      throw error;
    }
  }
  
  /**
   * Apply professional formatting to the net sheet
   */
  private async formatNetSheet(spreadsheetId: string) {
    try {
      const requests = [
        // Set column widths
        {
          updateDimensionProperties: {
            range: {
              sheetId: 0,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: 1
            },
            properties: {
              pixelSize: 200
            },
            fields: 'pixelSize'
          }
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId: 0,
              dimension: 'COLUMNS',
              startIndex: 1,
              endIndex: 2
            },
            properties: {
              pixelSize: 250
            },
            fields: 'pixelSize'
          }
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId: 0,
              dimension: 'COLUMNS',
              startIndex: 2,
              endIndex: 3
            },
            properties: {
              pixelSize: 150
            },
            fields: 'pixelSize'
          }
        }
      ];
      
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests
        }
      });
      
      console.log('✅ Net sheet formatted');
      
    } catch (error) {
      console.error('Failed to format net sheet:', error);
      // Non-critical error, continue
    }
  }
  
  /**
   * Upload a file to the Shared Drive
   */
  async uploadFile(filePath: string, fileName: string, mimeType: string): Promise<{ fileId: string; webViewLink: string }> {
    try {
      const fs = require('fs');
      
      console.log(`📤 Uploading ${fileName} to Shared Drive...`);
      
      const fileMetadata = {
        name: fileName,
        parents: [this.sharedDriveId]
      };
      
      const media = {
        mimeType: mimeType,
        body: fs.createReadStream(filePath)
      };
      
      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        supportsAllDrives: true,  // Important for Shared Drives
        fields: 'id, webViewLink, name'
      });
      
      console.log(`✅ Uploaded: ${fileName}`);
      console.log(`   🔗 Link: ${response.data.webViewLink}`);
      
      return {
        fileId: response.data.id!,
        webViewLink: response.data.webViewLink!
      };
      
    } catch (error: any) {
      console.error(`❌ Failed to upload ${fileName}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Upload PDF and CSV net sheets to Shared Drive
   */
  async uploadNetSheetFiles(pdfPath?: string, csvPath?: string): Promise<{ pdfLink?: string; csvLink?: string }> {
    const results: { pdfLink?: string; csvLink?: string } = {};
    
    try {
      // Upload PDF if available
      if (pdfPath) {
        const path = require('path');
        const pdfFileName = path.basename(pdfPath);
        
        // Detect actual file type and use appropriate MIME type
        const fileExtension = path.extname(pdfPath).toLowerCase();
        let mimeType = 'application/pdf';
        
        if (fileExtension === '.html') {
          mimeType = 'text/html';
          console.log('⚠️  Uploading HTML content (PDF generation failed)');
          console.log('   File will be viewable as HTML in Google Drive');
        }
        
        const pdfUpload = await this.uploadFile(
          pdfPath,
          pdfFileName,
          mimeType
        );
        results.pdfLink = pdfUpload.webViewLink;
      }
      
      // Upload CSV if available
      if (csvPath) {
        const path = require('path');
        const csvFileName = path.basename(csvPath);
        const csvUpload = await this.uploadFile(
          csvPath,
          csvFileName,
          'text/csv'
        );
        results.csvLink = csvUpload.webViewLink;
      }
      
      return results;
      
    } catch (error) {
      console.error('Failed to upload net sheet files:', error);
      return results; // Return partial results if some uploads succeeded
    }
  }
}

// Export for use in other modules
export default GoogleDriveShared;