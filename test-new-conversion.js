const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test new ImageMagick conversion parameters
async function testNewConversion() {
  const pdfPath = path.resolve('test_contract2.pdf');
  const outputPath = path.resolve('test_new_conversion.png');

  console.log('🔧 Testing new ImageMagick conversion parameters...');
  console.log('Input:', pdfPath);
  console.log('Output:', outputPath);

  const magickPath = 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe';

  // Use the new parameters that match working images
  const args = [
    '-density', '150',           // Lower DPI
    pdfPath + '[0]',             // Only first page
    '-resize', '1224x1584>',     // Resize to max dimensions
    '-colorspace', 'sRGB',       // Ensure sRGB
    '-quality', '90',            // Good quality
    outputPath
  ];

  console.log('\nParameters:', args.join(' '));

  await new Promise((resolve, reject) => {
    const proc = spawn(magickPath, args);

    proc.stderr.on('data', (data) => {
      console.log('stderr:', data.toString());
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Conversion successful!');
        resolve();
      } else {
        console.log('❌ Failed with code:', code);
        reject(new Error('Conversion failed'));
      }
    });
  });

  // Check the output
  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    console.log('\n📊 Image created:');
    console.log('  Size:', stats.size, 'bytes');
    
    // Get image properties
    await new Promise((resolve) => {
      const identify = spawn(magickPath, ['identify', outputPath]);
      identify.stdout.on('data', (data) => {
        console.log('  Properties:', data.toString().trim());
        resolve();
      });
    });

    // Compare with working image
    console.log('\n📏 Comparison:');
    console.log('  Working image: 1224x1584, 390KB');
    console.log('  New image:', fs.statSync(outputPath).size, 'bytes');
  }
}

testNewConversion().catch(console.error);