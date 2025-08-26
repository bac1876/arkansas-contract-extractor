/**
 * Setup script for Google Sheets integration
 * Creates a new spreadsheet or uses existing one
 */

import GoogleSheetsIntegration from './google-sheets-integration';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function setupGoogleSheets() {
  try {
    console.log('🚀 Setting up Google Sheets integration...\n');
    
    // Use the spreadsheet ID from the user's provided Google Sheet
    // This is the title insurance sheet they shared
    const SPREADSHEET_ID = '1-MsjpEJGBxEu3yw_7_ZigYFEpJOSIX21t8vl5QjqCMI';
    
    console.log(`Using spreadsheet ID: ${SPREADSHEET_ID}`);
    console.log(`URL: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}\n`);
    
    // Initialize Google Sheets integration
    const sheets = new GoogleSheetsIntegration(SPREADSHEET_ID);
    
    // Note: For now, we'll use OAuth2 with user consent
    // To use service account, create service-account-key.json
    console.log('📝 Note: To use Google Sheets integration, you need to:');
    console.log('1. Enable Google Sheets API in Google Cloud Console');
    console.log('2. Create service account credentials');
    console.log('3. Save credentials as service-account-key.json');
    console.log('4. Share the spreadsheet with the service account email\n');
    
    // Save spreadsheet ID to .env
    const envPath = path.join(process.cwd(), '.env');
    let envContent = await fs.readFile(envPath, 'utf-8');
    
    if (!envContent.includes('GOOGLE_SPREADSHEET_ID')) {
      envContent += `\n# Google Sheets Integration\nGOOGLE_SPREADSHEET_ID=${SPREADSHEET_ID}\n`;
      await fs.writeFile(envPath, envContent);
      console.log('✅ Spreadsheet ID saved to .env');
    }
    
    // Create sample service account key template
    const serviceAccountTemplate = {
      type: 'service_account',
      project_id: 'your-project-id',
      private_key_id: 'your-private-key-id',
      private_key: '-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n',
      client_email: 'your-service-account@your-project.iam.gserviceaccount.com',
      client_id: 'your-client-id',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com'
    };
    
    const keyPath = path.join(process.cwd(), 'service-account-key.json.template');
    await fs.writeFile(keyPath, JSON.stringify(serviceAccountTemplate, null, 2));
    console.log('✅ Service account key template created: service-account-key.json.template');
    
    console.log('\n📋 Next steps:');
    console.log('1. Go to Google Cloud Console: https://console.cloud.google.com');
    console.log('2. Create a new project or select existing');
    console.log('3. Enable Google Sheets API');
    console.log('4. Create service account credentials');
    console.log('5. Download JSON key and save as service-account-key.json');
    console.log(`6. Share the spreadsheet with the service account email`);
    console.log(`7. Run: npm run test-sheets`);
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
if (require.main === module) {
  setupGoogleSheets();
}

export { setupGoogleSheets };