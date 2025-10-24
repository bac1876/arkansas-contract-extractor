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
- **Issue:** Missing `EMAIL_PASSWORD` environment variable
- **Fix Needed:** Add EMAIL_PASSWORD in Railway dashboard for this service

### Determined Embrace Status
- **Status:** ✅ Working at 100%
- **Recent Fix:** Address normalization for highway variations

---

**This mapping must NEVER be confused. Both services run the same code but monitor different email accounts based on their environment variables.**
