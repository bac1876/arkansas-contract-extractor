/**
 * Test extraction on Railway to diagnose empty data issue
 */

import { RobustExtractor } from './extraction-robust';
import * as path from 'path';
import * as fs from 'fs/promises';

async function testRailwayExtraction() {
  console.log('🧪 RAILWAY EXTRACTION TEST');
  console.log('=========================\n');
  
  // Check environment
  console.log('1️⃣ Environment Check:');
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   Platform: ${process.platform}`);
  console.log(`   Node version: ${process.version}`);
  console.log(`   Current directory: ${process.cwd()}`);
  
  // Check if test PDF exists
  console.log('\n2️⃣ Checking for test PDF:');
  const testPdfPath = path.join(__dirname, 'Test Contracts', 'test_contract.pdf');
  
  try {
    const stats = await fs.stat(testPdfPath);
    console.log(`   ✅ Found: ${testPdfPath}`);
    console.log(`   Size: ${stats.size} bytes`);
  } catch (error) {
    console.log(`   ❌ Not found: ${testPdfPath}`);
    console.log('   Creating test PDF from processed folder...');
    
    // Look for any PDF in processed folder
    const processedPath = path.join(__dirname, 'processed_contracts', 'pdfs');
    try {
      const files = await fs.readdir(processedPath);
      const pdfs = files.filter(f => f.endsWith('.pdf'));
      if (pdfs.length > 0) {
        const sourcePdf = path.join(processedPath, pdfs[0]);
        console.log(`   Found PDF: ${pdfs[0]}`);
        // Use this PDF for testing
        const testPdf = await fs.readFile(sourcePdf);
        await fs.mkdir(path.dirname(testPdfPath), { recursive: true });
        await fs.writeFile(testPdfPath, testPdf);
        console.log(`   ✅ Copied to test location`);
      } else {
        console.log('   ❌ No PDFs found in processed folder');
        return;
      }
    } catch (err) {
      console.log(`   ❌ Error accessing processed folder: ${err}`);
      return;
    }
  }
  
  // Test ImageMagick
  console.log('\n3️⃣ Testing ImageMagick:');
  const { spawn } = require('child_process');
  const isWindows = process.platform === 'win32';
  const magickCommand = isWindows ? 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe' : 'convert';
  
  await new Promise<void>((resolve) => {
    const proc = spawn(magickCommand, ['-version']);
    proc.on('error', (err: any) => {
      console.log(`   ❌ ImageMagick error: ${err.message}`);
      resolve();
    });
    proc.stdout.on('data', (data: any) => {
      console.log(`   ✅ ImageMagick found: ${data.toString().split('\\n')[0]}`);
    });
    proc.on('close', () => resolve());
  });
  
  // Test extraction
  console.log('\n4️⃣ Testing Extraction:');
  const extractor = new RobustExtractor();
  
  try {
    console.log('   Starting extraction...');
    const result = await extractor.extractFromPDF(testPdfPath);
    
    console.log('\n5️⃣ Extraction Results:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Method: ${result.method}`);
    console.log(`   Extraction Rate: ${result.extractionRate}%`);
    console.log(`   Fields Extracted: ${result.fieldsExtracted}/${result.totalFields}`);
    
    console.log('\n6️⃣ Key Fields:');
    console.log(`   Property Address: ${result.data?.property_address || 'EMPTY'}`);
    console.log(`   Purchase Price: ${result.data?.purchase_price || 'EMPTY'}`);
    console.log(`   Buyer Name: ${result.data?.buyer_name || 'EMPTY'}`);
    console.log(`   Closing Date: ${result.data?.closing_date || 'EMPTY'}`);
    
    if (!result.success) {
      console.log('\n❌ Extraction Failed:');
      console.log(`   Error: ${result.error}`);
      console.log('\n   Attempts:');
      result.attempts?.forEach((attempt: any, idx: number) => {
        console.log(`   [${idx + 1}] ${attempt.method}: ${attempt.success ? '✅' : '❌'} ${attempt.error || ''}`);
      });
    }
    
  } catch (error: any) {
    console.log(`\n❌ Extraction crashed: ${error.message}`);
    console.log(error.stack);
  }
}

testRailwayExtraction().catch(console.error);