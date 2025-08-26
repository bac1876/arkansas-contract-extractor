/**
 * Utility functions for Arkansas Contract Extraction
 * Handles common operations and validations
 */

export interface ContractData {
  purchase_price: number | null;
  cash_amount: number | null;
  para3_option_checked?: string;
  [key: string]: any;
}

/**
 * Gets the actual purchase amount regardless of transaction type
 * 
 * IMPORTANT: In Arkansas contracts, the purchase amount is in ONE of two fields:
 * - purchase_price: Used for financed purchases (para3 option 3A)
 * - cash_amount: Used for cash purchases (para3 option 3C)
 * 
 * One will always be null depending on the transaction type.
 * This is NOT an error - it's the expected behavior.
 */
export function getActualPurchaseAmount(data: ContractData): number | null {
  // Return whichever one has a value
  return data.purchase_price || data.cash_amount || null;
}

/**
 * Determines transaction type from para3 option
 */
export function getTransactionType(para3Option: string | undefined): 'FINANCED' | 'CASH' | 'LOAN_ASSUMPTION' | 'UNKNOWN' {
  switch (para3Option) {
    case '3A':
      return 'FINANCED';
    case '3B':
      return 'LOAN_ASSUMPTION';
    case '3C':
      return 'CASH';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Validates that purchase amount fields are correctly set based on transaction type
 * 
 * @returns true if valid, false if there's an actual error
 */
export function validatePurchaseAmounts(data: ContractData): {
  valid: boolean;
  message: string;
} {
  const transactionType = getTransactionType(data.para3_option_checked);
  
  // For financed transactions (3A)
  if (transactionType === 'FINANCED') {
    if (data.purchase_price && data.purchase_price > 0) {
      if (data.cash_amount && data.cash_amount > 0) {
        return {
          valid: false,
          message: 'ERROR: Both purchase_price and cash_amount are set for financed transaction'
        };
      }
      return {
        valid: true,
        message: `✅ Financed purchase for $${data.purchase_price.toLocaleString()}`
      };
    } else {
      return {
        valid: false,
        message: 'ERROR: Missing purchase_price for financed transaction (3A)'
      };
    }
  }
  
  // For cash transactions (3C)
  if (transactionType === 'CASH') {
    if (data.cash_amount && data.cash_amount > 0) {
      if (data.purchase_price && data.purchase_price > 0) {
        return {
          valid: false,
          message: 'ERROR: Both purchase_price and cash_amount are set for cash transaction'
        };
      }
      return {
        valid: true,
        message: `✅ Cash purchase for $${data.cash_amount.toLocaleString()}`
      };
    } else {
      return {
        valid: false,
        message: 'ERROR: Missing cash_amount for cash transaction (3C)'
      };
    }
  }
  
  // For loan assumption (3B)
  if (transactionType === 'LOAN_ASSUMPTION') {
    const amount = getActualPurchaseAmount(data);
    if (amount) {
      return {
        valid: true,
        message: `✅ Loan assumption for $${amount.toLocaleString()}`
      };
    } else {
      return {
        valid: false,
        message: 'ERROR: Missing purchase amount for loan assumption (3B)'
      };
    }
  }
  
  // Unknown transaction type
  return {
    valid: false,
    message: 'ERROR: Unable to determine transaction type from para3_option_checked'
  };
}

/**
 * Calculates extraction success rate with proper understanding of purchase fields
 * 
 * @param data The extracted contract data
 * @param expectedFields List of field names that should be extracted
 * @returns Object with extraction metrics
 */
export function calculateExtractionRate(
  data: ContractData, 
  expectedFields: string[]
): {
  fieldsExtracted: number;
  totalFields: number;
  extractionRate: string;
  missingFields: string[];
} {
  let fieldsExtracted = 0;
  const missingFields: string[] = [];
  
  // Adjust expected fields based on transaction type
  const transactionType = getTransactionType(data.para3_option_checked);
  let adjustedExpectedFields = [...expectedFields];
  
  if (transactionType === 'FINANCED') {
    // Remove cash_amount from expected fields for financed
    adjustedExpectedFields = adjustedExpectedFields.filter(f => f !== 'cash_amount');
  } else if (transactionType === 'CASH') {
    // Remove purchase_price from expected fields for cash
    adjustedExpectedFields = adjustedExpectedFields.filter(f => f !== 'purchase_price');
  }
  
  // Count extracted fields
  for (const field of adjustedExpectedFields) {
    const value = data[field];
    if (value !== null && value !== undefined && value !== '') {
      fieldsExtracted++;
    } else {
      missingFields.push(field);
    }
  }
  
  const totalFields = adjustedExpectedFields.length;
  const rate = totalFields > 0 ? Math.round((fieldsExtracted / totalFields) * 100) : 0;
  
  return {
    fieldsExtracted,
    totalFields,
    extractionRate: `${rate}%`,
    missingFields
  };
}

/**
 * Formats extraction results for display with proper purchase amount handling
 */
export function formatExtractionSummary(data: ContractData): string {
  const amount = getActualPurchaseAmount(data);
  const validation = validatePurchaseAmounts(data);
  
  let summary = '📊 Extraction Summary:\n';
  summary += '='.repeat(40) + '\n';
  
  // Basic info
  if (data.buyers) {
    summary += `👥 Buyers: ${Array.isArray(data.buyers) ? data.buyers.join(', ') : data.buyers}\n`;
  }
  if (data.property_address) {
    summary += `🏠 Property: ${data.property_address}\n`;
  }
  
  // Purchase details with validation
  summary += `💰 Transaction: ${validation.message}\n`;
  if (!validation.valid) {
    summary += `⚠️  VALIDATION ERROR: Check paragraph 3 extraction\n`;
  }
  
  // Other key fields
  if (data.para13_items_included) {
    summary += `📦 Included: ${data.para13_items_included}\n`;
  }
  if (data.para13_items_excluded) {
    summary += `❌ Excluded: ${data.para13_items_excluded}\n`;
  }
  
  return summary;
}

// Export all functions as default object for convenience
export default {
  getActualPurchaseAmount,
  getTransactionType,
  validatePurchaseAmounts,
  calculateExtractionRate,
  formatExtractionSummary
};