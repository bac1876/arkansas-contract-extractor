import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

async function testTemplateAccess() {
  console.log('Testing Template Access');
  console.log('=======================\n');
  
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'service-account-key.json',
      scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets']
    });
    
    const drive = google.drive({ version: 'v3', auth: auth as any });
    const sheets = google.sheets({ version: 'v4', auth: auth as any });
    
    const templateId = process.env.GOOGLE_SHEET_TEMPLATE_ID;
    console.log('Template ID:', templateId);
    
    // Get template metadata
    const file = await drive.files.get({
      fileId: templateId!,
      fields: 'id, name, owners, permissions, mimeType, size, quotaBytesUsed'
    });
    
    console.log('\nTemplate Details:');
    console.log('  Name:', file.data.name);
    console.log('  Owner:', file.data.owners?.[0]?.emailAddress);
    console.log('  Size:', file.data.size, 'bytes');
    console.log('  Quota Used:', file.data.quotaBytesUsed, 'bytes');
    
    // Check permissions
    console.log('\nPermissions:');
    if (file.data.permissions) {
      file.data.permissions.forEach((perm: any) => {
        console.log(`  - ${perm.role}: ${perm.emailAddress || perm.type}`);
      });
    }
    
    // Try to read the template
    console.log('\nTrying to read template content...');
    const sheetData = await sheets.spreadsheets.get({
      spreadsheetId: templateId!,
      fields: 'properties.title,sheets(properties.title)'
    });
    
    console.log('  Title:', sheetData.data.properties?.title);
    console.log('  Sheets:', sheetData.data.sheets?.map(s => s.properties?.title).join(', '));
    
    console.log('\n✅ Template is accessible!');
    
    // Check Drive quota for the folder owner
    console.log('\nChecking Drive quota...');
    const about = await drive.about.get({
      fields: 'storageQuota'
    });
    
    const quota = about.data.storageQuota;
    if (quota) {
      const limit = parseInt(quota.limit || '0');
      const usage = parseInt(quota.usage || '0');
      console.log('  Service Account Quota:');
      console.log(`    Limit: ${(limit / (1024*1024*1024)).toFixed(2)} GB`);
      console.log(`    Usage: ${(usage / (1024*1024*1024)).toFixed(2)} GB`);
      console.log(`    Available: ${((limit - usage) / (1024*1024*1024)).toFixed(2)} GB`);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testTemplateAccess().catch(console.error);