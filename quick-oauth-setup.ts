/**
 * Quick OAuth2 Setup for contractextraction@gmail.com
 * This will create files directly in contractextraction's Drive
 */

import { google } from 'googleapis';
import * as fs from 'fs/promises';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

dotenv.config();

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets'
];

async function quickOAuthSetup() {
  console.log('🔐 Quick OAuth Setup for contractextraction@gmail.com\n');
  
  // Use the installed OAuth client from Google Cloud Console
  const credentials = {
    "installed": {
      "client_id": "1046962693957-sb8n1jlpenqcqcq3fdagu2m8p1vt3b5s.apps.googleusercontent.com",
      "project_id": "arkansas-contract-agent",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_secret": "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",
      "redirect_uris": ["http://localhost"]
    }
  };
  
  // Save credentials
  await fs.writeFile('credentials.json', JSON.stringify(credentials, null, 2));
  console.log('✅ Created credentials.json\n');
  
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );
  
  // Generate auth URL
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  
  console.log('📋 To authorize contractextraction@gmail.com:\n');
  console.log('1. Open this URL in your browser:');
  console.log('   ' + authUrl);
  console.log('\n2. Sign in with: contractextraction@gmail.com');
  console.log('   Password: Use the regular Gmail password (not app password)');
  console.log('\n3. After authorization, you\'ll be redirected to localhost');
  console.log('4. Copy the "code" parameter from the URL');
  console.log('   Example: http://localhost/?code=YOUR_CODE_HERE&scope=...');
  console.log('\n5. Paste just the code value below:\n');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  rl.question('Enter the authorization code: ', async (code) => {
    rl.close();
    
    try {
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);
      
      // Save token
      await fs.writeFile('token.json', JSON.stringify(tokens, null, 2));
      console.log('\n✅ Token saved to token.json');
      
      // Test the connection
      const drive = google.drive({ version: 'v3', auth: oAuth2Client });
      
      console.log('\n📊 Testing Google Drive access...');
      const about = await drive.about.get({
        fields: 'user,storageQuota'
      });
      
      const quota = about.data.storageQuota;
      const user = about.data.user;
      
      console.log(`   👤 User: ${user?.emailAddress}`);
      console.log(`   📦 Storage Used: ${formatBytes(parseInt(quota?.usage || '0'))}`);
      console.log(`   📊 Storage Limit: ${formatBytes(parseInt(quota?.limit || '0'))}`);
      
      const available = parseInt(quota?.limit || '0') - parseInt(quota?.usage || '0');
      console.log(`   🆓 Available: ${formatBytes(available)}`);
      
      // Create test folder
      console.log('\n📁 Creating Arkansas Net Sheets folder...');
      const folder = await drive.files.create({
        requestBody: {
          name: 'Arkansas Net Sheets',
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id,name,webViewLink'
      });
      
      console.log(`   ✅ Folder created: ${folder.data.name}`);
      console.log(`   🔗 View at: ${folder.data.webViewLink}`);
      
      // Update .env with folder ID
      const envContent = await fs.readFile('.env', 'utf-8');
      const updatedEnv = envContent + `\n# OAuth folder for contractextraction@gmail.com\nGOOGLE_DRIVE_OAUTH_FOLDER_ID=${folder.data.id}\n`;
      await fs.writeFile('.env', updatedEnv);
      
      console.log('\n✅ Setup complete!');
      console.log('   The email monitor can now use OAuth to save files');
      console.log('   Files will be saved to contractextraction@gmail.com\'s Drive');
      
    } catch (error: any) {
      console.error('\n❌ Error:', error.message);
      console.log('\nPlease run the script again and make sure to:');
      console.log('1. Sign in with contractextraction@gmail.com');
      console.log('2. Copy only the code value (not the full URL)');
    }
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Run setup
quickOAuthSetup().catch(console.error);