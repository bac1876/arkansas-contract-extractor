/**
 * Alternative approach: Create a CSV file and import it
 */

import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

async function testAlternativeApproach() {
  console.log('🧪 Testing Alternative Approach - CSV Import');
  console.log('================================================\n');
  
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'service-account-key.json',
      scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets']
    });
    
    const drive = google.drive({ version: 'v3', auth: auth as any });
    const sheets = google.sheets({ version: 'v4', auth: auth as any });
    
    const sharedFolderId = process.env.GOOGLE_DRIVE_SHARED_FOLDER_ID;
    
    // Check if we can update an existing sheet instead of creating new ones
    console.log('📋 Checking for existing template sheet in folder...\n');
    
    const existingSheets = await drive.files.list({
      q: `'${sharedFolderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
      fields: 'files(id, name, owners)',
      pageSize: 10
    });
    
    if (existingSheets.data.files && existingSheets.data.files.length > 0) {
      console.log(`Found ${existingSheets.data.files.length} existing sheets in the folder:\n`);
      
      existingSheets.data.files.forEach((file, index) => {
        const owner = file.owners?.[0]?.emailAddress || 'unknown';
        console.log(`${index + 1}. ${file.name}`);
        console.log(`   ID: ${file.id}`);
        console.log(`   Owner: ${owner}\n`);
      });
      
      // Try to copy an existing sheet (which won't count against service account quota)
      const templateSheet = existingSheets.data.files[0];
      console.log(`🔄 Attempting to copy existing sheet as template: ${templateSheet.name}`);
      
      try {
        const copiedFile = await drive.files.copy({
          fileId: templateSheet.id!,
          requestBody: {
            name: `Net Sheet Copy Test - ${new Date().toISOString()}`,
            parents: [sharedFolderId]
          }
        });
        
        console.log('✅ Successfully copied sheet!');
        console.log(`   New Sheet ID: ${copiedFile.data.id}`);
        console.log(`   Link: https://docs.google.com/spreadsheets/d/${copiedFile.data.id}/edit`);
        
        // Now we can update this sheet with our data
        console.log('\n📝 This approach works! We can:');
        console.log('1. Keep a template sheet in the folder (owned by you)');
        console.log('2. Copy it for each new net sheet');
        console.log('3. Update the copy with the actual data');
        console.log('4. This avoids the service account storage quota issue!');
        
      } catch (copyError: any) {
        console.error('❌ Could not copy sheet:', copyError.message);
      }
    } else {
      console.log('No existing sheets found in the folder.');
      console.log('\n💡 Solution: Create a template sheet manually in the folder first.');
      console.log('   Then the service account can copy and modify it.');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testAlternativeApproach().catch(console.error);