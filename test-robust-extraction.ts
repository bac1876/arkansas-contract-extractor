/**
 * Test script for Robust Extraction System
 * Tests the new retry logic and fallback mechanisms
 */

import { RobustExtractor } from './extraction-robust';
import * as fs from 'fs/promises';
import * as path from 'path';

async function testRobustExtraction() {
  console.log('🧪 ROBUST EXTRACTION TEST');
  console.log('='.repeat(60));
  
  // Check if test contract exists
  const testFile = 'test_contract2.pdf';
  
  try {
    await fs.access(testFile);
    console.log(`✅ Test file found: ${testFile}`);
  } catch {
    console.error(`❌ Test file not found: ${testFile}`);
    console.log('Please ensure test_contract2.pdf exists in the current directory');
    process.exit(1);
  }
  
  console.log('\n📊 Starting extraction with robust retry logic...\n');
  
  const extractor = new RobustExtractor();
  const startTime = Date.now();
  
  try {
    const result = await extractor.extractFromPDF(testFile);
    const duration = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST RESULTS');
    console.log('='.repeat(60));
    
    // Status
    if (result.success) {
      console.log('✅ Status: FULL SUCCESS');
    } else if (result.isPartial) {
      console.log('⚠️  Status: PARTIAL SUCCESS');
    } else {
      console.log('❌ Status: FAILED');
    }
    
    // Extraction metrics
    console.log(`\n📊 Extraction Metrics:`);
    console.log(`   Fields Extracted: ${result.fieldsExtracted}/${result.totalFields}`);
    console.log(`   Extraction Rate: ${result.extractionRate}`);
    console.log(`   Final Method: ${result.finalMethod || 'None'}`);
    console.log(`   Total Duration: ${(duration/1000).toFixed(1)}s`);
    
    // Attempt summary
    console.log(`\n🔄 Attempt Summary:`);
    console.log(`   Total Attempts: ${result.attempts.length}`);
    
    for (const attempt of result.attempts) {
      const status = attempt.success ? '✅' : '❌';
      const fields = attempt.fieldsExtracted || 0;
      const time = (attempt.duration/1000).toFixed(1);
      console.log(`   ${status} Attempt ${attempt.attemptNumber} (${attempt.method}): ${fields} fields in ${time}s`);
    }
    
    // Statistics
    const stats = extractor.getStatistics(result.attempts);
    console.log(`\n📈 Statistics:`);
    console.log(`   Success Rate: ${((stats.successfulAttempts/stats.totalAttempts)*100).toFixed(1)}%`);
    console.log(`   Average Duration: ${(stats.averageDuration/1000).toFixed(1)}s`);
    console.log(`   Best Field Count: ${stats.bestFieldCount}`);
    console.log(`   Methods Used: ${stats.methodsUsed.join(', ')}`);
    
    // Sample extracted data
    if (result.data) {
      console.log(`\n📝 Sample Extracted Data:`);
      const sampleFields = [
        'property_address',
        'buyers',
        'purchase_price',
        'closing_date',
        'para15_home_warranty'
      ];
      
      for (const field of sampleFields) {
        if (result.data[field] !== undefined) {
          const value = Array.isArray(result.data[field]) 
            ? result.data[field].join(', ')
            : result.data[field];
          console.log(`   ${field}: ${value || 'null'}`);
        }
      }
      
      // Save full results
      const outputFile = `robust_test_result_${Date.now()}.json`;
      await fs.writeFile(outputFile, JSON.stringify(result, null, 2));
      console.log(`\n💾 Full results saved to: ${outputFile}`);
    }
    
    // Final verdict
    console.log('\n' + '='.repeat(60));
    if (result.success) {
      console.log('🎉 TEST PASSED: Full extraction successful!');
    } else if (result.isPartial && result.fieldsExtracted > 10) {
      console.log('⚠️  TEST PASSED: Partial extraction with sufficient data');
    } else if (result.fieldsExtracted > 0) {
      console.log('⚠️  TEST PARTIAL: Some data extracted but below threshold');
    } else {
      console.log('❌ TEST FAILED: No data could be extracted');
    }
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
}

// Run the test
testRobustExtraction().catch(console.error);