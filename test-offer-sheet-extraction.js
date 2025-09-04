require('dotenv').config();
require('ts-node/register');

const { OfferSheetImageMagickExtractor } = require('./offer-sheet-app/offer-sheet-imagemagick-extractor.ts');
const { SimpleFormatter } = require('./offer-sheet-app/simple-formatter.ts');

async function test() {
  console.log('📄 Testing Offer Sheet Extraction (using ImageMagick)\n');
  
  const extractor = new OfferSheetImageMagickExtractor();
  const formatter = new SimpleFormatter();
  
  // Test with test_contract2.pdf
  const pdfPath = 'test_contract2.pdf';
  
  console.log('Contract:', pdfPath);
  console.log('Method: ImageMagick + GPT-4 Vision\n');
  
  try {
    const extractionResult = await extractor.extractFromPDF(pdfPath);
    
    if (!extractionResult.success) {
      console.error('❌ Extraction failed:', extractionResult.error);
      return;
    }
    
    const result = extractionResult.data;
    
    console.log('\n📊 Extraction Results:');
    console.log('====================');
    console.log('Buyer Names:', result.buyerNames);
    console.log('Purchase Price:', result.purchasePrice);
    console.log('Close Date:', result.closeDate);
    console.log('Seller Concessions:', result.sellerConcessions);
    console.log('Earnest Money:', result.earnestMoney);
    console.log('Non-Refundable Deposit:', result.nonRefundableDeposit);
    console.log('Contingency:', result.contingency);
    console.log('Items to Convey:', result.itemsToConvey);
    console.log('Home Warranty:', result.homeWarranty);
    console.log('Survey:', result.survey);
    
    // Test formatter
    console.log('\n📧 Generating HTML email...');
    const html = formatter.formatOfferSheet(result);
    console.log('HTML length:', html.length, 'characters');
    
    // Save HTML for review
    const fs = require('fs').promises;
    await fs.writeFile('test-offer-sheet.html', html);
    console.log('✅ Saved to test-offer-sheet.html');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

test().catch(console.error);