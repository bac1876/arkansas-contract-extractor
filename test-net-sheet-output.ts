/**
 * Test script to generate a sample net sheet with the updated format
 */

import { SellerNetSheetCalculator } from './seller-net-sheet-calculator';
import PDFGenerator from './pdf-generator';
import * as fs from 'fs/promises';
import * as path from 'path';

async function testNetSheetOutput() {
  console.log('Testing updated net sheet output format...\n');
  
  // Create sample data
  const sampleData = {
    purchase_price: 300000,
    seller_concessions: "Seller to pay $5000 towards buyer's closing costs",
    closing_date: '02/15/2025',
    home_warranty: 'YES',
    warranty_amount: 695,
    title_option: 'A',
    para32_other_terms: 'Buyer to pay 3% buyer agency fee',
    annual_taxes: 3650,
    seller_commission_percent: 0.03
  };
  
  const contractData = {
    buyers: 'John Smith and Jane Smith',
    closing_date: '02/15/2025',
    property_address: '123 Main Street, Rogers, AR 72758'
  };
  
  // Calculate net sheet
  const calculator = new SellerNetSheetCalculator();
  const netSheetData = calculator.calculate(sampleData);
  
  console.log('Net Sheet Calculation Results:');
  console.log('------------------------------');
  console.log(`Sales Price: $${netSheetData.sales_price.toLocaleString()}`);
  console.log(`Total Costs: $${netSheetData.total_costs.toLocaleString()}`);
  console.log(`Net to Seller: $${netSheetData.cash_to_seller.toLocaleString()}`);
  console.log(`Closing Date: ${contractData.closing_date}`);
  console.log('');
  
  // Generate PDF
  const pdfGenerator = new PDFGenerator();
  const pdfPath = await pdfGenerator.generateNetSheetPDF(
    netSheetData,
    contractData.property_address,
    contractData
  );
  
  console.log(`✅ PDF generated: ${pdfPath}`);
  
  // Also generate HTML for quick preview
  const htmlContent = calculator.generateHTMLReport(netSheetData, contractData.property_address);
  const htmlPath = path.join('net_sheets_pdf', 'preview_test.html');
  await fs.writeFile(htmlPath, htmlContent);
  console.log(`✅ HTML preview: ${htmlPath}`);
  
  console.log('\n📋 Summary of Changes:');
  console.log('- Reduced header size from 32px to 24px');
  console.log('- Removed "Date Prepared" from property info section');
  console.log('- Fixed closing date extraction (added page 13 to extraction)');
  console.log('- Replaced large highlighted "Estimated Net to Seller" section with subtle table format');
  console.log('\nOpen the generated PDF or HTML file to review the updated format.');
}

testNetSheetOutput().catch(console.error);