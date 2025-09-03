import DropboxIntegration from './dropbox-integration';
import * as dotenv from 'dotenv';

dotenv.config();

async function testDropbox() {
  console.log('🔧 Testing Dropbox integration...\n');
  
  const dropbox = new DropboxIntegration();
  
  // Check if configured
  if (!dropbox.isConfigured()) {
    console.error('❌ Dropbox not configured - check .env file');
    console.error('   Make sure DROPBOX_ACCESS_TOKEN is set');
    return;
  }
  
  console.log('✅ Dropbox token found in .env');
  console.log('🔄 Attempting to connect to Dropbox...\n');
  
  // Initialize
  const initialized = await dropbox.initialize();
  if (!initialized) {
    console.error('❌ Failed to initialize Dropbox');
    console.error('   Check that your access token is valid');
    return;
  }
  
  console.log('✅ Dropbox connection successful!');
  console.log('✅ Folders created/verified:');
  console.log('   📁 /Extracted Contracts');
  console.log('   📁 /Extracted Contracts/Net Sheets');
  console.log('   📁 /Extracted Contracts/Agent Info Sheets');
  console.log('   📁 /Extracted Contracts/Contracts');
  console.log('\n🎉 Dropbox integration is ready to use!');
  console.log('   Files will be automatically backed up when processing emails.');
}

testDropbox().catch(error => {
  console.error('❌ Test failed:', error);
});