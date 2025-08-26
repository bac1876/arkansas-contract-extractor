/**
 * Setup Domain-Wide Delegation for Service Account
 * This allows the service account to impersonate brian@searchnwa.com
 */

import { google } from 'googleapis';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';

dotenv.config();

async function testDomainDelegation() {
  console.log('🔧 Testing Domain-Wide Delegation Setup\n');
  console.log('This allows the service account to act as brian@searchnwa.com\n');
  
  try {
    // Load service account key
    const keyFile = JSON.parse(await fs.readFile('service-account-key.json', 'utf-8'));
    
    console.log('📧 Service Account: ' + keyFile.client_email);
    console.log('🎯 Target User: brian@searchnwa.com\n');
    
    // Create JWT client with subject (user to impersonate)
    const jwtClient = new google.auth.JWT({
      email: keyFile.client_email,
      key: keyFile.private_key,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets'
      ],
      subject: 'brian@searchnwa.com' // Impersonate this user
    });
    
    console.log('🔐 Attempting to authenticate with domain delegation...');
    
    try {
      await jwtClient.authorize();
      console.log('✅ Authentication successful!\n');
      
      const drive = google.drive({ version: 'v3', auth: jwtClient });
      
      // Test 1: Get storage quota as brian@searchnwa.com
      console.log('📊 Checking storage quota for brian@searchnwa.com:');
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
      
      if (available > 1024 * 1024 * 100) { // More than 100MB
        console.log('   ✅ Plenty of storage available!\n');
      }
      
      // Test 2: Create a test file
      console.log('🧪 Testing file creation as brian@searchnwa.com...');
      const sharedFolderId = process.env.GOOGLE_DRIVE_SHARED_FOLDER_ID;
      
      const testFile = await drive.files.create({
        requestBody: {
          name: `Test_Delegation_${Date.now()}.txt`,
          mimeType: 'text/plain',
          parents: sharedFolderId ? [sharedFolderId] : undefined
        },
        media: {
          mimeType: 'text/plain',
          body: 'Test file created via domain delegation'
        },
        fields: 'id,name,owners,webViewLink'
      });
      
      console.log(`   ✅ File created: ${testFile.data.name}`);
      console.log(`   👤 Owner: ${testFile.data.owners?.[0]?.emailAddress}`);
      console.log(`   🔗 Link: ${testFile.data.webViewLink}`);
      
      // Clean up
      await drive.files.delete({ fileId: testFile.data.id! });
      console.log('   🗑️  Test file deleted\n');
      
      console.log('✅ SUCCESS! Domain delegation is working!');
      console.log('\n📝 To use this in the email monitor:');
      console.log('   Update GoogleDriveIntegration to use JWT with subject');
      
    } catch (error: any) {
      console.log('❌ Domain delegation failed:', error.message);
      
      if (error.message?.includes('unauthorized_client')) {
        console.log('\n⚠️  Domain-wide delegation is not configured.');
        console.log('\n📋 To enable domain delegation:');
        console.log('1. Go to Google Admin Console (admin.google.com)');
        console.log('2. Navigate to Security > API Controls > Domain-wide Delegation');
        console.log('3. Add the service account with these scopes:');
        console.log(`   Client ID: ${keyFile.client_id || 'Check in Google Cloud Console'}`);
        console.log('   Scopes:');
        console.log('   - https://www.googleapis.com/auth/drive');
        console.log('   - https://www.googleapis.com/auth/spreadsheets');
        console.log('\n   Note: This requires Google Workspace admin access.');
      } else if (error.message?.includes('invalid_grant')) {
        console.log('\n⚠️  Cannot impersonate brian@searchnwa.com');
        console.log('   This email might not be in a Google Workspace domain,');
        console.log('   or domain delegation is not properly configured.');
      }
      
      // Try alternative approach
      console.log('\n🔄 Alternative Solution: Use Application Default Credentials');
      console.log('   1. Install gcloud CLI');
      console.log('   2. Run: gcloud auth application-default login --impersonate-service-account=brian@searchnwa.com');
      console.log('   3. This will allow local testing with user credentials');
    }
    
  } catch (error: any) {
    console.error('❌ Setup failed:', error.message);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Run test
testDomainDelegation().catch(console.error);