import { HybridExtractor } from './extraction-hybrid';
import { getActualPurchaseAmount, validatePurchaseAmounts, getTransactionType } from './extraction-utils';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ContractTestResult {
  filename: string;
  success: boolean;
  fieldsExtracted: number;
  totalFields: number;
  extractionRate: string;
  transactionType: string;
  purchaseAmount: number | null;
  validation: string;
  buyers: string[] | null;
  propertyAddress: string | null;
  para13Included: string | null;
  para13Excluded: string | null;
  para14Contingencies: string | null;
  error?: string;
  timeMs?: number;
}

async function testContract(filename: string): Promise<ContractTestResult> {
  const extractor = new HybridExtractor();
  const startTime = Date.now();
  
  try {
    console.log(`\n📄 Testing: ${filename}`);
    console.log('-'.repeat(50));
    
    // Extract with GPT-5-mini (no fallback)
    const result = await extractor.extractFromPDF(filename, {
      model: 'gpt-5-mini',
      fallbackToGPT4o: false,
      verbose: false
    });
    
    const timeMs = Date.now() - startTime;
    
    if (!result.success) {
      return {
        filename,
        success: false,
        fieldsExtracted: 0,
        totalFields: 0,
        extractionRate: '0%',
        transactionType: 'UNKNOWN',
        purchaseAmount: null,
        validation: 'Extraction failed',
        buyers: null,
        propertyAddress: null,
        para13Included: null,
        para13Excluded: null,
        para14Contingencies: null,
        error: result.error,
        timeMs
      };
    }
    
    // Get validation and purchase amount
    const validation = validatePurchaseAmounts(result.data);
    const purchaseAmount = getActualPurchaseAmount(result.data);
    const transactionType = getTransactionType(result.data.para3_option_checked);
    
    // Log key fields
    console.log(`  ✅ Success: ${result.fieldsExtracted}/${result.totalFields} fields (${result.extractionRate})`);
    console.log(`  💰 Transaction: ${transactionType} - $${purchaseAmount?.toLocaleString() || 'N/A'}`);
    console.log(`  👥 Buyers: ${result.data.buyers?.join(', ') || 'Not found'}`);
    console.log(`  🏠 Property: ${result.data.property_address || 'Not found'}`);
    
    if (result.data.para13_items_included || result.data.para13_items_excluded) {
      console.log(`  📦 Para 13 - Included: ${result.data.para13_items_included || 'none'}`);
      console.log(`  ❌ Para 13 - Excluded: ${result.data.para13_items_excluded || 'none'}`);
    }
    
    return {
      filename: path.basename(filename),
      success: true,
      fieldsExtracted: result.fieldsExtracted || 0,
      totalFields: result.totalFields || 0,
      extractionRate: result.extractionRate || '0%',
      transactionType,
      purchaseAmount,
      validation: validation.message,
      buyers: result.data.buyers,
      propertyAddress: result.data.property_address,
      para13Included: result.data.para13_items_included,
      para13Excluded: result.data.para13_items_excluded,
      para14Contingencies: result.data.para14_contingencies,
      timeMs
    };
    
  } catch (error) {
    const timeMs = Date.now() - startTime;
    console.error(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return {
      filename: path.basename(filename),
      success: false,
      fieldsExtracted: 0,
      totalFields: 0,
      extractionRate: '0%',
      transactionType: 'UNKNOWN',
      purchaseAmount: null,
      validation: 'Error during extraction',
      buyers: null,
      propertyAddress: null,
      para13Included: null,
      para13Excluded: null,
      para14Contingencies: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      timeMs
    };
  }
}

async function generateCSV(results: ContractTestResult[]): Promise<string> {
  const headers = [
    'Filename',
    'Success',
    'Fields Extracted',
    'Total Fields',
    'Extraction Rate',
    'Transaction Type',
    'Purchase Amount',
    'Validation',
    'Buyers',
    'Property Address',
    'Para 13 Included',
    'Para 13 Excluded',
    'Para 14 Contingencies',
    'Time (ms)',
    'Error'
  ];
  
  const rows = results.map(r => [
    r.filename,
    r.success ? 'YES' : 'NO',
    r.fieldsExtracted.toString(),
    r.totalFields.toString(),
    r.extractionRate,
    r.transactionType,
    r.purchaseAmount?.toString() || '',
    r.validation,
    r.buyers?.join('; ') || '',
    r.propertyAddress || '',
    r.para13Included || '',
    r.para13Excluded || '',
    r.para14Contingencies || '',
    r.timeMs?.toString() || '',
    r.error || ''
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

async function main() {
  console.log('🚀 GPT-5-mini Comprehensive Contract Testing');
  console.log('='.repeat(60));
  
  // List of contracts to test
  const contracts = [
    'test_contract2.pdf',  // Known working test
    'Offer (BBS)-269 Honor Court.pdf',
    'Offer (EXE)-3315 Alliance Dr.pdf',
    'Offer (EXE)-3418 Justice Dr.pdf',
    'Offer (EXE)-3461 Alliance Dr.pdf',
    'Offer (EXE)-18 Alyce Ln.pdf',
    'Offer (EXE)-2702 Hughmount Rd.pdf',
    'Offer (EXE) 10050 Smokey Bear Rd (1).pdf'
  ];
  
  const results: ContractTestResult[] = [];
  
  // Test each contract
  for (const contract of contracts) {
    try {
      // Check if file exists
      await fs.access(contract);
      const result = await testContract(contract);
      results.push(result);
    } catch (error) {
      console.log(`\n⚠️  Skipping ${contract} - File not found`);
    }
  }
  
  // Generate summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 SUMMARY REPORT');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Successful: ${successful.length}/${results.length} contracts`);
  console.log(`❌ Failed: ${failed.length}/${results.length} contracts`);
  
  // Transaction type breakdown
  const cashContracts = successful.filter(r => r.transactionType === 'CASH');
  const financedContracts = successful.filter(r => r.transactionType === 'FINANCED');
  const assumptionContracts = successful.filter(r => r.transactionType === 'LOAN_ASSUMPTION');
  
  console.log(`\n💵 Transaction Types:`);
  console.log(`  - Cash: ${cashContracts.length} contracts`);
  console.log(`  - Financed: ${financedContracts.length} contracts`);
  console.log(`  - Loan Assumption: ${assumptionContracts.length} contracts`);
  
  // Average extraction rate
  if (successful.length > 0) {
    const avgFieldsExtracted = successful.reduce((sum, r) => sum + r.fieldsExtracted, 0) / successful.length;
    const avgTotalFields = successful.reduce((sum, r) => sum + r.totalFields, 0) / successful.length;
    const avgRate = Math.round((avgFieldsExtracted / avgTotalFields) * 100);
    console.log(`\n📈 Average Extraction Rate: ${avgRate}% (${avgFieldsExtracted.toFixed(1)}/${avgTotalFields.toFixed(1)} fields)`);
  }
  
  // Para 13 extraction success
  const para13Success = successful.filter(r => r.para13Included || r.para13Excluded);
  console.log(`\n📦 Para 13 Extraction: ${para13Success.length}/${successful.length} contracts`);
  
  // Average processing time
  const avgTime = results.reduce((sum, r) => sum + (r.timeMs || 0), 0) / results.length;
  console.log(`\n⏱️  Average Processing Time: ${(avgTime / 1000).toFixed(1)} seconds`);
  
  // Detailed results
  console.log(`\n📋 Detailed Results:`);
  console.log('-'.repeat(60));
  
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    const amount = result.purchaseAmount ? `$${result.purchaseAmount.toLocaleString()}` : 'N/A';
    console.log(`${status} ${result.filename}`);
    console.log(`   ${result.transactionType} - ${amount} - ${result.extractionRate}`);
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
  
  // Save to CSV
  const csvContent = await generateCSV(results);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const csvFilename = `contract_test_results_${timestamp}.csv`;
  await fs.writeFile(csvFilename, csvContent);
  console.log(`\n💾 Results saved to: ${csvFilename}`);
  
  // Save detailed JSON
  const jsonFilename = `contract_test_results_${timestamp}.json`;
  await fs.writeFile(jsonFilename, JSON.stringify(results, null, 2));
  console.log(`💾 Detailed results saved to: ${jsonFilename}`);
  
  console.log('\n✅ Testing Complete!');
}

// Run the test
main().catch(console.error);