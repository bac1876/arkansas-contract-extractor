import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkRecentUploads() {
  try {
    const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
    if (!keyBase64) {
      console.error('❌ Missing GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 environment variable');
      return;
    }
    
    const keyJson = JSON.parse(Buffer.from(keyBase64, 'base64').toString('utf-8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials: keyJson,
      scopes: ['https://www.googleapis.com/auth/drive']
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    const folderId = '1_r32aLbcQTDvptqPLBZ3r0viNygRKlrP';
    
    console.log('🔍 Checking Google Drive for recent uploads...');
    console.log(`📁 Folder ID: ${folderId}`);
    
    // Get files created in the last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const response = await drive.files.list({
      q: `'${folderId}' in parents and createdTime > '${twoHoursAgo.toISOString()}'`,
      fields: 'files(id, name, createdTime, size, mimeType)',
      orderBy: 'createdTime desc',
      pageSize: 20
    });
    
    console.log(`\n📊 Files uploaded in the last 2 hours:`);
    
    if (response.data.files && response.data.files.length > 0) {
      response.data.files.forEach(file => {
        const created = new Date(file.createdTime!);
        const ageMinutes = Math.floor((Date.now() - created.getTime()) / 1000 / 60);
        const ageDisplay = ageMinutes < 60 ? `${ageMinutes} minutes` : `${Math.floor(ageMinutes/60)} hours`;
        
        const type = file.mimeType?.includes('pdf') ? '📄 PDF' : 
                     file.mimeType?.includes('csv') ? '📊 CSV' : 
                     file.mimeType?.includes('sheet') ? '📋 Sheet' : '📎 File';
        
        console.log(`   ${type} ${file.name}`);
        console.log(`      Created: ${ageDisplay} ago`);
        console.log(`      Size: ${file.size ? (parseInt(file.size) / 1024).toFixed(1) + ' KB' : 'Unknown'}`);
        console.log('');
      });
      
      // Check the most recent file if it's a CSV
      const mostRecent = response.data.files[0];
      if (mostRecent.mimeType?.includes('csv') || mostRecent.name?.endsWith('.csv')) {
        console.log(`\n📥 Downloading most recent CSV to check content: ${mostRecent.name}`);
        
        try {
          const fileContent = await drive.files.get({
            fileId: mostRecent.id!,
            alt: 'media'
          }, { responseType: 'stream' });
          
          let content = '';
          await new Promise((resolve, reject) => {
            fileContent.data
              .on('data', (chunk: any) => content += chunk)
              .on('end', resolve)
              .on('error', reject);
          });
          
          console.log('\n📋 CSV Content (first 500 chars):');
          console.log(content.substring(0, 500));
          
          // Check if values are empty
          if (content.includes('$0.00') || content.includes(',,,,')) {
            console.log('\n⚠️  WARNING: CSV contains empty or $0.00 values - extraction may have failed!');
          } else {
            console.log('\n✅ CSV appears to contain extracted data');
          }
        } catch (error) {
          console.error('Could not download file content:', error.message);
        }
      }
      
    } else {
      console.log('   ❌ No files uploaded in the last 2 hours');
      console.log('   The Railway deployment may not be processing emails correctly');
    }
    
  } catch (error) {
    console.error('❌ Error checking Google Drive:', error);
  }
}

checkRecentUploads();