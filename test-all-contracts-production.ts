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
  validationStatus: boolean;
  validationMessage: string;
  buyers: string[] | null;
  propertyAddress: string | null;
  para3Option: string | null;
  para13Included: string | null;
  para13Excluded: string | null;
  para14Contingencies: string | null;
  closingDate: string | null;
  possessionDate: string | null;
  earnestMoney: any;
  error?: string;
  timeMs: number;
  modelUsed?: string;
}

async function testContractProduction(filename: string, extractor: HybridExtractor): Promise<ContractTestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`\n📄 Testing: ${filename}`);
    console.log('-'.repeat(60));
    
    // Use production settings - GPT-5-mini with GPT-4o fallback
    const result = await extractor.extractFromPDF(filename, {
      model: 'gpt-5-mini',  // Use GPT-5-mini as primary
      fallbackToGPT4o: true,  // Allow fallback for reliability
      verbose: true  // Show what's happening
    });
    
    const timeMs = Date.now() - startTime;
    
    if (!result.success) {
      console.error(`  ❌ Extraction failed: ${result.error}`);
      return {
        filename: path.basename(filename),
        success: false,
        fieldsExtracted: 0,
        totalFields: 0,
        extractionRate: '0%',
        transactionType: 'UNKNOWN',
        purchaseAmount: null,
        validationStatus: false,
        validationMessage: 'Extraction failed',
        buyers: null,
        propertyAddress: null,
        para3Option: null,
        para13Included: null,
        para13Excluded: null,
        para14Contingencies: null,
        closingDate: null,
        possessionDate: null,
        earnestMoney: null,
        error: result.error,
        timeMs
      };
    }
    
    // Validate and extract key data
    const validation = validatePurchaseAmounts(result.data);
    const purchaseAmount = getActualPurchaseAmount(result.data);
    const transactionType = getTransactionType(result.data.para3_option_checked);
    
    // Display results
    console.log(`  ✅ Success: ${result.fieldsExtracted}/${result.totalFields} fields (${result.extractionRate})`);
    console.log(`  💰 Transaction: ${transactionType} - $${purchaseAmount?.toLocaleString() || 'N/A'}`);
    console.log(`  📋 Validation: ${validation.valid ? '✅ VALID' : '❌ INVALID'} - ${validation.message}`);
    console.log(`  👥 Buyers: ${result.data.buyers?.join(', ') || 'Not found'}`);
    console.log(`  🏠 Property: ${result.data.property_address || 'Not found'}`);
    
    if (result.data.para13_items_included || result.data.para13_items_excluded) {
      console.log(`  📦 Para 13:`);
      console.log(`     Included: ${result.data.para13_items_included || 'none'}`);
      console.log(`     Excluded: ${result.data.para13_items_excluded || 'none'}`);
    }
    
    if (result.data.closing_date || result.data.possession_date) {
      console.log(`  📅 Dates:`);
      console.log(`     Closing: ${result.data.closing_date || 'not found'}`);
      console.log(`     Possession: ${result.data.possession_date || 'not found'}`);
    }
    
    console.log(`  ⏱️ Processing time: ${(timeMs / 1000).toFixed(1)} seconds`);
    
    return {
      filename: path.basename(filename),
      success: true,
      fieldsExtracted: result.fieldsExtracted || 0,
      totalFields: result.totalFields || 0,
      extractionRate: result.extractionRate || '0%',
      transactionType,
      purchaseAmount,
      validationStatus: validation.valid,
      validationMessage: validation.message,
      buyers: result.data.buyers,
      propertyAddress: result.data.property_address,
      para3Option: result.data.para3_option_checked,
      para13Included: result.data.para13_items_included,
      para13Excluded: result.data.para13_items_excluded,
      para14Contingencies: result.data.para14_contingencies,
      closingDate: result.data.closing_date,
      possessionDate: result.data.possession_date,
      earnestMoney: result.data.earnest_money_amount,
      timeMs,
      modelUsed: result.modelUsed || 'gpt-5-mini'
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
      validationStatus: false,
      validationMessage: 'Error during extraction',
      buyers: null,
      propertyAddress: null,
      para3Option: null,
      para13Included: null,
      para13Excluded: null,
      para14Contingencies: null,
      closingDate: null,
      possessionDate: null,
      earnestMoney: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      timeMs
    };
  }
}

async function generateDetailedCSV(results: ContractTestResult[]): Promise<string> {
  const headers = [
    'Filename',
    'Success',
    'Fields Extracted',
    'Total Fields', 
    'Extraction Rate',
    'Transaction Type',
    'Para 3 Option',
    'Purchase Amount',
    'Validation Status',
    'Validation Message',
    'Buyers',
    'Property Address',
    'Para 13 Included',
    'Para 13 Excluded',
    'Para 14 Contingencies',
    'Closing Date',
    'Possession Date',
    'Earnest Money',
    'Time (seconds)',
    'Model Used',
    'Error'
  ];
  
  const rows = results.map(r => [
    r.filename,
    r.success ? 'YES' : 'NO',
    r.fieldsExtracted.toString(),
    r.totalFields.toString(),
    r.extractionRate,
    r.transactionType,
    r.para3Option || '',
    r.purchaseAmount?.toString() || '',
    r.validationStatus ? 'VALID' : 'INVALID',
    r.validationMessage,
    r.buyers?.join('; ') || '',
    r.propertyAddress || '',
    r.para13Included || '',
    r.para13Excluded || '',
    r.para14Contingencies || '',
    r.closingDate || '',
    r.possessionDate || '',
    r.earnestMoney?.toString() || '',
    (r.timeMs / 1000).toFixed(1),
    r.modelUsed || '',
    r.error || ''
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

async function getAllContracts(): Promise<string[]> {
  // Get all PDF contracts in the directory
  const files = await fs.readdir('.');
  const contracts = files.filter(f => {
    // Include all contracts except flattened versions and other non-contract PDFs
    return f.endsWith('.pdf') && 
           (f.includes('Contract') || f.includes('Offer') || f.includes('test_contract')) &&
           !f.includes('_flattened') &&
           !f.includes('Seller Net Sheet') &&
           !f.includes('Title Fees');
  });
  
  // Sort to have a consistent order
  contracts.sort();
  
  return contracts;
}

async function main() {
  console.log('🚀 PRODUCTION CONTRACT TESTING - COMPREHENSIVE');
  console.log('='.repeat(70));
  console.log('Testing ALL contracts with GPT-5-mini (with GPT-4o fallback)');
  console.log('This will take approximately 2-3 minutes per contract');
  console.log('='.repeat(70));
  
  // Initialize extractor once for all tests
  const extractor = new HybridExtractor();
  
  // Get all contracts
  const contracts = await getAllContracts();
  console.log(`\n📁 Found ${contracts.length} contracts to test`);
  console.log('Contracts:', contracts.slice(0, 5).join(', '), contracts.length > 5 ? '...' : '');
  
  const results: ContractTestResult[] = [];
  let processedCount = 0;
  
  // Test each contract
  for (const contract of contracts) {
    processedCount++;
    console.log(`\n[${processedCount}/${contracts.length}] Processing...`);
    
    try {
      const result = await testContractProduction(contract, extractor);
      results.push(result);
      
      // Add small delay between contracts to avoid rate limits
      if (processedCount < contracts.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`Failed to test ${contract}:`, error);
      results.push({
        filename: contract,
        success: false,
        fieldsExtracted: 0,
        totalFields: 0,
        extractionRate: '0%',
        transactionType: 'UNKNOWN',
        purchaseAmount: null,
        validationStatus: false,
        validationMessage: 'Test failed',
        buyers: null,
        propertyAddress: null,
        para3Option: null,
        para13Included: null,
        para13Excluded: null,
        para14Contingencies: null,
        closingDate: null,
        possessionDate: null,
        earnestMoney: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        timeMs: 0
      });
    }
  }
  
  // Generate comprehensive summary
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 PRODUCTION TEST RESULTS SUMMARY');
  console.log('='.repeat(70));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const validated = successful.filter(r => r.validationStatus);
  
  console.log(`\n📈 Overall Results:`);
  console.log(`  ✅ Successful extractions: ${successful.length}/${results.length} (${Math.round(successful.length/results.length*100)}%)`);
  console.log(`  ✅ Valid purchase amounts: ${validated.length}/${successful.length} (${Math.round(validated.length/successful.length*100)}%)`);
  console.log(`  ❌ Failed extractions: ${failed.length}/${results.length}`);
  
  // Transaction type breakdown
  const cashContracts = successful.filter(r => r.transactionType === 'CASH');
  const financedContracts = successful.filter(r => r.transactionType === 'FINANCED');
  const assumptionContracts = successful.filter(r => r.transactionType === 'LOAN_ASSUMPTION');
  
  console.log(`\n💵 Transaction Types (from successful extractions):`);
  console.log(`  💰 Cash purchases: ${cashContracts.length}`);
  console.log(`  🏦 Financed purchases: ${financedContracts.length}`);
  console.log(`  📄 Loan assumptions: ${assumptionContracts.length}`);
  console.log(`  ❓ Unknown: ${successful.length - cashContracts.length - financedContracts.length - assumptionContracts.length}`);
  
  // Field extraction statistics
  if (successful.length > 0) {
    const avgFieldsExtracted = successful.reduce((sum, r) => sum + r.fieldsExtracted, 0) / successful.length;
    const avgTotalFields = successful.reduce((sum, r) => sum + r.totalFields, 0) / successful.length;
    const avgRate = Math.round((avgFieldsExtracted / avgTotalFields) * 100);
    
    console.log(`\n📊 Extraction Statistics:`);
    console.log(`  Average extraction rate: ${avgRate}%`);
    console.log(`  Average fields extracted: ${avgFieldsExtracted.toFixed(1)}/${avgTotalFields.toFixed(1)}`);
  }
  
  // Critical field success rates
  const para13Success = successful.filter(r => r.para13Included || r.para13Excluded);
  const para14Success = successful.filter(r => r.para14Contingencies);
  const datesSuccess = successful.filter(r => r.closingDate || r.possessionDate);
  
  console.log(`\n🔍 Critical Field Extraction (from successful):`);
  console.log(`  Para 13 (items): ${para13Success.length}/${successful.length} (${Math.round(para13Success.length/successful.length*100)}%)`);
  console.log(`  Para 14 (contingencies): ${para14Success.length}/${successful.length} (${Math.round(para14Success.length/successful.length*100)}%)`);
  console.log(`  Dates (closing/possession): ${datesSuccess.length}/${successful.length} (${Math.round(datesSuccess.length/successful.length*100)}%)`);
  
  // Performance metrics
  const totalTime = results.reduce((sum, r) => sum + r.timeMs, 0);
  const avgTime = totalTime / results.length;
  
  console.log(`\n⏱️ Performance:`);
  console.log(`  Total processing time: ${(totalTime / 1000 / 60).toFixed(1)} minutes`);
  console.log(`  Average time per contract: ${(avgTime / 1000).toFixed(1)} seconds`);
  
  // Failed contracts details
  if (failed.length > 0) {
    console.log(`\n❌ Failed Contracts:`);
    for (const f of failed) {
      console.log(`  - ${f.filename}: ${f.error}`);
    }
  }
  
  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  
  // Save CSV
  const csvContent = await generateDetailedCSV(results);
  const csvFilename = `production_test_results_${timestamp}.csv`;
  await fs.writeFile(csvFilename, csvContent);
  console.log(`\n💾 CSV results saved to: ${csvFilename}`);
  
  // Save detailed JSON
  const jsonFilename = `production_test_results_${timestamp}.json`;
  await fs.writeFile(jsonFilename, JSON.stringify(results, null, 2));
  console.log(`💾 Detailed JSON saved to: ${jsonFilename}`);
  
  // Clean up temp folders
  const tempFolders = (await fs.readdir('.')).filter(f => f.startsWith('gpt5_temp_') || f.startsWith('magick_temp_'));
  for (const folder of tempFolders) {
    await fs.rm(folder, { recursive: true, force: true }).catch(() => {});
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ PRODUCTION TESTING COMPLETE');
  console.log(`Success Rate: ${Math.round(successful.length/results.length*100)}%`);
  console.log('='.repeat(70));
}

// Run production test
main().catch(console.error);