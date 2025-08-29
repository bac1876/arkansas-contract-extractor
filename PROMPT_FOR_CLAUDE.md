# Prompt for Continuing Arkansas Contract Extraction Work

I have an Arkansas real estate contract extraction system that uses GPT-5-mini to extract data from PDF contracts sent via email. The system monitors contractextraction@gmail.com, extracts contract data, generates seller net sheets, and uploads to Google Drive.

## Current Working State:
- Extraction working at 61% accuracy (25/41 fields)
- Optimized to skip unnecessary pages (only processes 9 of 17 pages)
- Successfully uploads to Google Drive with proper authentication
- Email monitor uses UNSEEN flag to avoid reprocessing old emails

## Key Technical Details:
- Primary extractor: extraction-gpt5.ts (GPT-5-mini model)
- Email monitor: email-monitor.ts (IMAP connection to Gmail)
- Pages to extract: [1, 4, 5, 6, 7, 8, 12, 14, 16]
- Pages to skip: [2, 3, 9, 10, 11, 13, 15, 17]

## CRITICAL RULES:
1. NEVER extract seller information - I don't need it and have said this many times
2. NEVER delete JSON config files (service-account-key.json is critical)
3. ALWAYS skip pages 2-3 (agency data not needed)
4. Page 13 is actually on physical page 6 (not page 7)

## Recent Issues Fixed:
1. Was processing old emails - fixed by using UNSEEN instead of SINCE date
2. Service account key was accidentally deleted - now restored
3. Was extracting all 17 pages - now optimized to 9 pages only

## To Start System:
```bash
cd "C:\Users\Owner\claude code projects\smthosexp\arkansas-contract-agent"
npm run monitor
```

Then send contracts to: contractextraction@gmail.com

## Files You Should Know About:
- service-account-key.json - Google authentication (DO NOT DELETE)
- processed_emails.json - Tracks processed emails
- extraction-gpt5.ts - Main extraction logic with page skipping
- email-monitor.ts - Email monitoring service

## What I Need Help With:
[Describe your specific need here]

## System Performance:
- Processing time: ~45 seconds per contract
- Extraction rate: 54-66% of fields
- Successfully extracts: buyers, property, purchase details, fees, dates
- Uploads to Google Drive folder: Arkansas Contract Data