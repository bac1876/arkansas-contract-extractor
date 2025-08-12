import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

async function debugTest() {
  console.log('Current working directory:', process.cwd());
  
  // Test 1: Using the exact same approach as extraction-imagemagick.ts
  const pdfPath = path.resolve('uploads/1755020032944-test_contract2.pdf');
  const tempFolder = path.resolve('debug_temp_test');
  
  console.log('PDF Path:', pdfPath);
  console.log('Temp Folder:', tempFolder);
  
  // Create temp folder
  await fs.mkdir(tempFolder, { recursive: true });
  
  const outputPattern = path.join(tempFolder, 'page-%d.png');
  const magickPath = 'C:\\Program Files\\ImageMagick-7.1.2-Q16\\magick.exe';
  const command = `"${magickPath}" -density 300 "${pdfPath}" "${outputPattern}"`;
  
  console.log('Command to run:', command);
  
  try {
    const { stdout, stderr } = await execAsync(command);
    console.log('✅ SUCCESS!');
    if (stdout) console.log('Stdout:', stdout);
    if (stderr) console.log('Stderr:', stderr);
    
    // Check files created
    const files = await fs.readdir(tempFolder);
    console.log('Files created:', files.length);
  } catch (error: any) {
    console.log('❌ FAILED!');
    console.log('Error:', error.message);
    console.log('Command:', error.cmd);
  }
  
  // Cleanup
  await fs.rm(tempFolder, { recursive: true, force: true });
}

debugTest().catch(console.error);