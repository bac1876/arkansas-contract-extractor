import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkFolderDetails() {
  console.log('Checking Folder Details');
  console.log('========================\n');
  
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'service-account-key.json',
      scopes: ['https://www.googleapis.com/auth/drive']
    });
    
    const drive = google.drive({ version: 'v3', auth: auth as any });
    const folderId = process.env.GOOGLE_DRIVE_SHARED_FOLDER_ID;
    
    console.log('Folder ID:', folderId);
    
    // Get folder details
    const folder = await drive.files.get({
      fileId: folderId!,
      fields: 'id, name, mimeType, owners, permissions, shared, ownedByMe, capabilities'
    });
    
    console.log('\nFolder Details:');
    console.log('  Name:', folder.data.name);
    console.log('  Type:', folder.data.mimeType);
    console.log('  Owner:', folder.data.owners?.[0]?.emailAddress);
    console.log('  Shared:', folder.data.shared);
    console.log('  Owned by service account:', folder.data.ownedByMe);
    
    console.log('\nFolder Permissions:');
    if (folder.data.permissions) {
      folder.data.permissions.forEach((perm: any) => {
        console.log(`  - ${perm.role}: ${perm.emailAddress || perm.type} (id: ${perm.id})`);
      });
    }
    
    console.log('\nService Account Capabilities in this folder:');
    const caps = folder.data.capabilities;
    if (caps) {
      console.log('  Can add children:', caps.canAddChildren);
      console.log('  Can edit:', caps.canEdit);
      console.log('  Can share:', caps.canShare);
    }
    
    // Try to create a simple text file instead of a spreadsheet
    console.log('\n🧪 Testing file creation with a simple text file...');
    try {
      const testFile = await drive.files.create({
        requestBody: {
          name: `Test File ${new Date().toISOString()}`,
          mimeType: 'text/plain',
          parents: [folderId!]
        },
        media: {
          mimeType: 'text/plain',
          body: 'This is a test file'
        },
        fields: 'id, name, owners'
      });
      
      console.log('✅ Successfully created text file!');
      console.log('  File ID:', testFile.data.id);
      console.log('  Owner:', testFile.data.owners?.[0]?.emailAddress);
      
      // Clean up - delete the test file
      await drive.files.delete({ fileId: testFile.data.id! });
      console.log('  (Test file deleted)');
      
    } catch (textError: any) {
      console.error('❌ Could not create text file:', textError.message);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkFolderDetails().catch(console.error);