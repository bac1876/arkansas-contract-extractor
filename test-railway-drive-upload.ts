/**
 * Simple test to verify Railway can upload to Google Drive
 * This bypasses all processing and just tries to upload a test file
 */

import { google } from 'googleapis';
import { getGoogleCredentials } from './google-auth-helper';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function testDriveUpload() {
  console.log('🧪 SIMPLE GOOGLE DRIVE UPLOAD TEST');
  console.log('================================\n');
  
  // Check environment variables
  console.log('1️⃣ Checking environment variables:');
  console.log(`   GOOGLE_SHARED_DRIVE_ID: ${process.env.GOOGLE_SHARED_DRIVE_ID ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   GOOGLE_SERVICE_ACCOUNT_KEY: ${process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   GOOGLE_SPREADSHEET_ID: ${process.env.GOOGLE_SPREADSHEET_ID ? '✅ SET' : '❌ NOT SET'}`);
  
  // Get credentials
  console.log('\n2️⃣ Getting Google credentials:');
  const credentialsPath = getGoogleCredentials();
  if (!credentialsPath) {
    console.error('❌ No credentials found!');
    return;
  }
  console.log('✅ Credentials loaded');
  
  try {
    // Initialize Google Auth
    console.log('\n3️⃣ Initializing Google Auth:');
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/drive']
    });
    console.log('✅ Auth initialized');
    
    // Initialize Drive API
    console.log('\n4️⃣ Initializing Drive API:');
    const drive = google.drive({ version: 'v3', auth: auth as any });
    console.log('✅ Drive API initialized');
    
    // Create a simple test file
    console.log('\n5️⃣ Creating test content:');
    const testContent = `Test upload from Railway
Time: ${new Date().toISOString()}
Environment: ${process.env.NODE_ENV || 'development'}
Platform: ${process.platform}`;
    console.log('✅ Test content created');
    
    // Try to upload to shared drive
    const sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID || '0AHKbof5whHFPUk9PVA';
    console.log(`\n6️⃣ Attempting upload to shared drive: ${sharedDriveId}`);
    
    const fileMetadata = {
      name: `railway-test-${Date.now()}.txt`,
      parents: [sharedDriveId]
    };
    
    const media = {
      mimeType: 'text/plain',
      body: testContent
    };
    
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
      supportsAllDrives: true
    });
    
    console.log('\n✅ SUCCESS! File uploaded to Google Drive:');
    console.log(`   File ID: ${response.data.id}`);
    console.log(`   File Name: ${response.data.name}`);
    console.log(`   View Link: ${response.data.webViewLink}`);
    
  } catch (error: any) {
    console.error('\n❌ UPLOAD FAILED!');
    console.error('Error details:', error.message);
    
    if (error.code === 404) {
      console.error('→ Shared drive not found or no access');
    } else if (error.code === 403) {
      console.error('→ Permission denied - check service account permissions');
    } else if (error.code === 401) {
      console.error('→ Authentication failed - check credentials');
    }
    
    console.error('\nFull error:', error);
  }
}

// Run the test
testDriveUpload().catch(console.error);