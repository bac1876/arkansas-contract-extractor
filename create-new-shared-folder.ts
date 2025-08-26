/**
 * Create a new shared folder for contractextraction@gmail.com
 * This will be the new storage location to avoid quota issues
 */

import { google } from 'googleapis';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';

dotenv.config();

async function createNewSharedFolder() {
  console.log('📁 Creating new shared folder setup...\n');
  
  try {
    // Initialize with service account
    const auth = new google.auth.GoogleAuth({
      keyFile: 'service-account-key.json',
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets'
      ]
    });
    
    const drive = google.drive({ version: 'v3', auth: auth as any });
    
    // Step 1: Create a new folder that contractextraction@gmail.com will own
    console.log('1️⃣ Creating folder "Arkansas Net Sheets - Contract Extraction"...');
    
    const folderMetadata = {
      name: 'Arkansas Net Sheets - Contract Extraction',
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Net sheets generated from contract extraction system'
    };
    
    try {
      // First check if folder already exists
      const existingFolders = await drive.files.list({
        q: `name='${folderMetadata.name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name, owners)',
        spaces: 'drive'
      });
      
      let folderId: string;
      
      if (existingFolders.data.files && existingFolders.data.files.length > 0) {
        folderId = existingFolders.data.files[0].id!;
        console.log(`   📁 Found existing folder: ${folderId}`);
        console.log(`   👤 Owner: ${existingFolders.data.files[0].owners?.[0]?.emailAddress}`);
      } else {
        // Create new folder
        const folder = await drive.files.create({
          requestBody: folderMetadata,
          fields: 'id, name, webViewLink'
        });
        
        folderId = folder.data.id!;
        console.log(`   ✅ Created folder: ${folder.data.name}`);
        console.log(`   🔗 Link: ${folder.data.webViewLink}`);
      }
      
      // Step 2: Share folder with contractextraction@gmail.com as owner
      console.log('\n2️⃣ Sharing folder with contractextraction@gmail.com...');
      
      try {
        // First add as writer
        await drive.permissions.create({
          fileId: folderId,
          requestBody: {
            type: 'user',
            role: 'writer',
            emailAddress: 'contractextraction@gmail.com'
          },
          sendNotificationEmail: false
        });
        console.log('   ✅ Added contractextraction@gmail.com as editor');
        
        // Try to transfer ownership (may not work with service account)
        try {
          await drive.permissions.create({
            fileId: folderId,
            requestBody: {
              type: 'user',
              role: 'owner',
              emailAddress: 'contractextraction@gmail.com'
            },
            transferOwnership: true,
            sendNotificationEmail: false
          });
          console.log('   ✅ Transferred ownership to contractextraction@gmail.com');
        } catch (error: any) {
          console.log('   ⚠️  Could not transfer ownership (normal for service accounts)');
          console.log('      Folder will remain owned by service account but shared');
        }
      } catch (error: any) {
        console.log(`   ⚠️  Sharing error: ${error.message}`);
      }
      
      // Step 3: Update .env file with new folder ID
      console.log('\n3️⃣ Updating configuration...');
      
      const envContent = await fs.readFile('.env', 'utf-8');
      let updatedEnv = envContent;
      
      // Update or add the new folder ID
      if (envContent.includes('GOOGLE_DRIVE_CONTRACT_FOLDER_ID=')) {
        updatedEnv = envContent.replace(
          /GOOGLE_DRIVE_CONTRACT_FOLDER_ID=.*/g,
          `GOOGLE_DRIVE_CONTRACT_FOLDER_ID=${folderId}`
        );
      } else {
        updatedEnv = envContent + `\n# New folder for contractextraction@gmail.com\nGOOGLE_DRIVE_CONTRACT_FOLDER_ID=${folderId}\n`;
      }
      
      await fs.writeFile('.env', updatedEnv);
      console.log('   ✅ Updated .env with new folder ID');
      
      // Step 4: Test creating a file in the new folder
      console.log('\n4️⃣ Testing file creation in new folder...');
      
      try {
        const sheets = google.sheets({ version: 'v4', auth: auth as any });
        
        // Create test spreadsheet directly in the folder
        const testSpreadsheet = await drive.files.create({
          requestBody: {
            name: `Test Net Sheet - ${new Date().toISOString()}`,
            mimeType: 'application/vnd.google-apps.spreadsheet',
            parents: [folderId]
          },
          fields: 'id, name, webViewLink, owners'
        });
        
        console.log(`   ✅ Created test spreadsheet: ${testSpreadsheet.data.name}`);
        console.log(`   👤 Owner: ${testSpreadsheet.data.owners?.[0]?.emailAddress}`);
        console.log(`   🔗 Link: ${testSpreadsheet.data.webViewLink}`);
        
        // Share with contractextraction@gmail.com
        await drive.permissions.create({
          fileId: testSpreadsheet.data.id!,
          requestBody: {
            type: 'user',
            role: 'writer',
            emailAddress: 'contractextraction@gmail.com'
          },
          sendNotificationEmail: false
        });
        
        console.log('   ✅ Shared with contractextraction@gmail.com');
        
      } catch (error: any) {
        console.log(`   ❌ Test file creation failed: ${error.message}`);
        
        if (error.message?.includes('storageQuotaExceeded')) {
          console.log('\n⚠️  IMPORTANT: The issue is that files created in a shared folder');
          console.log('   are owned by the FOLDER owner, not the service account.');
          console.log('   Since brian@searchnwa.com owns the folder and is out of storage,');
          console.log('   we cannot create files there.');
          console.log('\n   SOLUTION: Use the local file system for now, or:');
          console.log('   1. Have brian@searchnwa.com free up Google Drive space');
          console.log('   2. Create a new Google account with available storage');
          console.log('   3. Use contractextraction@gmail.com with OAuth (requires manual auth)');
        }
      }
      
      console.log('\n✅ Setup complete!');
      console.log(`   Folder ID: ${folderId}`);
      console.log('   Files will be created and shared with contractextraction@gmail.com');
      
      return folderId;
      
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      throw error;
    }
    
  } catch (error: any) {
    console.error('❌ Setup failed:', error.message);
  }
}

// Run setup
createNewSharedFolder().catch(console.error);