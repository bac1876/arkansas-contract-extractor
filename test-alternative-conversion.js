const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Try alternative conversion approaches
async function testAlternativeConversion() {
  const pdfPath = path.resolve('test_contract2.pdf');
  
  console.log('🔧 Testing alternative conversion approaches...\n');

  const magickPath = 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe';

  // Approach 1: Use convert command directly (older ImageMagick style)
  const output1 = path.resolve('test_convert_style.png');
  const args1 = [
    'convert',
    '-density', '150',
    pdfPath + '[0]',
    '-alpha', 'remove',           // Remove alpha channel
    '-background', 'white',        // White background
    '-flatten',                    // Flatten layers
    '-resize', '1224x1584',
    '-depth', '8',
    output1
  ];

  console.log('Test 1: Convert style with flatten...');
  await runConversion(magickPath, args1, output1);

  // Approach 2: Use Ghostscript-style rendering
  const output2 = path.resolve('test_gs_style.png');
  const args2 = [
    '-density', '150',
    '-define', 'pdf:use-cropbox=true',
    pdfPath + '[0]',
    '-alpha', 'off',
    '-resize', '1224x1584',
    '-depth', '8',
    output2
  ];

  console.log('\nTest 2: Ghostscript style...');
  await runConversion(magickPath, args2, output2);

  // Approach 3: Match pdf2pic defaults
  const output3 = path.resolve('test_pdf2pic_style.png');
  const args3 = [
    '-density', '144',            // pdf2pic default DPI
    pdfPath + '[0]',
    '-alpha', 'remove',
    '-background', 'white',
    '-resize', '1224x1584',
    '-quality', '100',            // pdf2pic uses high quality
    output3
  ];

  console.log('\nTest 3: pdf2pic style (144 DPI)...');
  await runConversion(magickPath, args3, output3);
}

async function runConversion(magickPath, args, outputPath) {
  try {
    await new Promise((resolve, reject) => {
      const proc = spawn(magickPath, args);
      proc.on('close', (code) => {
        if (code === 0) {
          const size = fs.statSync(outputPath).size;
          console.log(`✅ Created: ${outputPath} (${size} bytes)`);
          resolve();
        } else {
          console.log('❌ Failed');
          reject();
        }
      });
    });
  } catch (e) {
    console.log('Error:', e.message);
  }
}

testAlternativeConversion().catch(console.error);