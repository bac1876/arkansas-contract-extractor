/**
 * Setup OAuth2 for Google Drive using contractextraction@gmail.com
 * This will allow the app to use the contractextraction account's storage
 */

import { google } from 'googleapis';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

dotenv.config();

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets'
];

const TOKEN_PATH = 'token.json';
const CREDENTIALS_PATH = 'credentials.json';

class OAuthSetup {
  /**
   * Create OAuth2 client and get authorization
   */
  async authorize() {
    try {
      // Check if we have credentials.json
      try {
        await fs.access(CREDENTIALS_PATH);
      } catch {
        console.log('❌ credentials.json not found!');
        console.log('\nTo set up OAuth2:');
        console.log('1. Go to https://console.cloud.google.com');
        console.log('2. Create or select a project');
        console.log('3. Enable Google Drive API and Google Sheets API');
        console.log('4. Create OAuth2 credentials (Desktop application)');
        console.log('5. Download the credentials and save as credentials.json');
        return null;
      }

      const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf-8'));
      const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
      
      const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      // Check if we have a token
      try {
        const token = JSON.parse(await fs.readFile(TOKEN_PATH, 'utf-8'));
        oAuth2Client.setCredentials(token);
        console.log('✅ Using existing token');
        return oAuth2Client;
      } catch {
        // Get new token
        return await this.getNewToken(oAuth2Client);
      }
    } catch (error) {
      console.error('Authorization error:', error);
      return null;
    }
  }

  /**
   * Get new token through authorization flow
   */
  async getNewToken(oAuth2Client: any): Promise<any> {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    
    console.log('🔗 Authorize this app by visiting this url:');
    console.log(authUrl);
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    return new Promise((resolve, reject) => {
      rl.question('Enter the code from that page here: ', async (code) => {
        rl.close();
        try {
          const { tokens } = await oAuth2Client.getToken(code);
          oAuth2Client.setCredentials(tokens);
          // Store token
          await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
          console.log('✅ Token stored to', TOKEN_PATH);
          resolve(oAuth2Client);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Test Google Drive access
   */
  async testDriveAccess(auth: any) {
    const drive = google.drive({ version: 'v3', auth });
    
    try {
      // Get storage quota
      const about = await drive.about.get({
        fields: 'user,storageQuota'
      });
      
      const quota = about.data.storageQuota;
      const user = about.data.user;
      
      console.log('\n📊 Google Drive Account Info:');
      console.log(`   👤 User: ${user?.emailAddress}`);
      console.log(`   📦 Storage Used: ${this.formatBytes(parseInt(quota?.usage || '0'))}`);
      console.log(`   📊 Storage Limit: ${this.formatBytes(parseInt(quota?.limit || '0'))}`);
      console.log(`   🆓 Available: ${this.formatBytes(parseInt(quota?.limit || '0') - parseInt(quota?.usage || '0'))}`);
      
      // Create test folder
      console.log('\n📁 Creating test folder...');
      const folderMetadata = {
        name: 'Arkansas Contract Data - OAuth Test',
        mimeType: 'application/vnd.google-apps.folder'
      };
      
      const folder = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id,name,webViewLink'
      });
      
      console.log(`✅ Test folder created: ${folder.data.name}`);
      console.log(`   🔗 View at: ${folder.data.webViewLink}`);
      
      // Create test spreadsheet
      console.log('\n📊 Creating test spreadsheet...');
      const sheets = google.sheets({ version: 'v4', auth });
      
      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `Test Net Sheet - ${new Date().toISOString()}`
          },
          sheets: [{
            properties: {
              title: 'Net Sheet Data'
            }
          }]
        }
      });
      
      console.log(`✅ Test spreadsheet created: ${spreadsheet.data.properties?.title}`);
      console.log(`   🔗 View at: https://docs.google.com/spreadsheets/d/${spreadsheet.data.spreadsheetId}`);
      
      // Move spreadsheet to folder
      await drive.files.update({
        fileId: spreadsheet.data.spreadsheetId!,
        addParents: folder.data.id!,
        fields: 'id,parents'
      });
      
      console.log('✅ Spreadsheet moved to test folder');
      
      // Store folder ID in .env
      console.log('\n💾 Saving folder ID for future use...');
      const envContent = await fs.readFile('.env', 'utf-8');
      const updatedEnv = envContent.replace(
        /GOOGLE_DRIVE_OAUTH_FOLDER_ID=.*/g,
        `GOOGLE_DRIVE_OAUTH_FOLDER_ID=${folder.data.id}`
      );
      
      if (!updatedEnv.includes('GOOGLE_DRIVE_OAUTH_FOLDER_ID')) {
        await fs.writeFile('.env', envContent + `\n# OAuth Folder for contractextraction@gmail.com\nGOOGLE_DRIVE_OAUTH_FOLDER_ID=${folder.data.id}\n`);
      } else {
        await fs.writeFile('.env', updatedEnv);
      }
      
      console.log('✅ Configuration saved to .env');
      
      return {
        success: true,
        folderId: folder.data.id,
        spreadsheetId: spreadsheet.data.spreadsheetId
      };
      
    } catch (error: any) {
      console.error('❌ Drive access test failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Run setup
async function main() {
  console.log('🔧 Setting up OAuth2 for contractextraction@gmail.com');
  console.log('================================================\n');
  
  const setup = new OAuthSetup();
  const auth = await setup.authorize();
  
  if (auth) {
    console.log('✅ Authorization successful!');
    const result = await setup.testDriveAccess(auth);
    
    if (result.success) {
      console.log('\n✨ Setup complete! The system can now use contractextraction@gmail.com for storage.');
      console.log('   Folder ID:', result.folderId);
      console.log('   Test Spreadsheet ID:', result.spreadsheetId);
    }
  }
}

main().catch(console.error);