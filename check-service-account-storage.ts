/**
 * Check and manage service account Google Drive storage
 */

import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkServiceAccountStorage() {
  console.log('🔍 Checking Service Account Google Drive Storage');
  console.log('================================================\n');
  
  try {
    // Initialize auth
    const auth = new google.auth.GoogleAuth({
      keyFile: 'service-account-key.json',
      scopes: ['https://www.googleapis.com/auth/drive']
    });
    
    const drive = google.drive({ version: 'v3', auth: auth as any });
    
    // Get storage quota
    console.log('📊 Getting storage quota information...\n');
    const about = await drive.about.get({
      fields: 'storageQuota, user'
    });
    
    const quota = about.data.storageQuota;
    const user = about.data.user;
    
    console.log(`👤 Service Account: ${user?.emailAddress}`);
    console.log(`📦 Storage Quota:`);
    
    if (quota?.limit) {
      const limitGB = (parseInt(quota.limit) / (1024 * 1024 * 1024)).toFixed(2);
      const usageGB = (parseInt(quota.usage || '0') / (1024 * 1024 * 1024)).toFixed(2);
      const usageInDriveGB = (parseInt(quota.usageInDrive || '0') / (1024 * 1024 * 1024)).toFixed(2);
      const usageInTrashGB = (parseInt(quota.usageInDriveTrash || '0') / (1024 * 1024 * 1024)).toFixed(2);
      
      console.log(`   Total Limit: ${limitGB} GB`);
      console.log(`   Total Usage: ${usageGB} GB`);
      console.log(`   Drive Usage: ${usageInDriveGB} GB`);
      console.log(`   Trash Usage: ${usageInTrashGB} GB`);
      console.log(`   Available: ${(parseFloat(limitGB) - parseFloat(usageGB)).toFixed(2)} GB\n`);
      
      if (parseFloat(usageInTrashGB) > 0) {
        console.log('🗑️  Found files in trash consuming storage!');
      }
    } else {
      console.log('   ❌ Could not retrieve quota information\n');
    }
    
    // List files owned by service account
    console.log('📁 Listing files owned by service account...\n');
    
    const fileList = await drive.files.list({
      q: "'me' in owners and trashed=false",
      fields: 'files(id, name, size, createdTime, mimeType)',
      orderBy: 'quotaBytesUsed desc',
      pageSize: 20
    });
    
    if (fileList.data.files && fileList.data.files.length > 0) {
      console.log(`Found ${fileList.data.files.length} files:\n`);
      
      fileList.data.files.forEach((file, index) => {
        const sizeMB = file.size ? (parseInt(file.size) / (1024 * 1024)).toFixed(2) : '0';
        const type = file.mimeType?.includes('spreadsheet') ? '📊' : 
                     file.mimeType?.includes('folder') ? '📁' : '📄';
        console.log(`${index + 1}. ${type} ${file.name}`);
        console.log(`   Size: ${sizeMB} MB`);
        console.log(`   Created: ${file.createdTime}`);
        console.log(`   ID: ${file.id}\n`);
      });
    } else {
      console.log('No files found owned by service account.\n');
    }
    
    // Check trash
    console.log('🗑️  Checking trash...\n');
    const trashedFiles = await drive.files.list({
      q: "'me' in owners and trashed=true",
      fields: 'files(id, name, size)',
      pageSize: 10
    });
    
    if (trashedFiles.data.files && trashedFiles.data.files.length > 0) {
      console.log(`Found ${trashedFiles.data.files.length} files in trash.\n`);
      
      console.log('Would you like to empty the trash to free up space?');
      console.log('Run: npx ts-node empty-service-account-trash.ts');
    } else {
      console.log('Trash is empty.\n');
    }
    
    // Suggest solutions
    console.log('💡 Solutions to fix storage quota issue:\n');
    console.log('1. Empty the trash if files are found there');
    console.log('2. Delete old test files created by the service account');
    console.log('3. Use OAuth2 authentication instead of service account');
    console.log('4. Store files in your personal Drive (requires OAuth2)');
    
  } catch (error: any) {
    console.error('❌ Error checking storage:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the check
checkServiceAccountStorage().catch(console.error);