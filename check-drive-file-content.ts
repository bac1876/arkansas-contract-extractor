import { google } from 'googleapis';
import { getGoogleCredentials } from './google-auth-helper';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkDriveFileContent() {
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
  
  try {
    // Get recent CSV files
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    
    const response = await drive.files.list({
      q: `modifiedTime > '${twoHoursAgo.toISOString()}' and trashed = false`,
      orderBy: 'modifiedTime desc',
      fields: 'files(id, name, modifiedTime, mimeType)',
      pageSize: 10,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      driveId: sharedDriveId,
      corpora: 'drive'
    });
    
    if (!response.data.files || response.data.files.length === 0) {
      console.log('No recent files found');
      return;
    }
    
    console.log('Recent files:');
    response.data.files.forEach(f => {
      console.log(`  - ${f.name} (${f.mimeType})`);
    });
    
    // Find a CSV or HTML netsheet file to examine
    const netsheetFile = response.data.files.find(f => 
      f.name?.includes('netsheet') && (f.mimeType === 'text/csv' || f.mimeType === 'text/html')
    );
    
    if (!netsheetFile) {
      console.log('\nNo netsheet CSV or HTML files found');
      return;
    }
    
    console.log(`\n📄 Checking content of: ${netsheetFile.name}`);
    console.log(`   Modified: ${new Date(netsheetFile.modifiedTime!).toLocaleString()}\n`);
    
    // Download the file content
    const fileContent = await drive.files.get({
      fileId: netsheetFile.id!,
      alt: 'media',
      supportsAllDrives: true
    }, {
      responseType: 'text'
    });
    
    console.log('File Content:');
    console.log('============');
    console.log(fileContent.data);
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

checkDriveFileContent().catch(console.error);