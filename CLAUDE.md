# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Arkansas Contract Agent project.

## Project Information

**Arkansas Real Estate Contract Extraction System**
- Extracts data from PDF contracts using GPT-4 Vision API
- Main script: `extract-all-fields-complete.ts`
- Test contract: `test_contract2.pdf`
- Status: COMPLETE - 100% extraction of needed fields

## CRITICAL REMINDERS - MUST READ!

### DO NOT EXTRACT (User has been VERY clear):
1. **SELLER INFORMATION** - User said 5+ times they don't need this! NEVER extract sellers.
2. **EARNEST MONEY AMOUNT/HOLDER** - If not in contract, leave null. Don't search for it.
3. **AGENCY DATA** - Skip pages 2-3 entirely. No agency information needed.

### IMPORTANT PAGE MAPPING:
- **See CONTRACT_PAGE_MAPPING.md for complete paragraph locations**
- Key pages:
  - Page 6: Para 11 (Survey), Para 13 (Items included/excluded)  
  - Page 8: Para 15 (HOME WARRANTY)
  - Page 10: Para 19 (TERMITE CONTROL)
  - Page 12: Para 22 (CLOSING DATE)
  - Page 14: Para 32 (OTHER - buyer agency fees)
  - Page 16: Para 38 (Expiration), Selling agent info

### Current Performance:
- ✅ 90% technical extraction (37/41 fields) = 100% of what user needs
- ✅ Para 13 extraction WORKING (extracts "fridge" and "curtains")
- ✅ All dates, checkboxes, and financial terms working

## Commands

### Run Extraction:
```bash
node -r ts-node/register extract-all-fields-complete.ts test_contract2.pdf
```

### Convert PDF to Images (if needed):
```bash
node -r ts-node/register convert-contract2-to-images.ts
```

### Images Location:
- Contract 2 images: `./contract2_pages/page1.png` through `page16.png`

## Architecture & Key Files

### Main Files:
- `extract-all-fields-complete.ts` - Main extraction script (USE THIS!)
- `SAVEPOINT_CURRENT_STATE.md` - Detailed state documentation
- `test_contract2_COMPLETE.json` - Latest extraction results

### Approach:
- **Hybrid**: Vision API for ALL pages (checkboxes need visual detection)
- **Page-by-page**: Each page extracted with specific prompts
- **Output**: JSON + timestamped CSV (format: `name_COMPLETE_YYYY-MM-DDTHH-MM-SS.csv`)

## Test Contract Details
- **File**: test_contract2.pdf
- **Type**: CASH purchase for $300,000
- **Buyers**: Brian Curtis, Lisa Brown
- **Property**: 5806 W Walsh Lane Rogers, AR 72758

## Rules for this project
- for this project no coding without discussion
- STOP just doing placeholder things - it NEVER works out and then we are more messed up
- please note and please stop offering local solutions it just makes things harder to deceipher too many choices
- when you tell me something is fixed it needs to have been tested as the end user at a minimum you need to ask me if you want me to test - i do not want anything claiming to work that has not been tested as the end user
- railway uses my github credentials use github credentials anytime you need to get into railway
- when you read logs read them carefully and fully do not make any assumptions
- so dont EVER tell me something is working unless you know it is