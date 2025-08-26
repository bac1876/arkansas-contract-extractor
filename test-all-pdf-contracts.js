const fs = require('fs');
const path = require('path');

// Get all PDF files from test contracts folder
const testContractsPath = './Test Contracts';
const pdfFiles = fs.readdirSync(testContractsPath).filter(file => file.toLowerCase().endsWith('.pdf'));

console.log(`Found ${pdfFiles.length} PDF contracts to test:`);
pdfFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${file}`);
});

async function testAllContracts() {
    const results = [];
    const startTime = new Date();
    
    console.log('\n=== Starting Contract Testing ===\n');
    
    for (let i = 0; i < pdfFiles.length; i++) {
        const filename = pdfFiles[i];
        const filePath = `Test Contracts/${filename}`;
        
        console.log(`Testing ${i + 1}/${pdfFiles.length}: ${filename}...`);
        
        try {
            // Import the ImageMagick extractor
            const { ImageMagickExtractor } = require('./dist/extraction-imagemagick.js');
            const extractor = new ImageMagickExtractor();
            
            // Extract data from PDF
            const result = await extractor.extractFromPDF(filePath);
            
            // Create summary object
            const summary = {
                file: filename,
                success: result.success,
                extractionRate: result.extractionRate,
                fieldsExtracted: result.fieldsExtracted,
                totalFields: result.totalFields || 41,
                
                // Key data fields
                buyers: result.data?.buyers || null,
                property_address: result.data?.property_address || null,
                purchase_price: result.data?.purchase_price || null,
                cash_amount: result.data?.cash_amount || null,
                
                // Para 13 fields (check for null/empty)
                para13_items_included: result.data?.para13_items_included || null,
                para13_items_excluded: result.data?.para13_items_excluded || null,
                
                // New fields to verify
                para32_other_terms: result.data?.para32_other_terms || null,
                warranty_amount: result.data?.warranty_amount || null,
                selling_agent_name: result.data?.selling_agent_name || null,
                
                // Error info if any
                error: result.error || null,
                
                // Full data for reference
                fullData: result.data || null
            };
            
            results.push(summary);
            
            console.log(`  ✓ Success: ${result.success}`);
            console.log(`  ✓ Extraction Rate: ${result.extractionRate}%`);
            console.log(`  ✓ Fields: ${result.fieldsExtracted}/${result.totalFields || 41}`);
            console.log(`  ✓ Buyers: ${summary.buyers}`);
            console.log(`  ✓ Property: ${summary.property_address}`);
            console.log(`  ✓ Amount: ${summary.purchase_price || summary.cash_amount}`);
            console.log(`  ✓ Para13 Included: ${summary.para13_items_included}`);
            console.log(`  ✓ Para13 Excluded: ${summary.para13_items_excluded}`);
            console.log();
            
        } catch (error) {
            console.log(`  ✗ Error: ${error.message}`);
            results.push({
                file: filename,
                success: false,
                error: error.message,
                extractionRate: 0,
                fieldsExtracted: 0
            });
        }
    }
    
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    
    // Calculate overall statistics
    const successful = results.filter(r => r.success).length;
    const averageExtractionRate = results
        .filter(r => r.success)
        .reduce((sum, r) => sum + (r.extractionRate || 0), 0) / successful;
    
    const summary = {
        timestamp: new Date().toISOString(),
        testDuration: `${duration}s`,
        totalContracts: pdfFiles.length,
        successfulExtractions: successful,
        successRate: `${((successful / pdfFiles.length) * 100).toFixed(1)}%`,
        averageExtractionRate: `${averageExtractionRate.toFixed(1)}%`,
        
        // Para 13 analysis
        para13Analysis: {
            contractsWithIncludedItems: results.filter(r => r.para13_items_included && r.para13_items_included.trim() !== '').length,
            contractsWithExcludedItems: results.filter(r => r.para13_items_excluded && r.para13_items_excluded.trim() !== '').length,
            contractsWithEmptyPara13: results.filter(r => 
                (!r.para13_items_included || r.para13_items_included.trim() === '') &&
                (!r.para13_items_excluded || r.para13_items_excluded.trim() === '')
            ).length
        },
        
        // New fields analysis
        newFieldsFound: {
            contractsWithPara32: results.filter(r => r.para32_other_terms && r.para32_other_terms.trim() !== '').length,
            contractsWithWarranty: results.filter(r => r.warranty_amount && r.warranty_amount.trim() !== '').length,
            contractsWithAgent: results.filter(r => r.selling_agent_name && r.selling_agent_name.trim() !== '').length
        },
        
        results: results
    };
    
    // Save results to timestamped file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = `test_results_${timestamp}.json`;
    
    fs.writeFileSync(resultsFile, JSON.stringify(summary, null, 2));
    
    console.log('\n=== TEST SUMMARY ===');
    console.log(`Total Contracts Tested: ${summary.totalContracts}`);
    console.log(`Successful Extractions: ${summary.successfulExtractions}`);
    console.log(`Success Rate: ${summary.successRate}`);
    console.log(`Average Extraction Rate: ${summary.averageExtractionRate}`);
    console.log(`Test Duration: ${summary.testDuration}`);
    console.log();
    
    console.log('=== PARA 13 ANALYSIS ===');
    console.log(`Contracts with included items: ${summary.para13Analysis.contractsWithIncludedItems}`);
    console.log(`Contracts with excluded items: ${summary.para13Analysis.contractsWithExcludedItems}`);
    console.log(`Contracts with empty Para 13: ${summary.para13Analysis.contractsWithEmptyPara13}`);
    console.log();
    
    console.log('=== NEW FIELDS ANALYSIS ===');
    console.log(`Contracts with Para 32: ${summary.newFieldsFound.contractsWithPara32}`);
    console.log(`Contracts with warranty amount: ${summary.newFieldsFound.contractsWithWarranty}`);
    console.log(`Contracts with agent info: ${summary.newFieldsFound.contractsWithAgent}`);
    console.log();
    
    console.log(`Results saved to: ${resultsFile}`);
    
    return summary;
}

// Run the test
testAllContracts().catch(console.error);