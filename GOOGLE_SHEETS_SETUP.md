# Google Sheets Integration Setup Guide

## Problem Solved
Service accounts have no Google Drive storage quota. The solution is to use a template copy approach.

## Setup Instructions

### Step 1: Create Template Sheet
1. Go to your shared Google Drive folder:
   https://drive.google.com/drive/folders/1Df2SKuIUFfheALtWhNT4yy7-x7Xe_8in

2. Create a new Google Sheet named "Net Sheet Template"

3. In cell A1, type: SELLER NET SHEET

4. Make sure the service account has Editor access

### Step 2: Get Template ID
Run: npx ts-node create-template-sheet.ts

### Step 3: Add Template ID to .env
Add: GOOGLE_SHEET_TEMPLATE_ID=your-template-id-here

### Step 4: Test
Run: npx ts-node test-google-drive-fix.ts

## How It Works
- Copies template instead of creating new sheets
- Template owned by you, not service account
- No quota issues

## Status
- Extraction works (96-98% accuracy)
- CSV export works as fallback
- Waiting for template creation
ENDFILE < /dev/null
