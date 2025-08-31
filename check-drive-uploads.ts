import { google } from 'googleapis';
import { getGoogleCredentials } from './google-auth-helper';

async function checkDriveUploads() {
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
  
  // Get files from last 2 hours
  const twoHoursAgo = new Date();
  twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
  
  const response = await drive.files.list({
    q: `modifiedTime > '${twoHoursAgo.toISOString()}' and trashed = false`,
    orderBy: 'modifiedTime desc',
    fields: 'files(id, name, modifiedTime, mimeType)',
    pageSize: 20
  });
  
  console.log('\n📁 Recent Google Drive uploads (last 2 hours):\n');
  
  if (response.data.files && response.data.files.length > 0) {
    response.data.files.forEach(file => {
      const time = new Date(file.modifiedTime!).toLocaleTimeString();
      const date = new Date(file.modifiedTime!).toLocaleDateString();
      console.log(`  ✅ ${date} ${time} - ${file.name}`);
    });
    console.log(`\nTotal files: ${response.data.files.length}`);
  } else {
    console.log('  ❌ No files uploaded in the last 2 hours');
  }
}

checkDriveUploads().catch(console.error);