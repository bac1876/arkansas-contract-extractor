/**
 * Listing Info Service - Simple Version
 * Fetches property-specific taxes and commission data from public Google Sheets
 * Uses CSV export (no authentication required)
 */

import * as dotenv from 'dotenv';

dotenv.config();

export interface ListingInfo {
  address: string;
  annualTaxes: number;
  commissionPercent: number;
}

export class ListingInfoService {
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
    console.log('🔄 Initializing ListingInfoService (Simple CSV version)...');
    console.log(`📁 Sheet ID: ${this.spreadsheetId}`);
    
    try {
      // Use CSV export URL for public sheets (no auth required!)
      const exportUrl = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/export?format=csv&gid=0`;
      console.log('📥 Fetching data from public Google Sheet (CSV export)...');
      
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const csvData = await response.text();
      console.log(`📨 Received CSV data (${csvData.length} characters)`);
      
      // Parse CSV data
      const lines = csvData.split('\n').filter(line => line.trim());
      console.log(`📝 Raw data rows received: ${lines.length}`);
      
      // Skip header row and parse data
      this.listingData = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple CSV parsing (handles basic format without quotes)
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
          this.listingData.push({
            address: parts[0].toLowerCase(),
            annualTaxes: parseFloat(parts[1].replace(/[^0-9.]/g, '')),
            commissionPercent: parseFloat(parts[2].replace(/[^0-9.]/g, '')) / 100
          });
        }
      }
      
      this.initialized = true;
      console.log(`✅ Successfully loaded ${this.listingData.length} property listings`);
      
      // Log first few listings for verification
      if (this.listingData.length > 0) {
        console.log('📋 Sample listings loaded:');
        this.listingData.slice(0, 3).forEach(listing => {
          console.log(`   - ${listing.address}: Tax=$${listing.annualTaxes}, Commission=${(listing.commissionPercent * 100).toFixed(1)}%`);
        });
      } else {
        console.log('⚠️  WARNING: No listings were loaded from the Google Sheet!');
      }
    } catch (error: any) {
      console.error('❌ Failed to initialize ListingInfoService:');
      console.error('   Error message:', error.message);
      // Continue without the service - will use defaults
      this.initialized = false;
      this.listingData = [];
      console.log('⚠️  ListingInfoService will use default values for all properties');
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
    
    // Try to find a match using multiple strategies
    for (const listing of this.listingData) {
      const listingNorm = this.normalizeAddress(listing.address);
      
      // Strategy 1: Exact match on number and street (case-insensitive)
      if (listingNorm.number && listingNorm.street && 
          inputNorm.number === listingNorm.number && 
          inputNorm.street.toLowerCase() === listingNorm.street.toLowerCase()) {
        console.log(`✅ Found listing match: "${listing.address}" for property "${fullAddress}"`);
        console.log(`   📊 Taxes: $${listing.annualTaxes}, Commission: ${(listing.commissionPercent * 100).toFixed(1)}%`);
        return listing;
      }
      
      // Strategy 2: Number matches and street name starts with same word
      // This handles "890 Clark" matching "890 Clark Cir"
      if (listingNorm.number && inputNorm.number === listingNorm.number) {
        const inputStreetWords = inputNorm.full.split(' ').filter(w => w && w !== inputNorm.number);
        const listingStreetWords = listingNorm.full.split(' ').filter(w => w && w !== listingNorm.number);
        
        if (inputStreetWords.length > 0 && listingStreetWords.length > 0) {
          // Check if first street word matches (e.g., "clark" matches in both)
          if (inputStreetWords[0] === listingStreetWords[0]) {
            console.log(`✅ Found listing match (partial street): "${listing.address}" for property "${fullAddress}"`);
            console.log(`   📊 Taxes: $${listing.annualTaxes}, Commission: ${(listing.commissionPercent * 100).toFixed(1)}%`);
            return listing;
          }
          
          // Also check if the listing address is contained at the start of the input
          // This handles "890 clark" in sheet matching "890 clark cir bentonville ar 72713" from PDF
          const listingFullNorm = listingStreetWords.join(' ');
          const inputFullNorm = inputStreetWords.join(' ');
          if (inputFullNorm.startsWith(listingFullNorm)) {
            console.log(`✅ Found listing match (prefix match): "${listing.address}" for property "${fullAddress}"`);
            console.log(`   📊 Taxes: $${listing.annualTaxes}, Commission: ${(listing.commissionPercent * 100).toFixed(1)}%`);
            return listing;
          }
        }
      }
      
      // Strategy 3: Check if the full simplified addresses contain each other
      // This handles cases like "3312 Alliance" matching variations
      if (inputNorm.full.includes(listingNorm.full) || listingNorm.full.includes(inputNorm.full)) {
        console.log(`✅ Found listing match (contains): "${listing.address}" for property "${fullAddress}"`);
        console.log(`   📊 Taxes: $${listing.annualTaxes}, Commission: ${(listing.commissionPercent * 100).toFixed(1)}%`);
        return listing;
      }
      
      // Strategy 4: Check if listing address is at the start of input address
      // This handles "890 clark" matching "890 clark cir bentonville ar 72713"
      if (inputNorm.full.startsWith(listingNorm.full)) {
        console.log(`✅ Found listing match (starts with): "${listing.address}" for property "${fullAddress}"`);
        console.log(`   📊 Taxes: $${listing.annualTaxes}, Commission: ${(listing.commissionPercent * 100).toFixed(1)}%`);
        return listing;
      }
    }

    console.log(`⚠️  No listing data found for: "${fullAddress}" - using defaults`);
    console.log(`   Normalized to: "${inputNorm.number} ${inputNorm.street}"`);
    console.log(`   Available listings: ${this.listingData.slice(0, 3).map(l => l.address).join(', ')}${this.listingData.length > 3 ? '...' : ''}`);
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