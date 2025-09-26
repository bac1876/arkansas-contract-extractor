// Test the percentage-based seller concessions calculation

// Helper function to calculate seller concessions from text
function calculateSellerConcessions(para5_text: string, purchase_price: number): number | null {
  if (!para5_text) return null;

  // Check for percentage pattern: "3%", "up to 3%", "3 percent", etc.
  const percentPatterns = [
    /(\d+\.?\d*)\s*%\s*(of\s+)?(the\s+)?(purchase\s+price|sales\s+price|contract\s+price)/i,
    /up\s+to\s+(\d+\.?\d*)\s*%/i,
    /(\d+\.?\d*)\s*percent/i
  ];

  for (const pattern of percentPatterns) {
    const match = para5_text.match(pattern);
    if (match) {
      const percent = parseFloat(match[1]) / 100;
      return Math.round(purchase_price * percent); // Round to nearest dollar
    }
  }

  // Otherwise try to extract dollar amount
  const dollarPattern = /\$\s*([\d,]+)/;
  const dollarMatch = para5_text.match(dollarPattern);
  if (dollarMatch) {
    return parseFloat(dollarMatch[1].replace(/,/g, ''));
  }

  return null;
}

// Test cases
const testCases = [
  {
    text: "Seller to pay up to 3% of the purchase price towards buyer's closing costs",
    price: 300000,
    expected: 9000
  },
  {
    text: "Seller will contribute 2.5% of sales price",
    price: 400000,
    expected: 10000
  },
  {
    text: "Seller pays 3 percent of contract price",
    price: 250000,
    expected: 7500
  },
  {
    text: "Seller to pay $5,000 towards buyer's closing costs",
    price: 300000,
    expected: 5000
  },
  {
    text: "Seller contributes $7,500",
    price: 300000,
    expected: 7500
  },
  {
    text: "Up to 4% of purchase price",
    price: 350000,
    expected: 14000
  }
];

console.log('Testing Percentage-Based Seller Concessions Calculation');
console.log('='.repeat(60));

testCases.forEach((test, i) => {
  const result = calculateSellerConcessions(test.text, test.price);
  const passed = result === test.expected;
  const status = passed ? '✅' : '❌';

  console.log(`\nTest ${i + 1}: ${status}`);
  console.log(`  Text: "${test.text}"`);
  console.log(`  Purchase Price: $${test.price.toLocaleString()}`);
  console.log(`  Expected: $${test.expected.toLocaleString()}`);
  console.log(`  Result: ${result !== null ? `$${result.toLocaleString()}` : 'null'}`);
});