/**
 * Reset NetSheets tab to use vertical format
 */

import GoogleSheetsIntegration from './google-sheets-integration';
import * as dotenv from 'dotenv';

dotenv.config();

async function resetNetSheets() {
  try {
    console.log('🔄 Resetting NetSheets to vertical format...\n');
    
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '1xeiS8rAqYncRKHGp6oiN8n3-Z9lRwLqrAc0PY_RJuhI';
    const sheets = new GoogleSheetsIntegration(spreadsheetId);
    
    await sheets.initialize();
    
    // Delete existing NetSheets tab if it exists
    try {
      const spreadsheet = await (sheets as any).sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId
      });
      
      const netSheet = spreadsheet.data.sheets.find((sheet: any) => 
        sheet.properties.title === 'NetSheets'
      );
      
      if (netSheet) {
        console.log('🗑️  Deleting old NetSheets tab...');
        await (sheets as any).sheets.spreadsheets.batchUpdate({
          spreadsheetId: spreadsheetId,
          requestBody: {
            requests: [{
              deleteSheet: {
                sheetId: netSheet.properties.sheetId
              }
            }]
          }
        });
      }
    } catch (error) {
      console.log('No existing NetSheets tab to delete');
    }
    
    // Recreate with vertical format
    console.log('✨ Creating new vertical NetSheets tab...');
    await sheets.initializeSheets();
    
    // Test with sample data
    const sampleNetSheet = {
      sales_price: 400000,
      seller_concessions: 2500,
      taxes_prorated: 521.25,
      commission_seller: 12000,
      buyer_agency_fees: 0,
      closing_fee: 400,
      title_search: 300,
      title_insurance: 850,
      title_recording_fees: 100,
      pest_transfer: 450,
      tax_stamps: 660,
      home_warranty: 695,
      total_costs: 17626.25,
      cash_to_seller: 382373.75,
      calculation_date: new Date().toISOString(),
      days_of_tax: 31,
      tax_per_day: 10
    };
    
    await sheets.appendNetSheetData(
      sampleNetSheet,
      'SAMPLE001',
      '123 Sample Property, City, AR'
    );
    
    console.log('\n✅ NetSheets reset to vertical format!');
    console.log('📊 View at: https://docs.google.com/spreadsheets/d/' + spreadsheetId);
    console.log('\nThe NetSheets tab now has:');
    console.log('  - Column A: Field labels');
    console.log('  - Column B: Blank for spacing');
    console.log('  - Column C: Calculation notes');
    console.log('  - Column D+: Net sheet data (one contract per column)');
    
  } catch (error) {
    console.error('❌ Reset failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  resetNetSheets();
}

export { resetNetSheets };