const XLSX = require('xlsx');
const fs = require('fs');

// Read the Excel file
const workbook = XLSX.readFile('Seller Net Sheet 2025.xlsx');

console.log('=== SELLER NET SHEET 2025 ===\n');
console.log('Sheet Names:', workbook.SheetNames);
console.log('\n');

// Process each sheet
workbook.SheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---\n`);
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON for easy reading
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    // Print all non-empty rows
    jsonData.forEach((row, index) => {
        // Check if row has any non-empty values
        if (row.some(cell => cell !== '')) {
            console.log(`Row ${index + 1}:`, row.filter(cell => cell !== '').join(' | '));
        }
    });
    
    console.log('\n--- Formatted Data ---\n');
    
    // Try to get structured data
    const structuredData = XLSX.utils.sheet_to_json(worksheet);
    structuredData.forEach((row, index) => {
        console.log(`Entry ${index + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
            if (value) {
                console.log(`  ${key}: ${value}`);
            }
        });
        console.log();
    });
});

// Also save as JSON for easier processing
const allData = {};
workbook.SheetNames.forEach(sheetName => {
    allData[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
});

fs.writeFileSync('seller-net-sheet-data.json', JSON.stringify(allData, null, 2));
console.log('\nData also saved to seller-net-sheet-data.json');