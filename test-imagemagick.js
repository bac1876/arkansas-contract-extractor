const { spawn } = require('child_process');
const path = require('path');

// Test ImageMagick directly
const pdfPath = path.resolve('test_contract2.pdf');
const outputPattern = path.resolve('test_output-%d.png');

console.log('Testing ImageMagick conversion...');
console.log('Input:', pdfPath);
console.log('Output:', outputPattern);

const magickPath = 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe';

// Use spawn instead of exec to avoid cmd /c wrapper
const proc = spawn(magickPath, [
  '-density', '300',
  pdfPath,
  outputPattern
]);

proc.stdout.on('data', (data) => {
  console.log('stdout:', data.toString());
});

proc.stderr.on('data', (data) => {
  console.log('stderr:', data.toString());
});

proc.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Success! Images created.');
    // Check if files were created
    const fs = require('fs');
    const files = fs.readdirSync('.').filter(f => f.startsWith('test_output-'));
    console.log('Created files:', files);
  } else {
    console.log('❌ Failed with code:', code);
  }
});

proc.on('error', (err) => {
  console.error('Error spawning process:', err);
});