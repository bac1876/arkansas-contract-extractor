/**
 * Test script for offer sheet PDF generation
 */

import { OfferSheetPDFGenerator } from './offer-sheet-app/offer-sheet-pdf-generator';
import { OfferSheetData } from './offer-sheet-app/offer-sheet-imagemagick-extractor';
import * as fs from 'fs/promises';

async function testOfferSheetPDF() {
  console.log('🧪 Testing Offer Sheet PDF Generation...\n');
  
  // Sample test data
  const testData: OfferSheetData = {
    propertyAddress: '123 Main Street, Rogers, AR 72758',
    buyerNames: 'John and Jane Smith',
    purchasePrice: 350000,
    sellerConcessions: 5000,
    closeDate: '02/15/2025',
    loanType: 'Conventional',
    contingency: 'Home Inspection',
    earnestMoney: '$5,000',
    nonRefundableDeposit: '$1,000 after inspection period',
    itemsToConvey: 'Refrigerator, Washer, Dryer',
    homeWarranty: 'Seller to provide - $695',
    survey: 'Seller to provide existing survey',
    otherTerms: 'Seller to pay 2% buyer closing costs',
    sellingAgentName: 'Sarah Johnson',
    sellingAgentPhone: '(479) 555-1234'
  };
  
  try {
    // Initialize generator
    const generator = new OfferSheetPDFGenerator();
    
    // Generate PDF
    console.log('📄 Generating PDF for test data...');
    const pdfPath = await generator.generateOfferSheetPDF(testData);
    
    // Verify file exists
    const stats = await fs.stat(pdfPath);
    
    console.log('\n✅ PDF generated successfully!');
    console.log(`📍 Location: ${pdfPath}`);
    console.log(`📏 Size: ${(stats.size / 1024).toFixed(2)} KB`);
    
    // Test with minimal data
    console.log('\n🧪 Testing with minimal data...');
    const minimalData: OfferSheetData = {
      propertyAddress: '456 Oak Lane, Bentonville, AR',
      buyerNames: 'Robert Johnson',
      purchasePrice: 275000,
      sellerConcessions: null,
      closeDate: '03/01/2025'
    };
    
    const minimalPdfPath = await generator.generateOfferSheetPDF(minimalData);
    const minimalStats = await fs.stat(minimalPdfPath);
    
    console.log('✅ Minimal PDF generated successfully!');
    console.log(`📍 Location: ${minimalPdfPath}`);
    console.log(`📏 Size: ${(minimalStats.size / 1024).toFixed(2)} KB`);
    
    // Test with complex buyer names
    console.log('\n🧪 Testing with shared last name pattern...');
    const sharedNameData: OfferSheetData = {
      propertyAddress: '789 Pine Street, Fayetteville, AR',
      buyerNames: 'Michael and Sarah Thompson',
      purchasePrice: 425000,
      sellerConcessions: 8000,
      closeDate: '04/30/2025'
    };
    
    const sharedNamePdfPath = await generator.generateOfferSheetPDF(sharedNameData);
    const sharedNameStats = await fs.stat(sharedNamePdfPath);
    
    console.log('✅ Shared name PDF generated successfully!');
    console.log(`📍 Location: ${sharedNamePdfPath}`);
    console.log(`📏 Size: ${(sharedNameStats.size / 1024).toFixed(2)} KB`);
    
    console.log('\n🎉 All tests passed successfully!');
    console.log('📂 PDFs saved in: offer-sheet-app/generated-pdfs/');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testOfferSheetPDF()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test error:', error);
      process.exit(1);
    });
}