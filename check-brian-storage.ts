/**
 * Check Google Drive storage for brian@searchnwa.com
 * This will show the actual storage usage and quota
 */

import { google } from 'googleapis';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkBrianStorage() {
  console.log('🔍 Checking Google Drive storage for brian@searchnwa.com\n');
  
  try {
    // Initialize with service account
    const auth = new google.auth.GoogleAuth({
      keyFile: 'service-account-key.json',
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.metadata.readonly'
      ]
    });
    
    const drive = google.drive({ version: 'v3', auth: auth as any });
    
    // Get the shared folder info
    const sharedFolderId = process.env.GOOGLE_DRIVE_SHARED_FOLDER_ID;
    console.log(`📁 Checking shared folder: ${sharedFolderId}\n`);
    
    if (!sharedFolderId) {
      console.log('❌ No shared folder ID configured');
      return;
    }
    
    try {
      // Get folder details
      const folder = await drive.files.get({
        fileId: sharedFolderId,
        fields: 'id,name,owners,size,quotaBytesUsed,permissions,capabilities,mimeType,createdTime,ownedByMe,shared'
      });
      
      console.log('📁 Folder Information:');
      console.log(`   Name: ${folder.data.name}`);
      console.log(`   ID: ${folder.data.id}`);
      console.log(`   Owner: ${folder.data.owners?.[0]?.emailAddress}`);
      console.log(`   Owner Name: ${folder.data.owners?.[0]?.displayName}`);
      console.log(`   Created: ${folder.data.createdTime}`);
      console.log(`   Shared: ${folder.data.shared}`);
      console.log(`   Can Add Children: ${folder.data.capabilities?.canAddChildren}`);
      
      // Try to get permissions details
      console.log('\n👥 Folder Permissions:');
      const permissions = await drive.permissions.list({
        fileId: sharedFolderId,
        fields: 'permissions(id,emailAddress,role,type,displayName)'
      });
      
      permissions.data.permissions?.forEach(perm => {
        console.log(`   - ${perm.emailAddress || perm.type}: ${perm.role} ${perm.displayName ? `(${perm.displayName})` : ''}`);
      });
      
      // List files in the folder to check what's there
      console.log('\n📂 Files in folder:');
      const fileList = await drive.files.list({
        q: `'${sharedFolderId}' in parents and trashed=false`,
        fields: 'files(id,name,size,mimeType,createdTime,owners)',
        pageSize: 10,
        orderBy: 'createdTime desc'
      });
      
      if (fileList.data.files && fileList.data.files.length > 0) {
        let totalSize = 0;
        fileList.data.files.forEach(file => {
          const size = parseInt(file.size || '0');
          totalSize += size;
          console.log(`   - ${file.name} (${formatBytes(size)}) - ${file.mimeType}`);
        });
        console.log(`\n   Total size of files: ${formatBytes(totalSize)}`);
      } else {
        console.log('   (No files in folder)');
      }
      
      // Try to get storage quota for the owner
      console.log('\n📊 Attempting to check owner\'s storage quota...');
      
      // Create a test file to see the actual error
      console.log('\n🧪 Testing file creation to see exact error...');
      try {
        const testFile = await drive.files.create({
          requestBody: {
            name: `Test_Storage_Check_${Date.now()}.txt`,
            mimeType: 'text/plain',
            parents: [sharedFolderId]
          },
          media: {
            mimeType: 'text/plain',
            body: 'Test content to check storage'
          },
          fields: 'id,name,size,quotaBytesUsed'
        });
        
        console.log(`   ✅ Test file created successfully: ${testFile.data.name}`);
        console.log(`   File ID: ${testFile.data.id}`);
        
        // Delete the test file
        await drive.files.delete({ fileId: testFile.data.id! });
        console.log('   🗑️  Test file deleted');
        console.log('\n✅ Storage is AVAILABLE! Files can be created.');
        
      } catch (error: any) {
        console.log(`   ❌ Cannot create file: ${error.message}`);
        
        if (error.errors) {
          error.errors.forEach((err: any) => {
            console.log(`      Error: ${err.message}`);
            console.log(`      Reason: ${err.reason}`);
            console.log(`      Domain: ${err.domain}`);
          });
        }
        
        // Check if it's really a storage issue
        if (error.message?.includes('storageQuotaExceeded')) {
          console.log('\n⚠️  The error says storage quota exceeded, but let\'s verify...');
          
          // Try to get more info about the account
          console.log('\n📧 Owner email: brian@searchnwa.com');
          console.log('   This appears to be a Google Workspace account');
          console.log('   Workspace accounts typically have 30GB+ storage');
          console.log('\n   Possible issues:');
          console.log('   1. The entire organization might be out of storage');
          console.log('   2. There might be a policy limiting storage');
          console.log('   3. The folder might have special restrictions');
        }
      }
      
      // Try alternative - create in a different location
      console.log('\n🔄 Testing alternative: Create in service account space then move...');
      try {
        // Create file without parent
        const testFile2 = await drive.files.create({
          requestBody: {
            name: `Test_Alternative_${Date.now()}.txt`,
            mimeType: 'text/plain'
          },
          media: {
            mimeType: 'text/plain',
            body: 'Test content'
          },
          fields: 'id,name'
        });
        
        console.log(`   ✅ Created file in root: ${testFile2.data.name}`);
        
        // Try to move to folder
        await drive.files.update({
          fileId: testFile2.data.id!,
          addParents: sharedFolderId,
          fields: 'id,parents'
        });
        
        console.log('   ✅ Moved file to shared folder successfully!');
        
        // Clean up
        await drive.files.delete({ fileId: testFile2.data.id! });
        console.log('   🗑️  Test file deleted');
        
      } catch (error: any) {
        console.log(`   ❌ Alternative approach failed: ${error.message}`);
      }
      
    } catch (error: any) {
      console.error('❌ Error checking folder:', error.message);
      if (error.errors) {
        error.errors.forEach((err: any) => {
          console.log(`   ${err.message}`);
        });
      }
    }
    
  } catch (error: any) {
    console.error('❌ Failed to initialize:', error.message);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Run check
checkBrianStorage().catch(console.error);