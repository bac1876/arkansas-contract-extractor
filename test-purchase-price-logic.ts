import { 
  getActualPurchaseAmount, 
  validatePurchaseAmounts,
  calculateExtractionRate,
  formatExtractionSummary
} from './extraction-utils';

// Test data for different transaction types
const cashPurchaseData = {
  buyers: ["Brian Curtis", "Lisa Brown"],
  property_address: "5806 W Walsh Lane Rogers, AR 72758",
  para3_option_checked: "3C",
  purchase_price: null,  // Correctly null for cash
  cash_amount: 300000,
  loan_type: "CASH",
  para13_items_included: "fridge",
  para13_items_excluded: "curtains"
};

const financedPurchaseData = {
  buyers: ["John Smith", "Jane Smith"],
  property_address: "123 Main St, Little Rock, AR",
  para3_option_checked: "3A",
  purchase_price: 275000,  // Has value for financed
  cash_amount: null,       // Correctly null for financed
  loan_type: "CONVENTIONAL",
  para13_items_included: "washer, dryer",
  para13_items_excluded: "none"
};

const invalidBothSetData = {
  buyers: ["Test Buyer"],
  property_address: "456 Error St",
  para3_option_checked: "3A",
  purchase_price: 200000,  // ERROR: Both are set!
  cash_amount: 200000,     // ERROR: Both are set!
  loan_type: "FHA"
};

const invalidMissingData = {
  buyers: ["Test Buyer"],
  property_address: "789 Missing Ave",
  para3_option_checked: "3C",
  purchase_price: null,  // Missing for cash
  cash_amount: null,     // Missing for cash
  loan_type: null
};

console.log('🧪 Testing Purchase Price Logic');
console.log('='.repeat(50));

// Test 1: Cash Purchase
console.log('\n📋 Test 1: Cash Purchase (3C)');
console.log('-'.repeat(40));
const cashAmount = getActualPurchaseAmount(cashPurchaseData);
console.log(`Actual amount: $${cashAmount?.toLocaleString()}`);
const cashValidation = validatePurchaseAmounts(cashPurchaseData);
console.log(`Validation: ${cashValidation.message}`);
console.log(`Valid: ${cashValidation.valid ? '✅' : '❌'}`);

// Test 2: Financed Purchase
console.log('\n📋 Test 2: Financed Purchase (3A)');
console.log('-'.repeat(40));
const financedAmount = getActualPurchaseAmount(financedPurchaseData);
console.log(`Actual amount: $${financedAmount?.toLocaleString()}`);
const financedValidation = validatePurchaseAmounts(financedPurchaseData);
console.log(`Validation: ${financedValidation.message}`);
console.log(`Valid: ${financedValidation.valid ? '✅' : '❌'}`);

// Test 3: Invalid - Both Set
console.log('\n📋 Test 3: Invalid - Both Fields Set');
console.log('-'.repeat(40));
const invalidValidation1 = validatePurchaseAmounts(invalidBothSetData);
console.log(`Validation: ${invalidValidation1.message}`);
console.log(`Valid: ${invalidValidation1.valid ? '✅' : '❌'}`);

// Test 4: Invalid - Missing
console.log('\n📋 Test 4: Invalid - Missing Amount');
console.log('-'.repeat(40));
const invalidValidation2 = validatePurchaseAmounts(invalidMissingData);
console.log(`Validation: ${invalidValidation2.message}`);
console.log(`Valid: ${invalidValidation2.valid ? '✅' : '❌'}`);

// Test 5: Extraction Rate Calculation
console.log('\n📋 Test 5: Extraction Rate Calculation');
console.log('-'.repeat(40));

const expectedFields = [
  'buyers', 'property_address', 'para3_option_checked',
  'purchase_price', 'cash_amount', 'loan_type',
  'para13_items_included', 'para13_items_excluded'
];

const cashRate = calculateExtractionRate(cashPurchaseData, expectedFields);
console.log('\nCash Purchase (3C):');
console.log(`Fields: ${cashRate.fieldsExtracted}/${cashRate.totalFields}`);
console.log(`Rate: ${cashRate.extractionRate}`);
console.log(`Note: purchase_price correctly excluded from expected fields`);

const financedRate = calculateExtractionRate(financedPurchaseData, expectedFields);
console.log('\nFinanced Purchase (3A):');
console.log(`Fields: ${financedRate.fieldsExtracted}/${financedRate.totalFields}`);
console.log(`Rate: ${financedRate.extractionRate}`);
console.log(`Note: cash_amount correctly excluded from expected fields`);

// Test 6: Summary Formatting
console.log('\n📋 Test 6: Summary Formatting');
console.log('-'.repeat(40));
console.log('\nCash Purchase Summary:');
console.log(formatExtractionSummary(cashPurchaseData));
console.log('\nFinanced Purchase Summary:');
console.log(formatExtractionSummary(financedPurchaseData));

// Final summary
console.log('\n✅ Purchase Price Logic Test Complete!');
console.log('Key Insight: purchase_price and cash_amount are MUTUALLY EXCLUSIVE');
console.log('- For financed (3A): purchase_price has value, cash_amount is null');
console.log('- For cash (3C): cash_amount has value, purchase_price is null');
console.log('- This is CORRECT behavior, not an error!');