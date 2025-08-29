/**
 * Validation logic for extracted contract data
 * Helps detect mismatches between filename and content
 */

export class ExtractionValidator {
  
  /**
   * Validate that extracted address matches filename hints
   */
  static validatePropertyAddress(
    filename: string, 
    extractedAddress: string
  ): { valid: boolean; warning?: string } {
    
    if (!extractedAddress) {
      return { 
        valid: false, 
        warning: 'No property address extracted' 
      };
    }
    
    // Clean up filename for comparison
    const filenameLower = filename.toLowerCase()
      .replace(/\.pdf$/i, '')
      .replace(/[_-]/g, ' ')
      .replace(/\d{10,}/, '') // Remove timestamps
      .trim();
    
    const addressLower = extractedAddress.toLowerCase();
    
    // Extract potential address components from filename
    const filenameWords = filenameLower.split(/\s+/);
    
    // Look for street number and name patterns
    const streetNumberMatch = filenameLower.match(/\b\d{1,5}\b/);
    const potentialStreetName = filenameWords.find(word => 
      word.length > 3 && 
      !['offer', 'contract', 'test', 'final', 'draft', 'signed'].includes(word)
    );
    
    // Check for major discrepancies
    if (streetNumberMatch && potentialStreetName) {
      const filenameStreetNumber = streetNumberMatch[0];
      
      // Check if the extracted address contains the street number from filename
      if (!addressLower.includes(filenameStreetNumber)) {
        // This is likely a mismatch
        return {
          valid: false,
          warning: `⚠️ FILENAME MISMATCH: Filename suggests "${filenameStreetNumber} ${potentialStreetName}" but extracted "${extractedAddress}". This may be the wrong PDF or a mislabeled file.`
        };
      }
      
      // Check if street name matches
      if (potentialStreetName && !addressLower.includes(potentialStreetName)) {
        return {
          valid: false,
          warning: `⚠️ POSSIBLE MISMATCH: Filename mentions "${potentialStreetName}" but extracted address is "${extractedAddress}"`
        };
      }
    }
    
    // If we can't determine from filename, consider it valid but flag for review
    if (!streetNumberMatch && !potentialStreetName) {
      return {
        valid: true,
        warning: `ℹ️ Could not verify address from filename. Extracted: ${extractedAddress}`
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate all extraction results
   */
  static validateExtraction(
    filename: string,
    extractionData: any
  ): { 
    valid: boolean; 
    warnings: string[];
    critical: boolean;
  } {
    const warnings: string[] = [];
    let critical = false;
    
    // Validate property address
    const addressValidation = this.validatePropertyAddress(
      filename, 
      extractionData.property_address
    );
    
    if (!addressValidation.valid) {
      warnings.push(addressValidation.warning || 'Property address validation failed');
      critical = true; // Address mismatch is critical
    } else if (addressValidation.warning) {
      warnings.push(addressValidation.warning);
    }
    
    // Validate purchase price (check both purchase_price and cash_amount for cash deals)
    if ((!extractionData.purchase_price || extractionData.purchase_price <= 0) && 
        (!extractionData.cash_amount || extractionData.cash_amount <= 0)) {
      warnings.push('⚠️ No valid purchase price extracted');
    }
    
    // Validate buyers
    if (!extractionData.buyers || 
        (Array.isArray(extractionData.buyers) && extractionData.buyers.length === 0)) {
      warnings.push('⚠️ No buyers extracted');
    }
    
    // Validate critical paragraph selections
    if (!extractionData.para3_option_checked) {
      warnings.push('⚠️ Paragraph 3 financing option not identified');
    }
    
    // Check extraction completeness
    const fieldsExtracted = Object.values(extractionData)
      .filter(v => v !== null && v !== undefined && v !== '').length;
    const extractionRate = (fieldsExtracted / 41) * 100;
    
    if (extractionRate < 50) {
      warnings.push(`⚠️ Low extraction rate: ${extractionRate.toFixed(0)}% (${fieldsExtracted}/41 fields)`);
    }
    
    return {
      valid: !critical,
      warnings: warnings,
      critical: critical
    };
  }
  
  /**
   * Generate validation report
   */
  static generateReport(
    filename: string,
    extractionData: any
  ): string {
    const validation = this.validateExtraction(filename, extractionData);
    
    let report = '\n📋 EXTRACTION VALIDATION REPORT\n';
    report += '=' + '='.repeat(40) + '\n\n';
    report += `📄 File: ${filename}\n`;
    report += `🏠 Extracted Address: ${extractionData.property_address || 'MISSING'}\n`;
    report += `💰 Purchase Price: $${((extractionData.purchase_price || extractionData.cash_amount || 0)).toLocaleString()}\n`;
    report += `👥 Buyers: ${Array.isArray(extractionData.buyers) ? extractionData.buyers.join(', ') : extractionData.buyers || 'MISSING'}\n`;
    report += '\n';
    
    if (validation.warnings.length > 0) {
      report += '⚠️  WARNINGS:\n';
      validation.warnings.forEach(warning => {
        report += `   ${warning}\n`;
      });
      report += '\n';
    }
    
    if (validation.critical) {
      report += '🚨 CRITICAL ISSUES DETECTED - MANUAL REVIEW REQUIRED\n';
      report += 'This extraction may be from the wrong PDF or have serious errors.\n';
    } else if (validation.valid) {
      report += '✅ Extraction appears valid\n';
    }
    
    report += '=' + '='.repeat(40) + '\n';
    
    return report;
  }
}

export default ExtractionValidator;