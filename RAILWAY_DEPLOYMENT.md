# Railway Deployment Guide for Arkansas Contract Agent

## Quick Deploy Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Add Railway deployment configuration"
git push origin main
```

### 2. Deploy to Railway

1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository: `arkansas-contract-agent`
4. Railway will auto-detect the configuration

### 3. Configure Environment Variables

Add these variables in Railway Dashboard → Variables:

```env
# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here

# Email Configuration
EMAIL_USER=offers@searchnwa.com
EMAIL_PASSWORD=your_email_app_password_here
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993

# Google Sheets & Drive
GOOGLE_SPREADSHEET_ID=1xeiS8rAqYncRKHGp6oiN8n3-Z9lRwLqrAc0PY_RJuhI
GOOGLE_SHARED_DRIVE_ID=0AHKbof5whHFPUk9PVA
GOOGLE_SHEET_TEMPLATE_ID=1NnsVZ_MDjlqOfngvumv0n8JzgfMCsbjC98AkaGhWM50
LISTING_INFO_SHEET_ID=1OQCak69VSAuAlP3B1PxeRepLXsD5Kn5l2MF-Czjklxw

# Model Settings
OPENAI_MODEL=gpt-4-turbo-preview
MAX_TOKENS=4000
TEMPERATURE=0.1
```

### 4. Add Google Service Account Key

1. In Railway Dashboard, create a new variable:
   - Name: `GOOGLE_SERVICE_ACCOUNT_KEY`
   - Value: Copy entire contents of your `service-account-key.json` file

OR

2. Base64 encode the file and add as:
   - Name: `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64`
   - Value: Base64 encoded string

### 5. Deploy

Railway will automatically:
- Build the Docker container
- Install dependencies
- Start the email monitor
- Keep it running 24/7
- Auto-restart on crashes

## Monitoring

### View Logs
- Railway Dashboard → Deployments → View Logs
- Real-time log streaming shows extraction progress

### Health Checks
- Railway monitors container health
- Auto-restarts if unhealthy
- Alerts available via Railway notifications

### Metrics
- CPU/Memory usage in Railway dashboard
- Request count and processing times
- Error tracking

## Cost Estimate

- **Hobby Plan**: $5/month
  - 500 hours included (enough for 24/7)
  - 8GB RAM available
  - Auto-scaling

## Troubleshooting

### If emails aren't processing:
1. Check logs for connection errors
2. Verify environment variables are set
3. Ensure Google service account key is valid

### If extraction fails:
1. Check OpenAI API key is valid
2. Monitor API rate limits
3. Review error logs for specific issues

### To restart manually:
```bash
# In Railway Dashboard
Click "Redeploy" button
```

## Local Testing Before Deploy

```bash
# Test with production config
node -r ts-node/register email-monitor.ts
```

## Support

- Railway Discord: https://discord.gg/railway
- Railway Docs: https://docs.railway.app
- Project issues: Check logs in Railway dashboard

---

**Note**: After deployment, the system will run 24/7 without requiring your local computer. Emails will be processed within 30 seconds of arrival, with extraction completing in 65-80 seconds.