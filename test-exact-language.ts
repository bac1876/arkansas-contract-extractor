// Test with the exact language from paragraph 5

// Import the calculation function
function calculateSellerConcessions(text: string, purchasePrice: number): number | null {
  if (!text || !purchasePrice) return null;

  // Check for percentage patterns
  const percentPatterns = [
    /(\d+\.?\d*)\s*%\s*(of\s+)?(the\s+)?(purchase\s+price|sales\s+price|contract\s+price)/i,
    /up\s+to\s+(\d+\.?\d*)\s*%/i,
    /(\d+\.?\d*)\s*percent/i
  ];

  for (const pattern of percentPatterns) {
    const match = text.match(pattern);
    if (match) {
      const percent = parseFloat(match[1]) / 100;
      return Math.round(purchasePrice * percent);
    }
  }

  // Extract dollar amount if no percentage found
  const dollarPattern = /\$\s*([\d,]+)/;
  const dollarMatch = text.match(dollarPattern);
  if (dollarMatch) {
    return parseFloat(dollarMatch[1].replace(/,/g, ''));
  }

  return null;
}

// Test with the EXACT language from the contract
const exactText = "Seller to pay up to 3% of the purchase price towards buyer's closing costs, prepaid items, and other lender allowables.";
const purchasePrice = 300000;

console.log('Testing with EXACT contract language:');
console.log('='.repeat(60));
console.log('\nText:', exactText);
console.log('Purchase Price: $' + purchasePrice.toLocaleString());

const result = calculateSellerConcessions(exactText, purchasePrice);
console.log('\nResult: $' + (result || 0).toLocaleString());
console.log('Expected: $9,000');
console.log('Status:', result === 9000 ? '✅ CORRECT' : '❌ INCORRECT');

// Also test what the old parseInt logic would have done
const oldLogic = parseInt(exactText.replace(/[^0-9]/g, ''));
console.log('\nOld parseInt logic would return: $' + oldLogic);
console.log('This explains the $3 bug!');