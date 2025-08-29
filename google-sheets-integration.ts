/**
 * Google Sheets Integration for Arkansas Contract Agent
 * Saves extraction results and seller net sheets to Google Sheets
 */

import { google } from 'googleapis';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { getGoogleCredentials } from './google-auth-helper';

dotenv.config();

export class GoogleSheetsIntegration {
  private sheets: any;
  private spreadsheetId: string;
  
  constructor(spreadsheetId: string) {
    this.spreadsheetId = spreadsheetId;
  }
  
  /**
   * Initialize Google Sheets API with service account or OAuth
   */
  async initialize() {
    try {
      // Use service account authentication with helper
      const credentialsPath = getGoogleCredentials();
      if (!credentialsPath) {
        throw new Error('No Google credentials available');
      }
      
      const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      
      this.sheets = google.sheets({ version: 'v4', auth: auth as any });
      
      console.log('✅ Google Sheets API initialized');
    } catch (error) {
      console.error('Failed to initialize Google Sheets:', error);
      throw error;
    }
  }
  
  /**
   * Create headers for contract data sheet
   */
  private getContractHeaders(): string[] {
    return [
      'Timestamp',
      'Contract ID',
      'Property Address',
      'Buyer Name',
      'Purchase Price',
      'Cash Amount',
      'Financing Type',
      'Closing Date',
      'Earnest Money',
      'Home Warranty',
      'Warranty Amount',
      'Title Option',
      'Para 13 Items Included',
      'Para 13 Items Excluded',
      'Para 32 Other Terms',
      'Seller Concessions',
      'Extraction Rate',
      'Processing Source',
      'Selling Agent Name',
      'Selling Agent License',
      'Selling Agent Email',
      'Selling Agent Phone'
    ];
  }
  
  /**
   * Create vertical headers for seller net sheet (based on Excel template)
   */
  private getVerticalNetSheetLabels(): any[][] {
    return [
      ['Seller Net Sheet', '', 'Calculation Notes'],
      [''],
      ['Sales Price', '', 'From contract purchase price'],
      [''],
      ['Seller Concessions', '', 'From paragraph 5 of contract'],
      [''],
      ['Taxes Prorated', '', 'Annual taxes ÷ 365 × days to closing'],
      [''],
      ['Commission Seller', '', '3% of sales price (configurable)'],
      [''],
      ['Buyer Agency Fees', '', 'From paragraph 32'],
      [''],
      ['Closing Fee', '', 'Standard fee: $400'],
      [''],
      ['Title Search', '', 'Standard fee: $300'],
      [''],
      ['Title Insurance', '', 'Based on Para 10 (A or B) and price'],
      [''],
      ['Title & Recording Fees', '', 'Standard fee: $100'],
      [''],
      ['Pest Transfer', '', 'Standard fee: $450'],
      [''],
      ['Tax Stamps', '', 'Purchase price × 0.0033 ÷ 2'],
      [''],
      ['Home Warranty', '', 'From paragraph 15'],
      [''],
      ['Total Costs', '', 'Sum of all costs above'],
      [''],
      [''],
      ['Cash to Seller', '', 'Sales price minus total costs'],
      [''],
      ['Property Address', ''],
      ['Contract Date', ''],
      ['Days of Tax', '', 'Number of days for tax proration'],
      ['Tax Per Day', '', 'Annual taxes ÷ 365']
    ];
  }
  
  /**
   * Append contract extraction data to sheet
   */
  async appendContractData(contractData: any, source: string = 'Manual') {
    try {
      const timestamp = new Date().toISOString();
      const contractId = Date.now().toString();
      
      // Prepare row data
      const rowData = [
        timestamp,
        contractId,
        contractData.property_address || '',
        contractData.buyer_name || '',
        contractData.purchase_price || '',
        contractData.cash_amount || '',
        contractData.financing_type || '',
        contractData.closing_date || '',
        contractData.earnest_money_amount || '',
        contractData.home_warranty || '',
        contractData.warranty_amount || '',
        contractData.title_option || '',
        contractData.para13_items_included || '',
        contractData.para13_items_excluded || '',
        contractData.para32_other_terms || '',
        contractData.seller_concessions || contractData.para5_custom_text || '',
        contractData.extractionRate || '',
        source,
        contractData.selling_agent_name || '',
        contractData.selling_agent_license || '',
        contractData.selling_agent_email || '',
        contractData.selling_agent_phone || ''
      ];
      
      // Append to Contracts sheet
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Contracts!A:V',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData]
        }
      });
      
      console.log('✅ Contract data saved to Google Sheets');
      return contractId;
      
    } catch (error) {
      console.error('Failed to append contract data:', error);
      throw error;
    }
  }
  
  /**
   * Append seller net sheet data vertically (one column per contract)
   */
  async appendNetSheetData(netSheetData: any, contractId: string, propertyAddress: string) {
    try {
      const timestamp = new Date().toISOString();
      
      // Format currency
      const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2
        }).format(value || 0);
      };
      
      // Prepare column data (vertical format)
      const columnData = [
        timestamp,  // Row 1: Timestamp instead of "Seller Net Sheet"
        '',         // Row 2: blank
        formatCurrency(netSheetData.sales_price || 0),
        '',
        formatCurrency(netSheetData.seller_concessions || 0),
        '',
        formatCurrency(netSheetData.taxes_prorated || 0),
        '',
        formatCurrency(netSheetData.commission_seller || 0),
        '',
        formatCurrency(netSheetData.buyer_agency_fees || 0),
        '',
        formatCurrency(netSheetData.closing_fee || 0),
        '',
        formatCurrency(netSheetData.title_search || 0),
        '',
        formatCurrency(netSheetData.title_insurance || 0),
        '',
        formatCurrency(netSheetData.title_recording_fees || 0),
        '',
        formatCurrency(netSheetData.pest_transfer || 0),
        '',
        formatCurrency(netSheetData.tax_stamps || 0),
        '',
        formatCurrency(netSheetData.home_warranty || 0),
        '',
        formatCurrency(netSheetData.total_costs || 0),
        '',
        '',
        formatCurrency(netSheetData.cash_to_seller || 0),
        '',
        propertyAddress,
        netSheetData.calculation_date ? new Date(netSheetData.calculation_date).toLocaleDateString() : '',
        netSheetData.days_of_tax || 0,
        formatCurrency(netSheetData.tax_per_day || 0)
      ];
      
      // Get current sheet data to find next available column
      const currentData = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'NetSheets!A1:ZZ1'
      });
      
      // Find next column (D, E, F, etc. - skipping A, B, C for labels and notes)
      const nextColumn = String.fromCharCode(68 + (currentData.data.values?.[0]?.length || 3) - 3); // Start at column D
      
      // Update the column with net sheet data
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `NetSheets!${nextColumn}1:${nextColumn}35`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: columnData.map(value => [value])
        }
      });
      
      console.log(`✅ Net sheet saved to column ${nextColumn} in vertical format`);
      
    } catch (error) {
      console.error('Failed to append net sheet data:', error);
      throw error;
    }
  }
  
  /**
   * Initialize sheets with headers if they don't exist
   */
  async initializeSheets() {
    try {
      // Check if sheets exist
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      const sheetNames = spreadsheet.data.sheets.map((sheet: any) => sheet.properties.title);
      
      // Create Contracts sheet if it doesn't exist
      if (!sheetNames.includes('Contracts')) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'Contracts'
                }
              }
            }]
          }
        });
        
        // Add headers
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Contracts!A1:V1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [this.getContractHeaders()]
          }
        });
      }
      
      // Create NetSheets sheet if it doesn't exist
      if (!sheetNames.includes('NetSheets')) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'NetSheets'
                }
              }
            }]
          }
        });
        
        // Add vertical labels and notes (columns A, B, C)
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'NetSheets!A1:C35',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: this.getVerticalNetSheetLabels()
          }
        });
      }
      
      console.log('✅ Google Sheets initialized with headers');
      
    } catch (error) {
      console.error('Failed to initialize sheets:', error);
      throw error;
    }
  }
  
  /**
   * Process and save both contract and net sheet data
   */
  async saveCompleteExtraction(contractData: any, netSheetData: any, source: string = 'Manual') {
    try {
      // Save contract data and get ID
      const contractId = await this.appendContractData(contractData, source);
      
      // Save net sheet data
      await this.appendNetSheetData(
        netSheetData, 
        contractId, 
        contractData.property_address || 'Unknown Property'
      );
      
      console.log(`\n✅ Complete extraction saved to Google Sheets`);
      console.log(`   Contract ID: ${contractId}`);
      console.log(`   Spreadsheet: https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`);
      
      return contractId;
      
    } catch (error) {
      console.error('Failed to save complete extraction:', error);
      throw error;
    }
  }
  
  /**
   * Get recent extractions from the sheet
   */
  async getRecentExtractions(limit: number = 10) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `Contracts!A2:V${limit + 1}`
      });
      
      const rows = response.data.values || [];
      
      return rows.map((row: any[]) => ({
        timestamp: row[0],
        contractId: row[1],
        propertyAddress: row[2],
        buyerName: row[3],
        purchasePrice: row[4],
        extractionRate: row[16],
        source: row[17]
      }));
      
    } catch (error) {
      console.error('Failed to get recent extractions:', error);
      return [];
    }
  }
}

// Export for use in other modules
export default GoogleSheetsIntegration;