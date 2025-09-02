import { google } from 'googleapis';
import { getGoogleCredentials } from './google-auth-helper';

async function checkSheetContent() {
  const auth = new google.auth.GoogleAuth({
    keyFile: getGoogleCredentials(),
    scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  
  const drive = google.drive({ version: 'v3', auth: auth as any });
  
  // Find the Arkansas Contract Data sheet
  const response = await drive.files.list({
    q: "name = 'Arkansas Contract Data' and mimeType = 'application/vnd.google-apps.spreadsheet'",
    fields: 'files(id, name, modifiedTime)'
  });
  
  if (response.data.files && response.data.files.length > 0) {
    const file = response.data.files[0];
    console.log(`Found Google Sheet: ${file.name}`);
    console.log(`Last modified: ${new Date(file.modifiedTime!).toLocaleString()}`);
    console.log(`Sheet ID: ${file.id}`);
    
    // Read the sheet content
    const sheets = google.sheets({ version: 'v4', auth: auth as any });
    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId: file.id!,
      range: 'A1:Z20'  // Get first 20 rows, all columns
    });
    
    console.log('\nSheet contents:');
    console.log('=' .repeat(80));
    
    if (sheetData.data.values && sheetData.data.values.length > 0) {
      // Find the most recent entry (likely at the bottom)
      const lastRows = sheetData.data.values.slice(-5);  // Get last 5 rows
      
      console.log('Last 5 entries in the sheet:\n');
      lastRows.forEach((row, i) => {
        const rowNum = sheetData.data.values!.length - 5 + i + 1;
        console.log(`Row ${rowNum}:`);
        row.forEach((cell, j) => {
          if (cell && cell.toString().trim()) {
            console.log(`  Column ${String.fromCharCode(65 + j)}: ${cell}`);
          }
        });
        console.log('');
      });
    } else {
      console.log('Sheet is empty');
    }
  } else {
    console.log('Arkansas Contract Data sheet not found');
  }
}

checkSheetContent().catch(console.error);