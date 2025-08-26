/**
 * Arkansas Contract Extractor - Comprehensive Test Suite
 * Tests all PDF contracts in the "Test Contracts" folder
 */

const { ImageMagickExtractor } = require('./dist/extraction-imagemagick.js');
const fs = require('fs').promises;
const path = require('path');

async function testAllContracts() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = `test_results_${timestamp}.json`;
  
  console.log('🚀 Arkansas Contract Extractor - Full Test Suite');
  console.log('📁 Testing all contracts in "Test Contracts" folder...\n');
  
  const testContractsFolder = 'Test Contracts';
  const results = {
    timestamp,
    summary: {
      totalContracts: 0,
      successful: 0,
      failed: 0,
      averageExtractionRate: 0,
      totalFields: 47
    },
    contracts: [],
    commonIssues: [],
    newFieldsVerification: {
      para32_other_terms: 0,
      warranty_amount: 0,
      selling_agent_name: 0,
      selling_agent_license: 0,
      selling_agent_email: 0,
      selling_agent_phone: 0
    },
    para13Verification: {
      nullWhenEmpty: 0,
      falsePositives: 0
    }
  };
  
  try {
    // Get all PDF files in Test Contracts folder
    const files = await fs.readdir(testContractsFolder);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    
    console.log(`📋 Found ${pdfFiles.length} PDF contracts to test:`);
    pdfFiles.forEach((file, i) => console.log(`   ${i+1}. ${file}`));
    console.log('');
    
    results.summary.totalContracts = pdfFiles.length;
    
    // Initialize extractor
    const extractor = new ImageMagickExtractor();
    
    // Test each contract
    for (let i = 0; i < pdfFiles.length; i++) {
      const filename = pdfFiles[i];
      const filePath = path.join(testContractsFolder, filename);
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📄 TESTING CONTRACT ${i+1}/${pdfFiles.length}: ${filename}`);
      console.log(`${'='.repeat(80)}`);
      
      const contractResult = {
        filename,
        index: i + 1,
        success: false,
        extractionRate: '0%',
        fieldsExtracted: 0,
        totalFields: 47,
        keyFields: {
          buyers: null,
          property_address: null,
          purchase_type: null,
          purchase_amount: null
        },
        newFields: {
          para32_other_terms: null,
          warranty_amount: null,
          selling_agent_name: null,
          selling_agent_license: null,
          selling_agent_email: null,
          selling_agent_phone: null
        },
        para13Fields: {
          para13_items_included: null,
          para13_items_excluded: null,
          isEmpty: false,
          isNull: false
        },
        errors: [],
        executionTime: 0
      };
      
      try {
        const startTime = Date.now();
        
        // Run extraction
        console.log(`⚙️  Running extraction for: ${filename}`);
        const result = await extractor.extractFromPDF(filePath);
        
        contractResult.executionTime = Date.now() - startTime;
        
        if (result.success && result.data) {
          contractResult.success = true;
          contractResult.extractionRate = result.extractionRate || '0%';
          contractResult.fieldsExtracted = result.fieldsExtracted || 0;
          
          // Extract key fields
          contractResult.keyFields = {
            buyers: result.data.buyers || null,
            property_address: result.data.property_address || null,
            purchase_type: result.data.purchase_type || null,
            purchase_amount: result.data.cash_amount || result.data.purchase_price || null
          };
          
          // Check new fields
          contractResult.newFields = {
            para32_other_terms: result.data.para32_other_terms || null,
            warranty_amount: result.data.warranty_amount || null,
            selling_agent_name: result.data.selling_agent_name || null,
            selling_agent_license: result.data.selling_agent_license || null,
            selling_agent_email: result.data.selling_agent_email || null,
            selling_agent_phone: result.data.selling_agent_phone || null
          };
          
          // Check Para 13 fields (should be null when empty)
          contractResult.para13Fields = {
            para13_items_included: result.data.para13_items_included,
            para13_items_excluded: result.data.para13_items_excluded,
            isEmpty: (!result.data.para13_items_included && !result.data.para13_items_excluded),
            isNull: (result.data.para13_items_included === null && result.data.para13_items_excluded === null)
          };
          
          // Update counters
          results.summary.successful++;
          
          // Count new fields presence
          Object.keys(contractResult.newFields).forEach(field => {
            if (contractResult.newFields[field]) {
              results.newFieldsVerification[field]++;
            }
          });
          
          // Para 13 verification
          if (contractResult.para13Fields.isEmpty && contractResult.para13Fields.isNull) {
            results.para13Verification.nullWhenEmpty++;
          } else if (contractResult.para13Fields.isEmpty && !contractResult.para13Fields.isNull) {
            results.para13Verification.falsePositives++;
          }
          
          console.log(`✅ SUCCESS: ${contractResult.extractionRate} extraction rate`);
          console.log(`   🔑 Buyers: ${contractResult.keyFields.buyers ? contractResult.keyFields.buyers.join(', ') : 'NOT FOUND'}`);
          console.log(`   🏠 Property: ${contractResult.keyFields.property_address || 'NOT FOUND'}`);
          console.log(`   💰 Amount: $${contractResult.keyFields.purchase_amount || 'NOT FOUND'}`);
          console.log(`   📝 Para 32: ${contractResult.newFields.para32_other_terms || 'EMPTY'}`);
          console.log(`   🛡️  Warranty: $${contractResult.newFields.warranty_amount || 'NOT FOUND'}`);
          console.log(`   👨‍💼 Agent: ${contractResult.newFields.selling_agent_name || 'NOT FOUND'}`);
          
        } else {
          contractResult.errors.push(result.error || 'Unknown extraction error');
          results.summary.failed++;
          console.log(`❌ FAILED: ${result.error}`);
        }
        
      } catch (error) {
        contractResult.errors.push(error.message);
        results.summary.failed++;
        console.log(`❌ ERROR: ${error.message}`);
      }
      
      results.contracts.push(contractResult);
      console.log(`⏱️  Execution time: ${(contractResult.executionTime / 1000).toFixed(1)}s`);
    }
    
    // Calculate summary statistics
    const successfulContracts = results.contracts.filter(c => c.success);
    if (successfulContracts.length > 0) {
      const totalExtractionRate = successfulContracts.reduce((sum, contract) => {
        return sum + parseInt(contract.extractionRate.replace('%', ''));
      }, 0);
      results.summary.averageExtractionRate = Math.round(totalExtractionRate / successfulContracts.length);
    }
    
    // Identify common issues
    const errorCounts = {};
    results.contracts.forEach(contract => {
      contract.errors.forEach(error => {
        errorCounts[error] = (errorCounts[error] || 0) + 1;
      });
    });
    
    results.commonIssues = Object.entries(errorCounts)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count);
    
    // Save detailed results
    await fs.writeFile(resultsFile, JSON.stringify(results, null, 2));
    
    // Print comprehensive summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 COMPREHENSIVE TEST SUMMARY');
    console.log(`${'='.repeat(80)}`);
    
    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Contracts: ${results.summary.totalContracts}`);
    console.log(`   Successful: ${results.summary.successful}`);
    console.log(`   Failed: ${results.summary.failed}`);
    console.log(`   Success Rate: ${Math.round((results.summary.successful / results.summary.totalContracts) * 100)}%`);
    console.log(`   Average Extraction Rate: ${results.summary.averageExtractionRate}%`);
    
    console.log(`\n🆕 New Fields Verification (47 total fields):`);
    console.log(`   para32_other_terms: Found in ${results.newFieldsVerification.para32_other_terms}/${results.summary.totalContracts} contracts`);
    console.log(`   warranty_amount: Found in ${results.newFieldsVerification.warranty_amount}/${results.summary.totalContracts} contracts`);
    console.log(`   selling_agent_name: Found in ${results.newFieldsVerification.selling_agent_name}/${results.summary.totalContracts} contracts`);
    console.log(`   selling_agent_license: Found in ${results.newFieldsVerification.selling_agent_license}/${results.summary.totalContracts} contracts`);
    console.log(`   selling_agent_email: Found in ${results.newFieldsVerification.selling_agent_email}/${results.summary.totalContracts} contracts`);
    console.log(`   selling_agent_phone: Found in ${results.newFieldsVerification.selling_agent_phone}/${results.summary.totalContracts} contracts`);
    
    console.log(`\n📋 Para 13 Verification (Anti-Hallucination Check):`);
    console.log(`   Contracts with empty Para 13 returning NULL: ${results.para13Verification.nullWhenEmpty}`);
    console.log(`   Contracts with false positives: ${results.para13Verification.falsePositives}`);
    if (results.para13Verification.falsePositives > 0) {
      console.log(`   ⚠️  WARNING: ${results.para13Verification.falsePositives} contracts may have hallucinated Para 13 data!`);
    } else {
      console.log(`   ✅ GOOD: No false positives detected in Para 13 extraction`);
    }
    
    if (results.commonIssues.length > 0) {
      console.log(`\n❌ Common Issues:`);
      results.commonIssues.forEach(issue => {
        console.log(`   ${issue.error}: ${issue.count} contracts`);
      });
    }
    
    console.log(`\n💾 Detailed results saved to: ${resultsFile}`);
    console.log(`\n🏁 Test completed successfully!`);
    
  } catch (error) {
    console.error(`❌ Test suite failed:`, error.message);
    results.summary.failed = results.summary.totalContracts;
    await fs.writeFile(resultsFile, JSON.stringify(results, null, 2));
  }
}

// Run the test suite
if (require.main === module) {
  testAllContracts()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testAllContracts };