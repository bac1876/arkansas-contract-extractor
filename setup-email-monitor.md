# Email Monitor Setup Guide

## Quick Setup for contractextraction@gmail.com

### Step 1: Get Gmail App Password
1. Go to https://myaccount.google.com/security
2. Enable 2-factor authentication if not already enabled
3. Click "2-Step Verification" → "App passwords"
4. Generate a new app password for "Mail"
5. Copy the 16-character password (no spaces)

### Step 2: Set Environment Variable
Create a `.env` file in the project directory with:
```
GMAIL_USER=contractextraction@gmail.com
GMAIL_PASSWORD=your-16-char-app-password
```

### Step 3: Start Email Monitor
```bash
npm run email-monitor
```

Or manually:
```bash
node -r ts-node/register email-monitor.ts YOUR_APP_PASSWORD
```

## What Happens Next

1. **Monitor connects** to contractextraction@gmail.com inbox
2. **Watches for emails** with PDF attachments
3. **Automatically extracts** all 47 fields using GPT-5-mini ($0.023/contract)
4. **Saves results** to:
   - `processed_contracts/pdfs/` - Original PDFs
   - `processed_contracts/results/` - JSON extraction results
5. **Dashboard available** at http://localhost:3006/email-dashboard.html

## Testing the System

Send a test email to **contractextraction@gmail.com** with:
- Subject: "Test Contract - [Property Address]"
- Attachment: Any Arkansas real estate contract PDF

The system will:
1. Process the email within seconds
2. Extract all contract data
3. Save results with timestamp
4. Show status in dashboard

## Integration Points

- **Seller Net Sheet**: Coming next (awaiting formula from user)
- **Google Sheets**: Auto-save to spreadsheet (pending setup)
- **Email Response**: Can send results back to sender

## Current Status
✅ Email monitor code complete
✅ IMAP connection ready
✅ Dashboard UI created
⏳ Awaiting Gmail app password
⏳ Google Sheets integration pending