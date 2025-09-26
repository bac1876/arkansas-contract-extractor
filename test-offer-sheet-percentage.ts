/**
 * Test offer sheet extractor with percentage-based seller concessions
 */

import { OfferSheetImageMagickExtractor } from './offer-sheet-app/offer-sheet-imagemagick-extractor';
import * as fs from 'fs/promises';

async function testOfferSheetPercentage() {
  console.log('🧪 Testing Offer Sheet Extractor with percentage seller concessions\n');

  const pdfPath = './testcontractsellerconcessions.pdf';

  try {
    // Check if test file exists
    await fs.access(pdfPath);
    console.log(`✅ Test file found: ${pdfPath}`);

    // Initialize extractor
    const extractor = new OfferSheetImageMagickExtractor();

    // Extract data from PDF
    console.log('\n📄 Extracting data for offer sheet...\n');
    const result = await extractor.extractFromPDF(pdfPath);

    if (!result.success) {
      console.error('❌ Extraction failed:', result.error);
      return;
    }

    // Check critical fields
    console.log('📊 OFFER SHEET EXTRACTION RESULTS:');
    console.log('=' .repeat(60));

    console.log(`\n👥 Buyers: ${result.data?.buyerNames || 'null'}`);
    console.log(`💰 Purchase Price: $${result.data?.purchasePrice || 0}`);
    console.log(`📅 Close Date: ${result.data?.closeDate || 'null'}`);

    // The critical field - seller concessions
    console.log(`\n🎯 SELLER CONCESSIONS: $${result.data?.sellerConcessions || 0}`);

    // Verify calculation
    if (result.data?.sellerConcessions) {
      const purchasePrice = result.data.purchasePrice || 0;
      const expectedAmount = Math.round(purchasePrice * 0.03); // 3%

      if (result.data.sellerConcessions === expectedAmount) {
        console.log(`✅ CORRECT: 3% of $${purchasePrice} = $${expectedAmount}`);
      } else {
        console.log(`❌ MISMATCH: Expected $${expectedAmount}, got $${result.data.sellerConcessions}`);
      }
    } else {
      console.log('❌ NO SELLER CONCESSIONS FOUND');
    }

    // Show other offer sheet fields
    console.log('\n📋 Other Offer Sheet Fields:');
    console.log(`  - Earnest Money: ${result.data?.earnestMoney || 'null'}`);
    console.log(`  - Non-Refundable Deposit: ${result.data?.nonRefundableDeposit || 'null'}`);
    console.log(`  - Contingency: ${result.data?.contingency || 'null'}`);
    console.log(`  - Home Warranty: ${result.data?.homeWarranty || 'null'}`);
    console.log(`  - Survey: ${result.data?.survey || 'null'}`);

    // Save results for inspection
    const outputPath = './test_offer_sheet_percentage_result.json';
    await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n💾 Full results saved to: ${outputPath}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testOfferSheetPercentage();