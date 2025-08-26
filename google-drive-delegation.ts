/**
 * Google Drive Integration with Domain-Wide Delegation
 * This version impersonates brian@searchnwa.com to use his storage quota
 */

import { google } from 'googleapis';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

export class GoogleDriveDelegation {
  private drive: any;
  private sheets: any;
  private auth: any;
  private netSheetsFolderId?: string;
  
  /**
   * Initialize Google APIs with domain delegation
   */
  async initialize() {
    try {
      // Load service account key
      const keyFile = JSON.parse(await fs.readFile('service-account-key.json', 'utf-8'));
      
      // Create JWT client that impersonates brian@searchnwa.com
      const jwtClient = new google.auth.JWT({
        email: keyFile.client_email,
        key: keyFile.private_key,
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/spreadsheets'
        ],
        subject: 'brian@searchnwa.com' // Impersonate brian
      });
      
      console.log('🔐 Authenticating as brian@searchnwa.com via delegation...');
      
      try {
        await jwtClient.authorize();
        console.log('✅ Domain delegation authentication successful');
        
        this.auth = jwtClient;
        this.drive = google.drive({ version: 'v3', auth: jwtClient });
        this.sheets = google.sheets({ version: 'v4', auth: jwtClient });
        
        // Check storage quota
        const about = await this.drive.about.get({
          fields: 'user,storageQuota'
        });
        
        const quota = about.data.storageQuota;
        const user = about.data.user;
        
        console.log(`👤 Acting as: ${user?.emailAddress}`);
        const available = parseInt(quota?.limit || '0') - parseInt(quota?.usage || '0');
        console.log(`📦 Storage available: ${this.formatBytes(available)}`);
        
        // Setup folder
        await this.setupFolderStructure();
        
      } catch (error: any) {
        if (error.message?.includes('unauthorized_client')) {
          console.log('⚠️  Domain delegation not yet configured');
          console.log('   Please follow instructions in enable-workspace-delegation.md');
          console.log('   Falling back to service account mode (files will be stored locally)');
          
          // Fall back to regular service account
          const auth = new google.auth.GoogleAuth({
            keyFile: 'service-account-key.json',
            scopes: [
              'https://www.googleapis.com/auth/drive',
              'https://www.googleapis.com/auth/spreadsheets'
            ]
          });
          
          this.auth = auth;
          this.drive = google.drive({ version: 'v3', auth: auth as any });
          this.sheets = google.sheets({ version: 'v4', auth: auth as any });
        } else {
          throw error;
        }
      }
      
    } catch (error) {
      console.error('Failed to initialize Google Drive:', error);
      throw error;
    }
  }
  
  /**
   * Setup folder structure in Google Drive
   */
  private async setupFolderStructure() {
    try {
      // Check if using shared folder from env
      if (process.env.GOOGLE_DRIVE_SHARED_FOLDER_ID) {
        this.netSheetsFolderId = process.env.GOOGLE_DRIVE_SHARED_FOLDER_ID;
        console.log('📁 Using existing shared folder');
        return;
      }
      
      // Create new folder structure
      const rootFolderName = 'Arkansas Contract Data';
      const rootQuery = `name='${rootFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      
      const rootSearch = await this.drive.files.list({
        q: rootQuery,
        fields: 'files(id, name)',
        spaces: 'drive'
      });
      
      let rootFolderId: string;
      
      if (rootSearch.data.files?.length > 0) {
        rootFolderId = rootSearch.data.files[0].id;
        console.log(`📁 Found existing folder: ${rootFolderName}`);
      } else {
        // Create root folder
        const rootFolder = await this.drive.files.create({
          requestBody: {
            name: rootFolderName,
            mimeType: 'application/vnd.google-apps.folder'
          },
          fields: 'id'
        });
        rootFolderId = rootFolder.data.id;
        console.log(`📁 Created folder: ${rootFolderName}`);
      }
      
      // Create Net Sheets subfolder
      const netSheetsFolderName = 'Net Sheets';
      const netSheetsQuery = `name='${netSheetsFolderName}' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      
      const netSheetsSearch = await this.drive.files.list({
        q: netSheetsQuery,
        fields: 'files(id, name)',
        spaces: 'drive'
      });
      
      if (netSheetsSearch.data.files?.length > 0) {
        this.netSheetsFolderId = netSheetsSearch.data.files[0].id;
        console.log(`📁 Found existing subfolder: ${netSheetsFolderName}`);
      } else {
        // Create Net Sheets subfolder
        const netSheetsFolder = await this.drive.files.create({
          requestBody: {
            name: netSheetsFolderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [rootFolderId]
          },
          fields: 'id'
        });
        this.netSheetsFolderId = netSheetsFolder.data.id;
        console.log(`📁 Created subfolder: ${netSheetsFolderName}`);
      }
      
    } catch (error) {
      console.error('Failed to setup folder structure:', error);
      // Continue without folders - files will be created in root
    }
  }
  
  /**
   * Create a new seller net sheet spreadsheet
   */
  async createSellerNetSheet(netSheetData: any, propertyAddress: string): Promise<any> {
    try {
      // Generate spreadsheet name
      const date = new Date().toISOString().split('T')[0];
      const cleanAddress = propertyAddress.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 50);
      const spreadsheetName = `Net Sheet - ${cleanAddress} - ${date}`;
      
      console.log(`📊 Creating spreadsheet: ${spreadsheetName}`);
      
      // Create spreadsheet
      const spreadsheet = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: spreadsheetName
          },
          sheets: [{
            properties: {
              title: 'Seller Net Sheet'
            }
          }]
        }
      });
      
      const spreadsheetId = spreadsheet.data.spreadsheetId!;
      console.log(`✅ Created spreadsheet with ID: ${spreadsheetId}`);
      
      // Move to folder if we have one
      if (this.netSheetsFolderId) {
        await this.drive.files.update({
          fileId: spreadsheetId,
          addParents: this.netSheetsFolderId,
          fields: 'id,parents'
        });
        console.log(`📁 Moved to Net Sheets folder`);
      }
      
      // Populate the spreadsheet
      await this.populateNetSheet(spreadsheetId, netSheetData, propertyAddress);
      
      // Get shareable link
      const file = await this.drive.files.get({
        fileId: spreadsheetId,
        fields: 'webViewLink,owners'
      });
      
      console.log(`👤 Owner: ${file.data.owners?.[0]?.emailAddress}`);
      console.log(`🔗 View at: ${file.data.webViewLink}`);
      
      // Make it publicly viewable
      try {
        await this.drive.permissions.create({
          fileId: spreadsheetId,
          requestBody: {
            type: 'anyone',
            role: 'reader'
          }
        });
        console.log('📌 Sheet is publicly viewable');
      } catch (error) {
        // Non-critical - sheet still works
      }
      
      return {
        spreadsheetId,
        spreadsheetName,
        shareableLink: file.data.webViewLink,
        folderId: this.netSheetsFolderId
      };
      
    } catch (error: any) {
      console.error('Failed to create seller net sheet:', error.message);
      throw error;
    }
  }
  
  /**
   * Populate the net sheet with data
   */
  private async populateNetSheet(spreadsheetId: string, netSheetData: any, propertyAddress: string) {
    try {
      const formatCurrency = (value: number) => {
        return value ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';
      };
      
      // Prepare data
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
        ['ESTIMATED NET TO SELLER', '', formatCurrency(netSheetData.cash_to_seller || 0)]
      ];
      
      // Update spreadsheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Seller Net Sheet!A1:C50',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values
        }
      });
      
      console.log('✅ Net sheet populated with data');
      
    } catch (error) {
      console.error('Failed to populate net sheet:', error);
      throw error;
    }
  }
  
  /**
   * Upload a file to Google Drive
   */
  async uploadFile(filePath: string, fileName: string, mimeType: string): Promise<{ fileId: string; webViewLink: string }> {
    try {
      const fs = require('fs');
      
      console.log(`📤 Uploading ${fileName}...`);
      
      const fileMetadata: any = {
        name: fileName,
        parents: this.netSheetsFolderId ? [this.netSheetsFolderId] : undefined
      };
      
      const media = {
        mimeType: mimeType,
        body: fs.createReadStream(filePath)
      };
      
      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, name, owners'
      });
      
      console.log(`✅ Uploaded: ${fileName}`);
      console.log(`👤 Owner: ${response.data.owners?.[0]?.emailAddress}`);
      console.log(`🔗 Link: ${response.data.webViewLink}`);
      
      return {
        fileId: response.data.id!,
        webViewLink: response.data.webViewLink!
      };
      
    } catch (error: any) {
      console.error(`❌ Failed to upload ${fileName}:`, error.message);
      throw error;
    }
  }
  
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    if (bytes < 0) return 'Unlimited';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export default GoogleDriveDelegation;