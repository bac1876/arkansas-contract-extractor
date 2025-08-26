/**
 * Test creating Google Drive folder directly without service account
 * This tests if we can bypass the quota issue
 */

import { google } from 'googleapis';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';

dotenv.config();

async function testDirectDriveAccess() {
  console.log('🔍 Testing Google Drive access options...\n');
  
  try {
    // Check service account current status
    console.log('1️⃣ Checking service account status...');
    
    const auth = new google.auth.GoogleAuth({
      keyFile: 'service-account-key.json',
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets'
      ]
    });
    
    const drive = google.drive({ version: 'v3', auth: auth as any });
    
    // Get service account info
    const serviceAccountKey = JSON.parse(await fs.readFile('service-account-key.json', 'utf-8'));
    console.log(`   📧 Service Account: ${serviceAccountKey.client_email}`);
    
    // Check about info for service account
    try {
      const about = await drive.about.get({
        fields: 'user,storageQuota'
      });
      
      const quota = about.data.storageQuota;
      console.log(`   📦 Storage Used: ${formatBytes(parseInt(quota?.usage || '0'))}`);
      console.log(`   📊 Storage Limit: ${formatBytes(parseInt(quota?.limit || '0'))}`);
      
      // Service accounts have 15GB free storage
      const available = 15 * 1024 * 1024 * 1024 - parseInt(quota?.usage || '0');
      console.log(`   🆓 Available: ${formatBytes(available)}`);
      
      if (available < 1024 * 1024) { // Less than 1MB
        console.log('   ⚠️  Service account storage is full!');
      } else {
        console.log('   ✅ Service account has storage available');
      }
    } catch (error: any) {
      console.log('   ❌ Could not get service account quota:', error.message);
    }
    
    console.log('\n2️⃣ Checking shared folder permissions...');
    const sharedFolderId = process.env.GOOGLE_DRIVE_SHARED_FOLDER_ID;
    
    if (sharedFolderId) {
      try {
        // Get folder metadata
        const folder = await drive.files.get({
          fileId: sharedFolderId,
          fields: 'id,name,owners,permissions,capabilities'
        });
        
        console.log(`   📁 Folder: ${folder.data.name}`);
        console.log(`   👤 Owner: ${folder.data.owners?.[0]?.emailAddress}`);
        
        // Check if we can create files
        const canCreate = folder.data.capabilities?.canAddChildren;
        console.log(`   ✏️  Can create files: ${canCreate ? 'Yes' : 'No'}`);
        
        // List permissions
        const permissions = await drive.permissions.list({
          fileId: sharedFolderId,
          fields: 'permissions(id,emailAddress,role,type)'
        });
        
        console.log('   👥 Permissions:');
        permissions.data.permissions?.forEach(perm => {
          console.log(`      - ${perm.emailAddress || perm.type}: ${perm.role}`);
        });
        
      } catch (error: any) {
        console.log(`   ❌ Error checking folder: ${error.message}`);
      }
    }
    
    console.log('\n3️⃣ Testing alternate approach - Create in service account root...');
    
    try {
      // Try creating a test file in service account's own space
      const testFile = await drive.files.create({
        requestBody: {
          name: `Test_${Date.now()}.txt`,
          mimeType: 'text/plain'
        },
        media: {
          mimeType: 'text/plain',
          body: 'Test content'
        },
        fields: 'id,name,owners'
      });
      
      console.log(`   ✅ Created test file: ${testFile.data.name}`);
      console.log(`   👤 Owner: ${testFile.data.owners?.[0]?.emailAddress}`);
      
      // Clean up
      await drive.files.delete({ fileId: testFile.data.id! });
      console.log('   🗑️  Test file deleted');
      
      console.log('\n✅ Service account CAN create files in its own space!');
      console.log('   Solution: Create files in service account space, then share them');
      
    } catch (error: any) {
      console.log(`   ❌ Cannot create in service account space: ${error.message}`);
    }
    
    console.log('\n4️⃣ Proposed solution:');
    console.log('   1. Create files in service account\'s own Drive space');
    console.log('   2. Share files with contractextraction@gmail.com');
    console.log('   3. Optionally move to a shared folder later');
    console.log('\n   This avoids the brian@searchnwa.com quota issue!');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  if (bytes < 0) return 'Unlimited';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Run test
testDirectDriveAccess().catch(console.error);