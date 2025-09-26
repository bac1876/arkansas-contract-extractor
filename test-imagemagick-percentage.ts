/**
 * Test ImageMagick extractor with percentage-based seller concessions
 */

import { ImageMagickExtractor } from './extraction-imagemagick';
import * as fs from 'fs/promises';

async function testPercentageExtraction() {
  console.log('🧪 Testing ImageMagick Extractor with percentage seller concessions\n');

  const pdfPath = './testcontractsellerconcessions.pdf';

  try {
    // Check if test file exists
    await fs.access(pdfPath);
    console.log(`✅ Test file found: ${pdfPath}`);

    // Initialize extractor
    const extractor = new ImageMagickExtractor();

    // Extract data from PDF
    console.log('\n📄 Extracting data from PDF...\n');
    const result = await extractor.extractFromPDF(pdfPath);

    // Check critical fields
    console.log('📊 EXTRACTION RESULTS:');
    console.log('=' .repeat(60));

    // Purchase price
    const purchasePrice = result.data.purchase_price || result.data.cash_amount || 0;
    console.log(`\n💰 Purchase Price: $${purchasePrice}`);

    // Seller concessions fields
    console.log('\n📝 Seller Concessions Fields:');
    console.log(`  - para5_custom_text: "${result.data.para5_custom_text || 'null'}"`);
    console.log(`  - seller_concessions: "${result.data.seller_concessions || 'null'}"`);
    console.log(`  - seller_concessions_calculated: $${result.data.seller_concessions_calculated || 0}`);

    // Verify calculation
    if (result.data.seller_concessions_calculated) {
      const text = result.data.para5_custom_text || result.data.seller_concessions || '';
      console.log('\n✅ CALCULATION VERIFICATION:');
      console.log(`  Text found: "${text}"`);
      console.log(`  Calculated amount: $${result.data.seller_concessions_calculated}`);

      // Check if it's correctly calculated (should be 3% of purchase price)
      const expectedAmount = Math.round(purchasePrice * 0.03);
      if (result.data.seller_concessions_calculated === expectedAmount) {
        console.log(`  ✅ CORRECT: 3% of $${purchasePrice} = $${expectedAmount}`);
      } else {
        console.log(`  ❌ MISMATCH: Expected $${expectedAmount}, got $${result.data.seller_concessions_calculated}`);
      }
    } else {
      console.log('\n❌ NO CALCULATION FOUND - seller_concessions_calculated is empty');
    }

    // Save results for inspection
    const outputPath = './test_imagemagick_percentage_result.json';
    await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n💾 Full results saved to: ${outputPath}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPercentageExtraction();