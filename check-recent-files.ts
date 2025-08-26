import { google } from 'googleapis';
import * as dotenv from 'dotenv';
dotenv.config();

async function checkRecentFiles() {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'service-account-key.json',
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  });
  
  const drive = google.drive({ version: 'v3', auth: auth as any });
  const sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID;
  
  console.log('📊 Recent files in Shared Drive:');
  const files = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    corpora: 'drive',
    driveId: sharedDriveId,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    fields: 'files(id,name,createdTime,webViewLink)',
    orderBy: 'createdTime desc',
    pageSize: 5
  });
  
  if (files.data.files && files.data.files.length > 0) {
    files.data.files.forEach(file => {
      console.log(`\n- ${file.name}`);
      console.log(`  Created: ${file.createdTime}`);
      console.log(`  Link: ${file.webViewLink}`);
    });
  } else {
    console.log('No spreadsheets found in Shared Drive');
  }
}

checkRecentFiles().catch(console.error);