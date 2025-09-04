# Railway Deployment Guide - Complete System
*Both Main App + Offer Sheet App*

## 🚀 Quick Deploy (Both Services)

### 1. Update Dockerfile for Combined Services
The existing Dockerfile already supports both apps. Just need to update CMD:

```dockerfile
# Use the combined start script
CMD ["node", "start-combined.js"]
```

### 2. Push to GitHub
```bash
git add .
git commit -m "Deploy both email services to Railway"
git push origin main
```

### 3. Railway Configuration

Railway will auto-deploy. Make sure these environment variables are set:

## 📋 Complete Environment Variables List

### Core Configuration (Required)
```env
# OpenAI API (Required for both apps)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4-turbo-preview
MAX_TOKENS=4000
TEMPERATURE=0.1
```

### Main Email Monitor Variables
```env
# Primary Email Account (offers@searchnwa.com)
EMAIL_USER=offers@searchnwa.com
EMAIL_PASSWORD=ggao mydb xnmt zpfz
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993

# Google Sheets Integration
GOOGLE_SPREADSHEET_ID=1xeiS8rAqYncRKHGp6oiN8n3-Z9lRwLqrAc0PY_RJuhI
GOOGLE_SHARED_DRIVE_ID=0AHKbof5whHFPUk9PVA
GOOGLE_SHEET_TEMPLATE_ID=1NnsVZ_MDjlqOfngvumv0n8JzgfMCsbjC98AkaGhWM50
LISTING_INFO_SHEET_ID=1OQCak69VSAuAlP3B1PxeRepLXsD5Kn5l2MF-Czjklxw

# Dropbox Integration
DROPBOX_ACCESS_TOKEN=sl.u.AF-71NwSlbE2pJPHEKIiUHZNUfa6ZKbocxrPRy07PuVA...
```

### Offer Sheet App Variables
```env
# Offer Sheet Email Account (contractextraction@gmail.com)
OFFER_SHEET_EMAIL=contractextraction@gmail.com
OFFER_SHEET_PASSWORD=wogp iruk bytf hcqx
OFFER_SHEET_HOST=imap.gmail.com
OFFER_SHEET_PORT=993

# Optional: Azure SendGrid (for better deliverability)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyy
SENDGRID_FROM_EMAIL=contractextraction@gmail.com
SENDGRID_FROM_NAME=Arkansas Contract Agent - Offer Sheet
```

### Google Service Account Key
```env
# IMPORTANT: Add your service-account-key.json content
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

# OR as Base64 encoded:
GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Iiw...
```

## 🎯 Service Endpoints

Once deployed, your Railway app provides:

### Health & Status
- `/` - Status dashboard showing both services
- `/health` - JSON health check with service status
- `/api/health` - Alternative health endpoint
- `/status/main` - Main monitor status only
- `/status/offer-sheet` - Offer sheet processor status only

### Testing Endpoints
- `/test-extraction` - Test contract extraction
- `/test-drive` - Test Google Drive upload
- `/test-imagemagick` - Test PDF processing

## 📊 Monitoring Services

### View Combined Logs
```bash
# In Railway Dashboard
Deployments → View Logs
```

### Check Service Status
```
https://your-app.railway.app/
```

Shows:
- Main Email Monitor status
- Offer Sheet Processor status  
- System uptime
- Last check times

### Log Indicators

**Successful startup:**
```
✅ Health check server running on port 3000
✅ Main email monitor running successfully!
✅ Offer Sheet processor running successfully!
✉️ Using Azure SendGrid for offer sheet emails [if configured]
```

**Service emails:**
- Main: `offers@searchnwa.com` → Full processing with Google Sheets
- Offer: `contractextraction@gmail.com` → Quick offer sheets only

## 🔧 Deployment Options

### Option 1: Combined Services (Recommended)
Uses `start-combined.js` to run both services in one container.

**In railway.json:**
```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node start-combined.js",
    "restartPolicyType": "ALWAYS"
  }
}
```

### Option 2: Separate Services
Deploy as two separate Railway services if you prefer isolation.

**Main Service:**
- Start command: `node start.js`
- Uses main EMAIL_* variables

**Offer Service:**
- Start command: `node -r ts-node/register offer-sheet-app/offer-sheet-processor.ts`
- Uses OFFER_SHEET_* variables

## 📈 Scaling & Performance

### Resource Requirements
- **RAM**: 512MB minimum, 1GB recommended
- **CPU**: 0.5 vCPU sufficient
- **Storage**: 1GB for PDFs and temp files

### Processing Times
- **Main App**: 65-80 seconds full extraction + sheets
- **Offer App**: 15-20 seconds for offer sheet only
- **Email Check**: Every 30 seconds (main), Every 5 minutes (offer)

## 🐛 Troubleshooting

### Both services show "error - missing variables"
- Check all required environment variables in Railway
- Verify OPENAI_API_KEY is set (needed by both)

### Main monitor not connecting
- Verify EMAIL_PASSWORD is correct
- Check EMAIL_USER is set to offers@searchnwa.com
- Ensure 2-factor auth is disabled or using app password

### Offer sheet not sending
- Check OFFER_SHEET_PASSWORD is correct
- Verify contractextraction@gmail.com credentials
- If using SendGrid, verify SENDGRID_API_KEY

### "Cannot find module" errors
- Railway should auto-install dependencies
- Check package.json has all required packages
- Try redeploying

### Google Sheets not updating
- Verify GOOGLE_SERVICE_ACCOUNT_KEY is complete JSON
- Check service account has Editor access to sheets
- Verify GOOGLE_SPREADSHEET_ID is correct

## 💰 Cost Estimates

### Railway Pricing
- **Hobby Plan**: $5/month
  - 500 hours included (covers 24/7 running)
  - 8GB RAM, 8 vCPU available
  
### Azure SendGrid (Optional)
- **Free**: 100 emails/day
- **Essentials**: $15/month for 40,000 emails

### Total Monthly Cost
- **Minimum**: $5 (Railway only, using Gmail SMTP)
- **Recommended**: $20 (Railway + SendGrid Essentials)

## 🚀 Quick Commands

### Local Testing Before Deploy
```bash
# Test main monitor only
npm run monitor

# Test offer sheet only  
npm run offer-sheet

# Test both services
npm run start:combined
```

### Deploy to Railway
```bash
git add .
git commit -m "Update services"
git push origin main
```

### Force Redeploy
In Railway Dashboard → Click "Redeploy"

## 📝 Service Architecture

```
Railway Container
├── Health Check Server (Port 3000)
├── Main Email Monitor
│   ├── IMAP: offers@searchnwa.com
│   ├── Process: Full extraction
│   ├── Output: Google Sheets + Drive
│   └── Check: Every 30 seconds
└── Offer Sheet Processor
    ├── IMAP: contractextraction@gmail.com
    ├── Process: Quick offer extraction
    ├── Output: HTML email with PDF
    └── Check: Every 5 minutes
```

## ✅ Deployment Checklist

- [ ] All environment variables added to Railway
- [ ] Google service account key added
- [ ] Both email passwords configured
- [ ] SendGrid API key added (optional)
- [ ] GitHub repo connected to Railway
- [ ] Pushed latest code to main branch
- [ ] Verified health endpoint responds
- [ ] Tested by sending contracts to both emails

## 🆘 Support

### Railway Issues
- Discord: https://discord.gg/railway
- Docs: https://docs.railway.app

### App Issues  
- Check logs in Railway dashboard
- Verify all environment variables
- Test endpoints: /health, /status/*

### Email Issues
- Verify app passwords for Gmail accounts
- Check SendGrid dashboard if using Azure
- Ensure IMAP enabled in Gmail settings

---

**Current Version**: 2.0 - Combined Services
**Last Updated**: December 2024
**Status**: Production Ready 🚀