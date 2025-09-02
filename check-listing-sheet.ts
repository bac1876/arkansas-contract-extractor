import { google } from 'googleapis';
import * as fs from 'fs';

async function checkSheet() {
  const credentialsPath = 'service-account-key.json';
  
  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: '1OQCak69VSAuAlP3B1PxeRepLXsD5Kn5l2MF-Czjklxw',
    range: 'Sheet1!A1:C15'
  });
  
  console.log('📊 Listing Info Sheet contents:');
  console.log('Headers:', response.data.values?.[0]);
  console.log('\nData rows:');
  response.data.values?.slice(1).forEach((row: any, i: number) => {
    if (row.length >= 3) {
      const address = row[0];
      const taxes = row[1];
      const commission = row[2];
      console.log(`Row ${i+2}:`);
      console.log(`  Address: ${address}`);
      console.log(`  Taxes: ${taxes} (parsed: ${parseFloat(String(taxes).replace(/[^0-9.]/g, ''))})`);
      console.log(`  Commission: ${commission}% (as decimal: ${parseFloat(String(commission).replace(/[^0-9.]/g, '')) / 100})`);
    }
  });
}

checkSheet().catch(console.error);