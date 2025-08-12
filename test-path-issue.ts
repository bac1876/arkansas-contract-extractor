import * as path from 'path';
import * as fs from 'fs/promises';

console.log('Current working directory:', process.cwd());

const timestamp = Date.now().toString();
const tempDirRelative = `temp_extraction/${timestamp}`;
const tempDirAbsolute = path.resolve(tempDirRelative);

console.log('tempDirRelative:', tempDirRelative);
console.log('tempDirAbsolute:', tempDirAbsolute);
console.log('Is absolute?:', path.isAbsolute(tempDirAbsolute));

// Try to create the directory
fs.mkdir(tempDirAbsolute, { recursive: true })
  .then(() => {
    console.log('SUCCESS: Directory created at:', tempDirAbsolute);
    // Clean up
    return fs.rm(tempDirAbsolute, { recursive: true, force: true });
  })
  .catch((error: any) => {
    console.error('ERROR:', error.message);
    console.error('Failed path:', error.path);
  });