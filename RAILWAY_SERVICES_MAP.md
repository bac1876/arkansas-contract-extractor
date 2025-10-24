# Railway Services Mapping

**CRITICAL: DO NOT CONFUSE THESE DEPLOYMENTS**

## Railway Service Names and Email Accounts

### Service 1: Courageous Appreciation
- **Email Account:** `contractextraction@gmail.com`
- **Script:** `npm run start:offer`
- **Environment Variables Required:**
  - `EMAIL_USER=contractextraction@gmail.com`
  - `EMAIL_PASSWORD=<app password for contractextraction@gmail.com>`
  - `EMAIL_HOST=imap.gmail.com`
  - `EMAIL_PORT=993`
  - All standard OpenAI, Google Sheets, Google Drive variables

### Service 2: Determined Embrace
- **Email Account:** `offers@searchnwa.com`
- **Script:** `npm run start` (or `npm run start:offer` - both work)
- **Environment Variables Required:**
  - `EMAIL_USER=offers@searchnwa.com`
  - `EMAIL_PASSWORD=<app password for offers@searchnwa.com>`
  - `EMAIL_HOST=imap.gmail.com`
  - `EMAIL_PORT=993`
  - All standard OpenAI, Google Sheets, Google Drive variables

## Quick Reference
```
Courageous Appreciation = contractextraction@gmail.com
Determined Embrace      = offers@searchnwa.com
```

## Current Status (as of 2025-10-24)

### Courageous Appreciation Status
- **Status:** ✅ FIXED - Email-back functionality restored
- **What it does:**
  - Monitors contractextraction@gmail.com via IMAP
  - Extracts contract data from PDF attachments
  - Generates offer sheet (agent info sheet)
  - **Emails offer sheet + original contract back to sender**
- **How it works:** email-monitor.ts detects when running as contractextraction@gmail.com and automatically sends emails back using nodemailer

### Determined Embrace Status
- **Status:** ✅ Working at 100%
- **What it does:**
  - Monitors offers@searchnwa.com via IMAP
  - Extracts contract data from PDF attachments
  - Generates seller net sheets
  - Uploads to Google Drive
- **Recent Fix:** Address normalization for highway variations

---

## Key Difference Between Services

**Both services run the SAME code (email-monitor.ts) but behave differently based on EMAIL_USER:**

| Feature | Courageous Appreciation | Determined Embrace |
|---------|------------------------|-------------------|
| Email Account | contractextraction@gmail.com | offers@searchnwa.com |
| Generates | Offer Sheet | Seller Net Sheet |
| Emails Back | ✅ YES | ❌ NO |
| Uploads to Drive | ❌ NO | ✅ YES |

**This mapping must NEVER be confused. Both services run the same code but monitor different email accounts based on their environment variables.**
