import { GPT5Extractor } from './extraction-gpt5';
import * as path from 'path';
import * as fs from 'fs/promises';

async function testLocalExtraction() {
  console.log('🧪 Testing GPT-5 extraction locally...\n');
  
  const extractor = new GPT5Extractor();
  const pdfPath = path.resolve('./Offer (EXE)-3418 Justice Dr.pdf');
  
  // Check if PDF exists
  try {
    const stats = await fs.stat(pdfPath);
    console.log(`📄 PDF found: ${pdfPath}`);
    console.log(`   Size: ${(stats.size / 1024).toFixed(1)} KB\n`);
  } catch (error) {
    console.error(`❌ PDF not found: ${pdfPath}`);
    return;
  }
  
  console.log('🚀 Starting extraction...\n');
  
  try {
    const result = await extractor.extractFromPDF(pdfPath);
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 EXTRACTION RESULTS');
    console.log('='.repeat(50));
    
    console.log(`\n✅ Success: ${result.success}`);
    console.log(`📈 Extraction Rate: ${result.extractionRate || 'N/A'}`);
    console.log(`📝 Fields Extracted: ${result.fieldsExtracted || 0} / ${result.totalFields || 28}`);
    
    if (result.data) {
      console.log('\n🏠 KEY FIELDS:');
      console.log(`   Property: ${result.data.property_address || '❌ EMPTY'}`);
      console.log(`   Price: ${result.data.purchase_price ? '$' + result.data.purchase_price.toLocaleString() : '❌ EMPTY'}`);
      console.log(`   Buyers: ${Array.isArray(result.data.buyers) ? result.data.buyers.join(', ') : '❌ EMPTY'}`);
      console.log(`   Closing Date: ${result.data.closing_date || '❌ EMPTY'}`);
      console.log(`   Seller Pays: ${result.data.seller_pays_buyer_costs ? '$' + result.data.seller_pays_buyer_costs : '❌ EMPTY'}`);
      
      // Check for empty values
      const hasEmptyValues = !result.data.property_address || 
                            !result.data.purchase_price || 
                            result.data.purchase_price === 0;
      
      if (hasEmptyValues) {
        console.log('\n⚠️  WARNING: Critical fields are empty!');
        console.log('   This indicates extraction failed.');
      } else {
        console.log('\n✅ All critical fields extracted successfully!');
      }
      
      // Save result to file for inspection
      const outputPath = `./test_extraction_${Date.now()}.json`;
      await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
      console.log(`\n💾 Full results saved to: ${outputPath}`);
    } else {
      console.log('\n❌ No data extracted - extraction completely failed');
    }
    
  } catch (error: any) {
    console.error('\n❌ EXTRACTION FAILED');
    console.error('   Error:', error.message);
    
    if (error.message.includes('ImageMagick')) {
      console.error('\n   🔧 ImageMagick issue detected');
      console.error('   Make sure ImageMagick is installed:');
      console.error('   Windows: Download from https://imagemagick.org/script/download.php#windows');
    }
    
    if (error.message.includes('Invalid PDF')) {
      console.error('\n   📄 PDF file is corrupted or invalid');
    }
    
    console.error('\nFull error:', error);
  }
}

testLocalExtraction().catch(console.error);