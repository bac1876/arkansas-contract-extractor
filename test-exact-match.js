const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test conversion to exactly match working image
async function testExactMatch() {
  const pdfPath = path.resolve('test_contract2.pdf');
  const outputPath = path.resolve('test_exact_match.png');

  console.log('🔧 Testing exact match conversion...');

  const magickPath = 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe';

  // Try to exactly match the working image properties
  const args = [
    '-density', '150',
    pdfPath + '[0]',
    '-resize', '1224x1584!',     // Force exact size with !
    '-depth', '8',                // Force 8-bit depth like working image
    '-colorspace', 'sRGB',
    '-strip',                     // Remove metadata
    '-quality', '85',             // Lower quality for smaller size
    outputPath
  ];

  console.log('Parameters:', args.join(' '));

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
      const identify = spawn(magickPath, ['identify', '-verbose', outputPath]);
      let output = '';
      identify.stdout.on('data', (data) => {
        output += data.toString();
      });
      identify.on('close', () => {
        // Extract key properties
        const depthMatch = output.match(/Depth: (\d+-bit)/);
        const classMatch = output.match(/Class: (\w+)/);
        const typeMatch = output.match(/Type: (\w+)/);
        
        console.log('  Depth:', depthMatch ? depthMatch[1] : 'unknown');
        console.log('  Class:', classMatch ? classMatch[1] : 'unknown');
        console.log('  Type:', typeMatch ? typeMatch[1] : 'unknown');
        resolve();
      });
    });

    console.log('\n📏 Target (working image): 1224x1584, 8-bit, 390KB');
  }
}

testExactMatch().catch(console.error);