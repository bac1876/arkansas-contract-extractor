/**
 * Test the complete flow from extraction to net sheet generation
 * Debug why net sheet shows $0 for percentage-based seller concessions
 */

import { RobustExtractor } from './extraction-robust';
import SellerNetSheetCalculator from './seller-net-sheet-calculator';
import * as fs from 'fs/promises';

async function testNetSheetPercentageFlow() {
  console.log('🔍 Testing Complete Net Sheet Flow with Percentage Seller Concessions\n');
  console.log('=' .repeat(70));

  const pdfPath = './testcontractsellerconcessions.pdf';

  try {
    // Step 1: Extract using the same flow as email-monitor
    console.log('\n📄 STEP 1: Extracting contract using RobustExtractor (same as email-monitor)...');
    const robustExtractor = new RobustExtractor();
    const extractionResult = await robustExtractor.extractFromPDF(pdfPath);

    if (!extractionResult.success) {
      console.error('❌ Extraction failed:', extractionResult.error);
      return;
    }

    const data = extractionResult.data;

    // Step 2: Show what was extracted
    console.log('\n📊 STEP 2: Extraction Results:');
    console.log('-' .repeat(50));
    console.log('Purchase Price:', data.purchase_price || data.cash_amount || 'NOT FOUND');
    console.log('seller_concessions:', data.seller_concessions || 'null');
    console.log('para5_custom_text:', data.para5_custom_text || 'null');
    console.log('seller_concessions_calculated:', data.seller_concessions_calculated || 'null');

    // Step 3: Build net sheet input (same as email-monitor.ts line 613-628)
    console.log('\n📋 STEP 3: Building Net Sheet Input (same as email-monitor)...');
    const netSheetInput = {
      purchase_price: data?.purchase_price || 0,
      cash_amount: data?.cash_amount || 0,
      seller_concessions: data?.seller_concessions_calculated ||  // Use calculated value first
                          data?.seller_pays_buyer_costs ||
                          data?.para5_custom_text ||
                          data?.seller_concessions ||
                          data?.paragraph_5?.seller_specific_payment_text ||
                          data?.paragraph_5?.seller_specific_payment_amount?.toString(),
      closing_date: data?.closing_date,
      home_warranty: data?.home_warranty,
      warranty_amount: data?.warranty_amount,
      title_option: data?.title_option,
      para32_other_terms: data?.para32_other_terms,
      annual_taxes: 3650, // Default
      seller_commission_percent: 0.03 // Default 3%
    };

    console.log('\nNet Sheet Input Values:');
    console.log('  purchase_price:', netSheetInput.purchase_price);
    console.log('  cash_amount:', netSheetInput.cash_amount);
    console.log('  seller_concessions:', netSheetInput.seller_concessions);
    console.log('  Type of seller_concessions:', typeof netSheetInput.seller_concessions);

    // Step 4: Calculate net sheet
    console.log('\n💰 STEP 4: Calculating Net Sheet...');
    const calculator = new SellerNetSheetCalculator();
    const netSheetResult = calculator.calculate(netSheetInput);

    // Step 5: Show results
    console.log('\n📈 STEP 5: Net Sheet Results:');
    console.log('-' .repeat(50));
    console.log('Sales Price:', netSheetResult.sales_price);
    console.log('Seller Concessions:', netSheetResult.seller_concessions);
    console.log('Total Costs:', netSheetResult.total_costs);
    console.log('Cash to Seller:', netSheetResult.cash_to_seller);

    // Step 6: Diagnose the issue
    console.log('\n🔎 STEP 6: Diagnosis:');
    console.log('-' .repeat(50));

    const expectedConcessions = Math.round((data.purchase_price || data.cash_amount || 0) * 0.03);

    if (netSheetResult.seller_concessions === 0) {
      console.log('❌ PROBLEM: Net sheet shows $0 seller concessions');
      console.log('   Expected: $' + expectedConcessions + ' (3% of purchase price)');

      // Check what went wrong
      if (!data.seller_concessions_calculated) {
        console.log('   Issue: seller_concessions_calculated was not populated by extractor');
      } else if (data.seller_concessions_calculated !== expectedConcessions) {
        console.log('   Issue: seller_concessions_calculated has wrong value:', data.seller_concessions_calculated);
      } else {
        console.log('   Issue: Calculator not using the calculated value correctly');
      }
    } else if (netSheetResult.seller_concessions === expectedConcessions) {
      console.log('✅ SUCCESS: Net sheet correctly shows $' + netSheetResult.seller_concessions);
    } else {
      console.log('⚠️  PARTIAL: Net sheet shows $' + netSheetResult.seller_concessions);
      console.log('   Expected: $' + expectedConcessions);
    }

    // Save results for inspection
    const outputPath = './test_netsheet_percentage_debug.json';
    await fs.writeFile(outputPath, JSON.stringify({
      extraction: data,
      netSheetInput,
      netSheetResult,
      expected: { seller_concessions: expectedConcessions }
    }, null, 2));
    console.log('\n💾 Full debug data saved to:', outputPath);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
testNetSheetPercentageFlow();