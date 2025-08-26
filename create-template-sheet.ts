/**
 * Helper script to check for or guide creation of template sheet
 * Run this to ensure template sheet exists in the shared folder
 */

import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkOrCreateTemplate() {
  console.log('📋 Template Sheet Setup Helper');
  console.log('================================\n');
  
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'service-account-key.json',
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });
    
    const drive = google.drive({ version: 'v3', auth: auth as any });
    const sharedFolderId = process.env.GOOGLE_DRIVE_SHARED_FOLDER_ID;
    
    if (!sharedFolderId) {
      console.error('❌ GOOGLE_DRIVE_SHARED_FOLDER_ID not set in .env file');
      return;
    }
    
    console.log(`📁 Checking folder: ${sharedFolderId}\n`);
    
    // Look for template sheet
    const searchQuery = `'${sharedFolderId}' in parents and name contains 'Net Sheet Template' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
    
    const results = await drive.files.list({
      q: searchQuery,
      fields: 'files(id, name, webViewLink, owners)',
      pageSize: 5
    });
    
    if (results.data.files && results.data.files.length > 0) {
      console.log('✅ Found existing template sheet!');
      const template = results.data.files[0];
      console.log(`   Name: ${template.name}`);
      console.log(`   ID: ${template.id}`);
      console.log(`   Owner: ${template.owners?.[0]?.emailAddress}`);
      console.log(`   Link: ${template.webViewLink}\n`);
      
      // Save template ID to env
      console.log('💾 Template ID:', template.id);
      console.log('\nAdd this to your .env file:');
      console.log(`GOOGLE_SHEET_TEMPLATE_ID=${template.id}`);
      
      return template.id;
    } else {
      console.log('⚠️  No template sheet found in the folder.\n');
      console.log('📝 Please create a template sheet manually:\n');
      console.log('1. Go to your Google Drive folder:');
      console.log(`   https://drive.google.com/drive/folders/${sharedFolderId}\n`);
      console.log('2. Create a new Google Sheet named "Net Sheet Template"\n');
      console.log('3. Add these headers in the first row:');
      console.log('   A1: SELLER NET SHEET');
      console.log('   (Leave the rest blank - the code will populate it)\n');
      console.log('4. Run this script again to get the template ID\n');
      console.log('5. Add the template ID to your .env file');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    
    if (error.message?.includes('404')) {
      console.log('\n⚠️  Could not access the folder. Please check:');
      console.log('1. The folder ID is correct');
      console.log('2. The service account has access to the folder');
    }
  }
}

checkOrCreateTemplate().catch(console.error);