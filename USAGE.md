# Arkansas Contract Extraction System - Usage Guide

## 🚀 Quick Start

### 1. Start the Server
```bash
npm start
```

The server will start at `http://localhost:3000`

### 2. Open Your Browser
Navigate to `http://localhost:3000`

### 3. Upload Contracts
- **Drag & Drop**: Simply drag your PDF contract onto the upload area
- **Browse**: Click "Browse Files" to select PDFs from your computer
- **Multiple Files**: You can upload multiple contracts at once

## 📊 What Gets Extracted

The system extracts **21 fields** from Arkansas real estate contracts:

1. **Buyer Names** - All buyer names from Para 1
2. **Property Address** - Complete property address from Para 1
3. **Purchase Price** - Dollar amount from Para 3
4. **Loan Type** - FHA/VA/Conventional/Cash from Para 3
5. **Para 5 Fill-ins** - Custom text entries
6. **Earnest Money** - Yes/No from Para 7
7. **Non-refundable** - Yes/No from Para 8
8. **Title Option** - A/B/C from Para 10
9. **Survey** - Who pays (A=Buyer, B=Seller, C=Split) from Para 11
10. **Para 13 Custom** - Custom written text
11. **Contingency** - Yes/No from Para 14
12. **Home Warranty** - Yes/No from Para 15
13. **Para 16** - Checkbox selection A/B
14. **Para 19 - Termite** ✨ - Checkbox A/B/C (NOW WORKING!)
15. **Para 20 - Lead Paint** - Checkbox selection
16. **Para 22 Date** - Closing date
17. **Possession** - When buyer takes possession from Para 23
18. **Para 32 Custom** - Custom text if any
19. **Para 37** - Checkbox selection
20. **Para 38 Date** - Contract date
21. **Serial Number** - Contract serial from Para 39

## 📥 Download Options

After extraction, you can download results in two formats:

### JSON Format
- Complete structured data
- Perfect for integration with other systems
- Preserves data types (numbers, booleans, arrays)

### CSV Format
- Opens in Excel/Google Sheets
- Easy to share with non-technical users
- One row per field

## 🎯 Special Features

### Para 19 (Termite Control) - Now Fixed!
The system uses advanced pattern recognition to extract Para 19, which was previously problematic due to PDF structure issues.

### High Accuracy
- Uses GPT-4 for intelligent extraction
- Pattern recognition for checkbox detection
- Handles various PDF formats

### Batch Processing
You can upload multiple contracts and process them all at once.

## 🛠️ API Usage (For Developers)

### Single File Extraction
```bash
curl -X POST http://localhost:3000/api/extract \
  -F "contract=@your-contract.pdf"
```

### Batch Extraction
```bash
curl -X POST http://localhost:3000/api/extract-batch \
  -F "contracts=@contract1.pdf" \
  -F "contracts=@contract2.pdf"
```

### Response Format
```json
{
  "success": true,
  "filename": "contract.pdf",
  "extractionRate": 95,
  "data": {
    "para1_buyers": ["John Doe", "Jane Doe"],
    "para1_property": "123 Main St, City, AR 72701",
    "para3_price": 250000,
    "para19": "B",
    // ... all other fields
  },
  "csv": "Field,Value\nBuyers,\"John Doe; Jane Doe\"\n..."
}
```

## 🔧 Troubleshooting

### Server Won't Start
- Make sure you have Node.js installed
- Run `npm install` to install dependencies
- Check that port 3000 is not in use

### Extraction Issues
- Ensure PDF is a valid Arkansas real estate contract
- File must be under 10MB
- PDF must be readable (not password protected)

### Para 19 Shows "Manual Review"
This happens when the pattern doesn't match expected format. The system will flag it for manual review rather than guessing incorrectly.

## 📞 Support

For issues or questions, check the extraction logs in the terminal where you ran `npm start`.

---

**Note**: This system is specifically designed for Arkansas real estate contracts using the standard REALTORS® Association template.