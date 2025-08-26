import pandas as pd
import json

# Read the Excel file
file_path = 'Seller Net Sheet 2025.xlsx'

try:
    # Read all sheets
    excel_file = pd.ExcelFile(file_path)
    
    print("=== SELLER NET SHEET 2025 ===\n")
    
    for sheet_name in excel_file.sheet_names:
        print(f"\n--- Sheet: {sheet_name} ---\n")
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        
        # Print column headers
        print("Columns:", list(df.columns))
        print()
        
        # Print all rows with data
        for index, row in df.iterrows():
            # Skip completely empty rows
            if not row.dropna().empty:
                print(f"Row {index + 1}:")
                for col, value in row.items():
                    if pd.notna(value):
                        print(f"  {col}: {value}")
                print()
                
except Exception as e:
    print(f"Error reading Excel file: {e}")
    print("\nTrying alternative approach...")
    
    # Try reading just the first sheet
    try:
        df = pd.read_excel(file_path)
        print("\n=== First Sheet Content ===\n")
        print(df.to_string())
    except:
        print("Could not read Excel file with pandas")