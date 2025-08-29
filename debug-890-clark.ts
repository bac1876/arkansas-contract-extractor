/**
 * Debug script to diagnose 890 Clark property address extraction issue
 */

import { GPT5Extractor } from './extraction-gpt5';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Set debug mode to keep temp files
process.env.DEBUG_EXTRACTION = 'true';

async function debug890Clark() {
  console.log('🔍 Debugging 890 Clark Property Address Extraction');
  console.log('=' + '='.repeat(60));
  console.log('');
  
  // Find the most recent 890 Clark PDF
  const processedDir = path.join(__dirname, 'processed_contracts/pdfs');
  const files = fs.readdirSync(processedDir);
  const clarkFiles = files.filter(f => f.includes('890 Clark') || f.includes('890_Clark'));
  
  if (clarkFiles.length === 0) {
    console.error('❌ No 890 Clark PDF found in processed_contracts/pdfs');
    return;
  }
  
  // Use the most recent one
  clarkFiles.sort();
  const pdfFile = clarkFiles[clarkFiles.length - 1];
  const pdfPath = path.join(processedDir, pdfFile);
  
  console.log('📄 Found PDF:', pdfFile);
  console.log('📍 Full path:', pdfPath);
  console.log('');
  
  // Extract just to see what's happening
  console.log('🤖 Starting extraction with debug logging...');
  console.log('');
  
  const extractor = new GPT5Extractor();
  
  try {
    // First, let's convert to images and keep them
    const tempFolder = `temp_debug_${Date.now()}_890_Clark`;
    const tempDir = path.join(__dirname, tempFolder);
    
    console.log(`📁 Creating temp folder: ${tempFolder}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Convert PDF to PNG
    console.log('🖼️ Converting PDF to PNG...');
    const convertCmd = `magick -density 150 "${pdfPath}" -quality 100 "${path.join(tempDir, 'page%d.png')}"`;
    
    try {
      await execAsync(convertCmd, { maxBuffer: 1024 * 1024 * 10 });
      console.log('✅ Conversion complete');
    } catch (error) {
      console.error('❌ ImageMagick conversion failed:', error);
      return;
    }
    
    // Check what images were created
    const pngFiles = fs.readdirSync(tempDir)
      .filter(f => f.endsWith('.png'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });
    
    console.log(`✅ Created ${pngFiles.length} page images`);
    console.log('');
    
    // Now look at page 1 specifically
    console.log('📄 Analyzing Page 1 for property address...');
    const page1Path = path.join(tempDir, pngFiles[0]);
    console.log(`   Image: ${page1Path}`);
    console.log('');
    
    // Extract with full logging
    const result = await extractor.extractFromPDF(pdfPath);
    
    console.log('📊 Extraction Results:');
    console.log('   Success:', result.success);
    console.log('   Fields extracted:', result.fieldsExtracted);
    console.log('');
    
    if (result.data) {
      console.log('🏠 Property Information Extracted:');
      console.log('   Property Address:', result.data.property_address);
      console.log('   Buyers:', result.data.buyers);
      console.log('   Purchase Price:', result.data.purchase_price);
      console.log('');
      
      // Check if address matches filename
      const filenameLower = pdfFile.toLowerCase();
      const addressLower = result.data.property_address?.toLowerCase() || '';
      
      if (filenameLower.includes('890') && filenameLower.includes('clark')) {
        if (!addressLower.includes('890') || !addressLower.includes('clark')) {
          console.log('⚠️  WARNING: Filename suggests "890 Clark" but extracted:', result.data.property_address);
          console.log('⚠️  This appears to be a MISEXTRACTION!');
          console.log('');
          console.log('📝 Possible causes:');
          console.log('   1. Wrong page being read');
          console.log('   2. OCR/vision API misreading the address');
          console.log('   3. Multiple addresses on page (reading wrong one)');
          console.log('   4. Poor scan quality');
          console.log('');
        } else {
          console.log('✅ Address extraction appears correct');
        }
      }
    }
    
    // Save the debug info
    const debugInfo = {
      pdfFile: pdfFile,
      pdfPath: pdfPath,
      tempFolder: tempDir,
      page1Image: page1Path,
      extractionResult: result,
      timestamp: new Date().toISOString()
    };
    
    const debugFile = `debug_890_clark_${Date.now()}.json`;
    fs.writeFileSync(debugFile, JSON.stringify(debugInfo, null, 2));
    console.log(`💾 Debug info saved to: ${debugFile}`);
    console.log('');
    
    console.log('🔍 IMPORTANT: Check the images in:', tempDir);
    console.log('   Look at page0.png to see what address is actually on the page');
    console.log('');
    
    // Open the folder in explorer for manual inspection
    if (process.platform === 'win32') {
      console.log('📂 Opening temp folder in Windows Explorer...');
      exec(`explorer "${path.resolve(tempDir)}"`, (err) => {
        if (err) console.error('Could not open folder:', err);
      });
    }
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

// Run the debug
debug890Clark().catch(console.error);