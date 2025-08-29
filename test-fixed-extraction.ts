/**
 * Test script to verify the double extraction fix
 */

import { RobustExtractor } from './extraction-robust';

async function testFixedExtraction() {
  console.log('🧪 TESTING FIXED ROBUST EXTRACTION');
  console.log('='.repeat(60));
  console.log('This test verifies that successful extractions only run ONCE');
  console.log('='.repeat(60));
  
  const extractor = new RobustExtractor();
  const testFile = 'test_contract2.pdf';
  
  console.log(`\n📄 Test file: ${testFile}`);
  console.log('📊 Expected behavior: Should extract ONCE if successful\n');
  
  const startTime = Date.now();
  
  try {
    const result = await extractor.extractFromPDF(testFile);
    const duration = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST RESULTS');
    console.log('='.repeat(60));
    
    // Check results
    console.log(`✅ Extraction completed in ${(duration/1000).toFixed(1)}s`);
    console.log(`📊 Status: ${result.success ? 'SUCCESS' : result.isPartial ? 'PARTIAL' : 'FAILED'}`);
    console.log(`📊 Fields: ${result.fieldsExtracted}/${result.totalFields}`);
    console.log(`📊 Method: ${result.finalMethod}`);
    
    // Analyze attempts
    console.log(`\n🔍 Extraction Attempts Analysis:`);
    console.log(`   Total attempts: ${result.attempts.length}`);
    
    // Check for duplicate extractions
    const successfulAttempts = result.attempts.filter(a => a.success);
    console.log(`   Successful attempts: ${successfulAttempts.length}`);
    
    if (successfulAttempts.length > 0) {
      const firstSuccess = successfulAttempts[0];
      console.log(`   First success: ${firstSuccess.method} with ${firstSuccess.fieldsExtracted} fields`);
      
      // Verify we didn't run extra extractions after success
      const attemptAfterSuccess = result.attempts.findIndex(a => a === firstSuccess);
      const attemptsAfterSuccess = result.attempts.slice(attemptAfterSuccess + 1);
      
      if (attemptsAfterSuccess.length === 0) {
        console.log(`   ✅ GOOD: No extra attempts after successful extraction`);
      } else {
        console.log(`   ⚠️  WARNING: ${attemptsAfterSuccess.length} extra attempts after success`);
        attemptsAfterSuccess.forEach(a => {
          console.log(`      - ${a.method}: ${a.success ? 'success' : 'failed'}`);
        });
      }
    }
    
    // Check if we have cached results
    const cachedResults = result.attempts.filter(a => a.fullResult !== undefined);
    console.log(`\n📦 Cached Results: ${cachedResults.length} attempts have cached data`);
    
    // Final verdict
    console.log('\n' + '='.repeat(60));
    if (result.success && successfulAttempts.length === 1 && result.attempts.length === 1) {
      console.log('🎉 PERFECT: Extraction succeeded on first attempt with NO duplicates!');
    } else if (result.success && successfulAttempts.length === 1) {
      console.log('✅ PASS: Only one successful extraction was used (no duplicate API calls)');
    } else if (successfulAttempts.length > 1) {
      console.log('❌ FAIL: Multiple successful extractions detected (wasting API calls)');
    } else {
      console.log('⚠️  No successful extraction (may need retries)');
    }
    console.log('='.repeat(60));
    
    return result;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testFixedExtraction()
  .then(() => console.log('\n✅ Test complete'))
  .catch(err => {
    console.error('\n❌ Test error:', err);
    process.exit(1);
  });