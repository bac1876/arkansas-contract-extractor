import { google } from 'googleapis';
import { getGoogleCredentials } from './google-auth-helper';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSharedDrive() {
  const credentialsPath = getGoogleCredentials();
  if (!credentialsPath) {
    console.error('No credentials found');
    return;
  }
  
  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ['https://www.googleapis.com/auth/drive']
  });
  
  const drive = google.drive({ version: 'v3', auth: auth as any });
  
  const sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID || '0AHKbof5whHFPUk9PVA';
  console.log(`\n🔍 Checking Shared Drive: ${sharedDriveId}\n`);
  
  try {
    // Get shared drive info
    const driveInfo = await drive.drives.get({
      driveId: sharedDriveId
    });
    console.log(`📁 Shared Drive Name: ${driveInfo.data.name}\n`);
    
    // List recent files in shared drive
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const response = await drive.files.list({
      q: `modifiedTime > '${oneHourAgo.toISOString()}' and trashed = false`,
      orderBy: 'modifiedTime desc',
      fields: 'files(id, name, modifiedTime, mimeType)',
      pageSize: 20,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      driveId: sharedDriveId,
      corpora: 'drive'
    });
    
    console.log('📄 Recent files in shared drive (last hour):\n');
    
    if (response.data.files && response.data.files.length > 0) {
      response.data.files.forEach(file => {
        const time = new Date(file.modifiedTime!).toLocaleTimeString();
        const date = new Date(file.modifiedTime!).toLocaleDateString();
        console.log(`  ✅ ${date} ${time} - ${file.name}`);
      });
      console.log(`\nTotal files: ${response.data.files.length}`);
    } else {
      console.log('  ❌ No files uploaded to shared drive in the last hour');
    }
    
  } catch (error: any) {
    console.error('❌ Error accessing shared drive:', error.message);
    if (error.code === 404) {
      console.error('   The shared drive ID might be incorrect or you might not have access');
    }
  }
}

checkSharedDrive().catch(console.error);