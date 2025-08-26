/**
 * Listing Info Service
 * Fetches property-specific taxes and commission data from Google Sheets
 */

import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

export interface ListingInfo {
  address: string;
  annualTaxes: number;
  commissionPercent: number;
}

export class ListingInfoService {
  private sheets: any;
  private spreadsheetId: string;
  private listingData: ListingInfo[] = [];
  private initialized: boolean = false;

  constructor() {
    this.spreadsheetId = process.env.LISTING_INFO_SHEET_ID || '1OQCak69VSAuAlP3B1PxeRepLXsD5Kn5l2MF-Czjklxw';
  }

  /**
   * Initialize the service and fetch all listing data
   */
  async initialize(): Promise<void> {
    try {
      // Setup Google Sheets API
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'service-account-key.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });

      this.sheets = google.sheets({ version: 'v4', auth: auth as any });

      // Fetch all data from the sheet
      await this.refreshData();
      this.initialized = true;
      
      console.log(`📊 Loaded ${this.listingData.length} property listings with tax and commission data`);
    } catch (error) {
      console.error('Failed to initialize ListingInfoService:', error);
      // Continue without the service - will use defaults
      this.initialized = false;
    }
  }

  /**
   * Refresh data from the Google Sheet
   */
  async refreshData(): Promise<void> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A2:C100' // Skip header row, get up to 100 properties
      });

      if (response.data.values && response.data.values.length > 0) {
        this.listingData = response.data.values
          .filter((row: any[]) => row.length >= 3 && row[0] && row[1] && row[2])
          .map((row: any[]) => ({
            address: String(row[0]).trim().toLowerCase(),
            annualTaxes: parseFloat(String(row[1]).replace(/[^0-9.]/g, '')),
            // Convert percentage to decimal (2.5 becomes 0.025)
            commissionPercent: parseFloat(String(row[2]).replace(/[^0-9.]/g, '')) / 100
          }));
      }
    } catch (error) {
      console.error('Failed to refresh listing data:', error);
    }
  }

  /**
   * Normalize an address for matching by extracting key components
   */
  private normalizeAddress(address: string): { number: string; street: string; full: string } {
    const normalized = address.toLowerCase().trim();
    
    // Remove common suffixes and directions for matching
    // This helps "1199 Splash" match "1199 S Splash Dr"
    const simplified = normalized
      .replace(/\b(dr|drive|st|street|ave|avenue|rd|road|ln|lane|ct|court|pl|place|blvd|boulevard|way|circle|cir)\b/gi, '')
      .replace(/\b(north|south|east|west|n|s|e|w)\b/gi, '')
      .replace(/[,.]|suite.*|apt.*|unit.*/gi, '') // Remove punctuation and unit numbers
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    
    // Extract street number and primary street name
    const parts = simplified.split(' ').filter(p => p.length > 0);
    const number = parts[0] || '';
    const street = parts[1] || '';
    
    return { number, street, full: simplified };
  }

  /**
   * Look up property info by address
   * @param fullAddress The full property address from the contract
   * @returns ListingInfo if found, null otherwise
   */
  lookupProperty(fullAddress: string): ListingInfo | null {
    if (!this.initialized || !fullAddress) {
      return null;
    }

    // Normalize the input address
    const inputNorm = this.normalizeAddress(fullAddress);
    
    // Try to find a match
    for (const listing of this.listingData) {
      const listingNorm = this.normalizeAddress(listing.address);
      
      // Match if street number and primary street name match
      if (listingNorm.number && listingNorm.street && 
          inputNorm.number === listingNorm.number && 
          inputNorm.street === listingNorm.street) {
        console.log(`✅ Found listing match: "${listing.address}" for property "${fullAddress}"`);
        console.log(`   📊 Taxes: $${listing.annualTaxes}, Commission: ${(listing.commissionPercent * 100).toFixed(1)}%`);
        return listing;
      }
      
      // Also check if the full simplified addresses contain each other
      // This handles cases like "3312 Alliance" matching variations
      if (inputNorm.full.includes(listingNorm.full) || listingNorm.full.includes(inputNorm.full)) {
        console.log(`✅ Found listing match: "${listing.address}" for property "${fullAddress}"`);
        console.log(`   📊 Taxes: $${listing.annualTaxes}, Commission: ${(listing.commissionPercent * 100).toFixed(1)}%`);
        return listing;
      }
    }

    console.log(`⚠️  No listing data found for: "${fullAddress}" - using defaults`);
    console.log(`   Normalized to: "${inputNorm.number} ${inputNorm.street}"`);
    return null;
  }

  /**
   * Get taxes and commission for a property, with defaults
   */
  getPropertyData(fullAddress: string, defaults: { taxes: number; commission: number }): { 
    annualTaxes: number; 
    commissionPercent: number; 
    source: 'listing' | 'default';
    taxWarning: boolean;
  } {
    const listing = this.lookupProperty(fullAddress);
    
    if (listing) {
      return {
        annualTaxes: listing.annualTaxes,
        commissionPercent: listing.commissionPercent,
        source: 'listing',
        taxWarning: false
      };
    }

    // For non-matching properties: use 3% commission, flag tax as needing attention
    console.log(`⚠️  ATTENTION: No tax data for "${fullAddress}" - NEEDS MANUAL VERIFICATION`);
    return {
      annualTaxes: defaults.taxes,
      commissionPercent: 0.03, // Always use 3% (as decimal) for commission when no match
      source: 'default',
      taxWarning: true // Flag that taxes need verification
    };
  }
}

// Export singleton instance
export default ListingInfoService;