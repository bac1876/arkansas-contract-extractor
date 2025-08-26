/**
 * Generate Seller Net Sheet from extracted contract data
 */

import SellerNetSheetCalculator from './seller-net-sheet-calculator';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ContractData {
  success: boolean;
  data: any;
  extractionRate: string;
}

async function generateSellerNetSheet(contractResultPath: string, annualTaxes?: number) {
  try {
    // Read the contract extraction result
    const contractJson = await fs.readFile(contractResultPath, 'utf-8');
    const contractResult: ContractData = JSON.parse(contractJson);
    
    if (!contractResult.success || !contractResult.data) {
      throw new Error('Invalid contract data');
    }
    
    const data = contractResult.data;
    
    // Initialize calculator
    const calculator = new SellerNetSheetCalculator();
    
    // Prepare input for calculator
    const input = {
      purchase_price: data.purchase_price || data.cash_amount || 0,
      seller_concessions: data.para5_custom_text || data.seller_concessions,
      closing_date: data.closing_date,
      home_warranty: data.home_warranty,
      warranty_amount: data.warranty_amount,
      title_option: data.title_option,
      para32_other_terms: data.para32_other_terms,
      annual_taxes: annualTaxes || 3650, // Default to $3650 if not provided
      seller_commission_percent: 0.03 // Default 3%
    };
    
    // Calculate seller net sheet
    const result = calculator.calculate(input);
    
    // Generate HTML report
    const htmlReport = calculator.generateHTMLReport(result, data.property_address);
    
    // Create output directory
    const outputDir = path.join('processed_contracts', 'seller_net_sheets');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = path.basename(contractResultPath, '.json');
    
    // Save JSON result
    const jsonOutputPath = path.join(outputDir, `${baseFilename}_net_sheet.json`);
    await fs.writeFile(jsonOutputPath, JSON.stringify(result, null, 2));
    
    // Save HTML report
    const htmlOutputPath = path.join(outputDir, `${baseFilename}_net_sheet.html`);
    await fs.writeFile(htmlOutputPath, htmlReport);
    
    // Print summary
    console.log('\n=== SELLER NET SHEET GENERATED ===');
    console.log(`Property: ${data.property_address}`);
    console.log(`Sales Price: $${result.sales_price.toLocaleString()}`);
    console.log(`Total Costs: $${result.total_costs.toLocaleString()}`);
    console.log(`NET TO SELLER: $${result.cash_to_seller.toLocaleString()}`);
    console.log(`\nFiles saved:`);
    console.log(`  JSON: ${jsonOutputPath}`);
    console.log(`  HTML: ${htmlOutputPath}`);
    
    return result;
    
  } catch (error) {
    console.error('Error generating seller net sheet:', error);
    throw error;
  }
}

// If running directly from command line
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: ts-node generate-seller-net-sheet.ts <contract-result.json> [annual-taxes]');
    console.log('Example: ts-node generate-seller-net-sheet.ts processed_contracts/results/contract_result.json 3650');
    process.exit(1);
  }
  
  const contractPath = args[0];
  const annualTaxes = args[1] ? parseFloat(args[1]) : undefined;
  
  generateSellerNetSheet(contractPath, annualTaxes)
    .then(() => {
      console.log('\n✅ Seller net sheet generated successfully!');
    })
    .catch(error => {
      console.error('❌ Failed to generate seller net sheet:', error);
      process.exit(1);
    });
}

export { generateSellerNetSheet };