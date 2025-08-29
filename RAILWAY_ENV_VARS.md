# Railway Environment Variables Setup

## Instructions
1. Go to Railway Dashboard
2. Click on your arkansas-contract-agent project
3. Go to "Variables" tab
4. Click "Raw Editor" 
5. Copy and paste ALL of the following:

```env
# OpenAI API Configuration
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE

# Model Settings
OPENAI_MODEL=gpt-4-turbo-preview
MAX_TOKENS=4000
TEMPERATURE=0.1

# Email Configuration (Primary)
EMAIL_USER=offers@searchnwa.com
EMAIL_PASSWORD=YOUR_GMAIL_APP_PASSWORD_HERE
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993

# Google Sheets & Drive
GOOGLE_SPREADSHEET_ID=1xeiS8rAqYncRKHGp6oiN8n3-Z9lRwLqrAc0PY_RJuhI
GOOGLE_SHARED_DRIVE_ID=0AHKbof5whHFPUk9PVA
GOOGLE_SHEET_TEMPLATE_ID=1NnsVZ_MDjlqOfngvumv0n8JzgfMCsbjC98AkaGhWM50
LISTING_INFO_SHEET_ID=1OQCak69VSAuAlP3B1PxeRepLXsD5Kn5l2MF-Czjklxw

# Google Service Account Key (Base64 encoded)
# To create this value, run in PowerShell:
# [Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account-key.json"))
GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=PUT_BASE64_ENCODED_SERVICE_ACCOUNT_KEY_HERE
```

## Alternative: Set Service Account Key as JSON

Instead of Base64, you can add GOOGLE_SERVICE_ACCOUNT_KEY as a single variable with the entire JSON content:

```
GOOGLE_SERVICE_ACCOUNT_KEY=PASTE_YOUR_SERVICE_ACCOUNT_JSON_HERE
```

## After Adding Variables

1. Click "Save" or "Deploy" 
2. Railway will restart the deployment with the new variables
3. Check the logs to confirm email monitor connects successfully
4. Send a test email to offers@searchnwa.com

## Verification

The logs should show:
- ✅ Email monitor loaded successfully
- ✅ Connected to email server
- 📧 Send contracts to: offers@searchnwa.com

If you see "Missing required environment variables", double-check that all variables are set correctly.