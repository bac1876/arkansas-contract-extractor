/**
 * Test accessing public Google Sheet without authentication
 */

async function testPublicSheetAccess() {
  const spreadsheetId = '1OQCak69VSAuAlP3B1PxeRepLXsD5Kn5l2MF-Czjklxw';
  const range = 'Sheet1!A2:C100';
  
  // Method 1: Try without any API key (truly public)
  console.log('Testing Method 1: Direct public access (no API key)...');
  try {
    // For truly public sheets, we can use the export URL
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`;
    console.log(`Fetching from: ${exportUrl}`);
    
    const response = await fetch(exportUrl);
    const data = await response.text();
    console.log('✅ Success! Got CSV data:');
    console.log(data.substring(0, 500)); // Show first 500 chars
    
    // Parse CSV
    const lines = data.split('\n');
    console.log(`\nFound ${lines.length} rows`);
    
    // Show first few rows
    console.log('\nFirst 5 rows:');
    lines.slice(0, 5).forEach((line: string, i: number) => {
      console.log(`Row ${i + 1}: ${line}`);
    });
    
  } catch (error: any) {
    console.error('❌ Method 1 failed:', error.message);
  }
  
  // Method 2: Try with Google Sheets API v4 (requires API key)
  console.log('\n\nTesting Method 2: Google Sheets API v4...');
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_SHEETS_API_KEY;
  
  if (apiKey) {
    try {
      const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
      console.log(`Fetching from API: ${apiUrl.substring(0, 80)}...`);
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      console.log('✅ Success! Got data from API:');
      console.log(`Found ${data.values?.length || 0} rows`);
      
      if (data.values) {
        console.log('\nFirst 5 rows:');
        data.values.slice(0, 5).forEach((row: any[], i: number) => {
          console.log(`Row ${i + 1}: ${row.join(', ')}`);
        });
      }
    } catch (error: any) {
      console.error('❌ Method 2 failed:', error.message);
    }
  } else {
    console.log('⚠️  No API key found for Method 2');
  }
}

testPublicSheetAccess();