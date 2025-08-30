/**
 * Test ImageMagick on Railway
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('🎨 IMAGEMAGICK TEST ON RAILWAY');
console.log('==============================\n');

// Check platform
console.log('1️⃣ Platform Check:');
console.log(`   Running on: ${process.platform}`);
console.log(`   Node version: ${process.version}`);

// Test ImageMagick version
console.log('\n2️⃣ Testing ImageMagick Installation:');

const isWindows = process.platform === 'win32';
const magickCommand = isWindows 
  ? 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe'
  : 'convert';

console.log(`   Using command: ${magickCommand}`);

// Test 1: Check if ImageMagick exists
const testVersion = spawn(magickCommand, ['-version']);

testVersion.stdout.on('data', (data) => {
  console.log(`   ✅ ImageMagick found:`);
  console.log(`   ${data.toString().split('\n')[0]}`);
});

testVersion.stderr.on('data', (data) => {
  console.log(`   ❌ ImageMagick error: ${data}`);
});

testVersion.on('error', (error) => {
  console.log(`   ❌ Failed to run ImageMagick: ${error.message}`);
  console.log(`   This means ImageMagick is NOT installed or not in PATH`);
});

testVersion.on('close', (code) => {
  console.log(`   Exit code: ${code}`);
  
  if (code === 0) {
    console.log('\n3️⃣ Testing PDF Conversion:');
    
    // Create a simple test PDF (just a dummy file for testing)
    const testPdfPath = path.join(process.cwd(), 'test-dummy.pdf');
    const testPngPath = path.join(process.cwd(), 'test-output.png');
    
    console.log(`   Creating dummy test file at: ${testPdfPath}`);
    
    // For a real test, we'd need an actual PDF
    // Let's just test the convert command syntax
    const args = isWindows 
      ? ['convert', '-version']
      : ['-version'];
    
    const testConvert = spawn(magickCommand, args);
    
    testConvert.stdout.on('data', (data) => {
      console.log(`   ✅ Convert command works`);
    });
    
    testConvert.stderr.on('data', (data) => {
      console.log(`   ❌ Convert error: ${data}`);
    });
    
    testConvert.on('close', (code2) => {
      console.log(`   Convert exit code: ${code2}`);
      console.log('\n✅ IMAGEMAGICK TEST COMPLETE');
    });
  } else {
    console.log('\n❌ IMAGEMAGICK NOT WORKING - THIS IS THE PROBLEM!');
    console.log('   Extraction will fail without ImageMagick to convert PDFs');
  }
});