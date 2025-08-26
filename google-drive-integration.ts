/**
 * Google Drive Integration for Arkansas Contract Agent
 * Creates individual Google Sheets for each seller net sheet
 */

import { google } from 'googleapis';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

export class GoogleDriveIntegration {
  private drive: any;
  private sheets: any;
  private auth: any;
  private rootFolderId?: string;
  private netSheetsFolderId?: string;
  private sharedFolderId?: string;
  private sharedDriveId?: string;
  
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
      
      // Check if using Shared Drive
      if (process.env.GOOGLE_SHARED_DRIVE_ID) {
        this.sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID;
        console.log('📁 Using Shared Drive: Arkansas Contract Data');
        // Test access to Shared Drive
        try {
          const drive = await this.drive.drives.get({
            driveId: this.sharedDriveId
          });
          console.log(`✅ Connected to Shared Drive: ${drive.data.name}`);
        } catch (error: any) {
          console.error('❌ Could not access Shared Drive:', error.message);
        }
      } else if (process.env.GOOGLE_DRIVE_SHARED_FOLDER_ID) {
        this.sharedFolderId = process.env.GOOGLE_DRIVE_SHARED_FOLDER_ID;
        this.netSheetsFolderId = this.sharedFolderId;
        console.log('📁 Using shared Google Drive folder');
      } else {
        // Setup folder structure
        await this.setupFolderStructure();
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
      // Check if root folder exists
      const rootFolderName = 'Arkansas Contract Data';
      const rootQuery = `name='${rootFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      
      const rootSearch = await this.drive.files.list({
        q: rootQuery,
        fields: 'files(id, name)',
        spaces: 'drive'
      });
      
      if (rootSearch.data.files?.length > 0) {
        this.rootFolderId = rootSearch.data.files[0].id;
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
        this.rootFolderId = rootFolder.data.id;
        console.log(`📁 Created folder: ${rootFolderName}`);
      }
      
      // Check if Net Sheets subfolder exists
      const netSheetsFolderName = 'Net Sheets';
      const netSheetsQuery = `name='${netSheetsFolderName}' and '${this.rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      
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
            parents: [this.rootFolderId]
          },
          fields: 'id'
        });
        this.netSheetsFolderId = netSheetsFolder.data.id;
        console.log(`📁 Created subfolder: ${netSheetsFolderName}`);
      }
      
    } catch (error) {
      console.error('Failed to setup folder structure:', error);
      throw error;
    }
  }
  
  /**
   * Create a new seller net sheet spreadsheet
   */
  async createSellerNetSheet(netSheetData: any, propertyAddress: string, contractData?: any) {
    try {
      // Generate spreadsheet name
      const date = new Date().toISOString().split('T')[0];
      const cleanAddress = propertyAddress.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 50);
      const spreadsheetName = `Net Sheet - ${cleanAddress} - ${date}`;
      
      // Use Shared Drive if available, otherwise fall back to shared folder
      const useSharedDrive = !!this.sharedDriveId;
      const targetFolderId = this.sharedDriveId || this.sharedFolderId || this.netSheetsFolderId;
      
      if (!targetFolderId && !useSharedDrive) {
        throw new Error('No Shared Drive or shared folder configured.');
      }
      
      if (useSharedDrive) {
        console.log('📁 Creating sheet in Shared Drive (no quota limits)...');
      } else {
        console.log('📁 Creating sheet in shared folder...');
      }
      
      let spreadsheetId: string;
      
      // Create directly in shared folder - file will be owned by folder owner
      // This is the key insight from the Google documentation:
      // "A file created within a shared folder is owned by the owner of that folder"
      const fileMetadata = {
        name: spreadsheetName,
        mimeType: 'application/vnd.google-apps.spreadsheet',
        parents: [targetFolderId] // Critical: must be in shared folder
      };
      
      try {
        const driveResponse = await this.drive.files.create({
          requestBody: fileMetadata,
          fields: 'id, name, webViewLink, owners',
          supportsAllDrives: useSharedDrive  // Enable for Shared Drives
        });
        
        spreadsheetId = driveResponse.data.id;
        const owner = driveResponse.data.owners?.[0]?.emailAddress || 'unknown';
        
        console.log(`✅ Created spreadsheet: ${spreadsheetName}`);
        console.log(`   📁 In folder: ${targetFolderId}`);
        console.log(`   👤 Owner: ${owner} (storage counts against their quota)`);
        
      } catch (createError: any) {
        // If this still fails, it means the folder isn't properly shared
        if (createError.message?.includes('storageQuotaExceeded')) {
          console.error('❌ Storage quota exceeded even with shared folder approach.');
          console.error('   Possible causes:');
          console.error('   1. The folder owner (brian@searchnwa.com) is out of storage');
          console.error('   2. The folder is not properly shared with Editor permissions');
          console.error('   3. The service account is not creating in the shared folder');
          throw new Error('Cannot create Google Sheet - check folder sharing and owner storage');
        }
        throw createError;
      }
      
      // Populate the spreadsheet with net sheet data
      try {
        await this.populateNetSheet(spreadsheetId, netSheetData, propertyAddress, contractData);
      } catch (populateError: any) {
        console.error('❌ Failed to populate net sheet with data:', populateError.message);
        // Delete the empty sheet since it has no data
        try {
          await this.drive.files.delete({
            fileId: spreadsheetId,
            supportsAllDrives: useSharedDrive
          });
          console.log('🗑️ Deleted empty sheet');
        } catch (deleteError) {
          console.error('Could not delete empty sheet:', deleteError);
        }
        throw new Error(`Sheet created but could not add data: ${populateError.message}`);
      }
      
      // Get shareable link
      const shareableLink = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      
      // Note: No need to transfer ownership - the file is already owned by the folder owner
      // This is the beauty of the shared folder approach - ownership is automatic
      
      // Make it publicly viewable (optional - remove if you want private)
      try {
        await this.drive.permissions.create({
          fileId: spreadsheetId,
          requestBody: {
            type: 'anyone',
            role: 'reader'
          }
        });
        console.log('📌 Sheet is publicly viewable');
      } catch (permError) {
        // Non-critical error - sheet still works without public access
        console.log('ℹ️  Sheet is private (accessible via link)');
      }
      
      return {
        spreadsheetId,
        spreadsheetName,
        shareableLink,
        folderId: this.netSheetsFolderId
      };
      
    } catch (error) {
      console.error('Failed to create seller net sheet:', error);
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
      
      // Check if there's a tax warning
      const hasTaxWarning = netSheetData.taxWarning === true;
      
      // Prepare the data in vertical format matching Excel template
      const values = [
        ['SELLER NET SHEET'],
        [''],
        ['Property Address:', propertyAddress],
        ['Date:', new Date().toLocaleDateString()],
        [''],
        ['', '', ''], // Separator
        ['Sales Price', '', formatCurrency(netSheetData.sales_price || 0)],
        [''],
        ['LESS SELLER\'S COSTS:'],
        [''],
        ['Seller Concessions', '', formatCurrency(netSheetData.seller_concessions || 0)],
        [''],
        [hasTaxWarning ? 'Taxes Prorated *NEEDS VERIFICATION*' : 'Taxes Prorated', 
         `(${netSheetData.days_of_tax || 0} days @ ${formatCurrency(netSheetData.tax_per_day || 0)}/day)`, 
         formatCurrency(netSheetData.taxes_prorated || 0)],
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
        ['', '', ''], // Separator
        ['TOTAL COSTS', '', formatCurrency(netSheetData.total_costs || 0)],
        [''],
        ['', '', ''], // Separator
        ['ESTIMATED NET TO SELLER', '', formatCurrency(netSheetData.cash_to_seller || 0)],
        [''],
        [''],
        ['NOTES:'],
        ['• This is an estimate only. Actual costs may vary.'],
        ['• Please consult with your real estate professional and closing attorney for exact figures.'],
        ['• Tax calculations based on annual taxes of $3,650 (configurable)'],
        ['• Commission rate assumed at 3% (negotiable)'],
        [''],
        ['Generated by Arkansas Contract Agent'],
        [`Created: ${new Date().toLocaleString()}`]
      ];
      
      // Update the spreadsheet - use Sheet1 (default sheet name)
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
      
      // If there's a tax warning, add red formatting to the tax row
      if (hasTaxWarning) {
        await this.applyTaxWarningFormat(spreadsheetId);
      }
      
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
        },
        // Format title
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 3
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'CENTER',
                backgroundColor: {
                  red: 0.2,
                  green: 0.4,
                  blue: 0.8
                },
                textFormat: {
                  foregroundColor: {
                    red: 1,
                    green: 1,
                    blue: 1
                  },
                  fontSize: 18,
                  bold: true
                }
              }
            },
            fields: 'userEnteredFormat'
          }
        },
        // Merge title cells
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 3
            },
            mergeType: 'MERGE_ALL'
          }
        },
        // Format "ESTIMATED NET TO SELLER" row
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 35,
              endRowIndex: 36,
              startColumnIndex: 0,
              endColumnIndex: 3
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  fontSize: 14,
                  bold: true
                },
                backgroundColor: {
                  red: 0.85,
                  green: 0.92,
                  blue: 0.83
                }
              }
            },
            fields: 'userEnteredFormat'
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
   * Apply tax warning formatting to the spreadsheet
   */
  private async applyTaxWarningFormat(spreadsheetId: string) {
    try {
      // Find the row with taxes (approximately row 13)
      const taxRowRequests = [
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 12, // Row 13 (0-indexed)
              endRowIndex: 13,
              startColumnIndex: 0,
              endColumnIndex: 3
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 1,
                  green: 0.92,
                  blue: 0.92
                },
                textFormat: {
                  foregroundColor: {
                    red: 0.8,
                    green: 0,
                    blue: 0
                  },
                  bold: true
                }
              }
            },
            fields: 'userEnteredFormat'
          }
        }
      ];
      
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: taxRowRequests
        }
      });
      
      console.log('⚠️  Tax warning formatting applied');
    } catch (error) {
      console.error('Failed to apply tax warning format:', error);
    }
  }
  
  /**
   * Upload a file to Google Drive
   */
  async uploadFile(filePath: string, fileName: string, mimeType: string, folderId?: string): Promise<{ fileId: string; webViewLink: string }> {
    try {
      const fs = require('fs');
      const targetFolderId = folderId || this.sharedFolderId || this.netSheetsFolderId;
      const useSharedDrive = targetFolderId === this.sharedDriveId;
      
      console.log(`📤 Uploading ${fileName} to Google Drive...`);
      
      const fileMetadata: any = {
        name: fileName,
        parents: targetFolderId ? [targetFolderId] : undefined
      };
      
      const media = {
        mimeType: mimeType,
        body: fs.createReadStream(filePath)
      };
      
      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, name, owners',
        supportsAllDrives: useSharedDrive  // Enable for Shared Drives
      });
      
      const owner = response.data.owners?.[0]?.emailAddress || 'unknown';
      console.log(`✅ Uploaded: ${fileName}`);
      console.log(`   📁 Folder: ${targetFolderId || 'root'}`);
      console.log(`   👤 Owner: ${owner}`);
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
   * Upload PDF and CSV net sheets to Google Drive
   */
  async uploadNetSheetFiles(pdfPath?: string, csvPath?: string): Promise<{ pdfLink?: string; csvLink?: string }> {
    const results: { pdfLink?: string; csvLink?: string } = {};
    
    try {
      // Use Shared Drive if available, otherwise use shared folder
      const targetFolderId = this.sharedDriveId || this.sharedFolderId || this.netSheetsFolderId;
      
      // Upload PDF if available
      if (pdfPath) {
        const path = require('path');
        const pdfFileName = path.basename(pdfPath);
        const pdfUpload = await this.uploadFile(
          pdfPath,
          pdfFileName,
          'application/pdf',
          targetFolderId
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
          'text/csv',
          targetFolderId
        );
        results.csvLink = csvUpload.webViewLink;
      }
      
      return results;
      
    } catch (error) {
      console.error('Failed to upload net sheet files:', error);
      return results; // Return partial results if some uploads succeeded
    }
  }
  
  /**
   * Create or update master tracking spreadsheet
   */
  async updateMasterList(contractData: any, netSheetLink: string) {
    // This could maintain a master list of all contracts
    // Implementation optional based on user needs
    console.log('📝 Master list update skipped (optional feature)');
  }
}

// Export for use in other modules
export default GoogleDriveIntegration;