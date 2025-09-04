# Azure SendGrid Setup Guide

## Overview
This guide walks you through setting up Azure SendGrid for the Offer Sheet App. SendGrid provides reliable email delivery with better deliverability than regular SMTP.

## Why Use SendGrid?
- ✅ Better email deliverability (avoids spam filters)
- ✅ Professional email sending with tracking
- ✅ Scales automatically with your needs
- ✅ Free tier includes 100 emails/day

## Step-by-Step Setup

### 1. Create Azure Account
1. Go to [portal.azure.com](https://portal.azure.com)
2. Sign up for free account (includes $200 credit)
3. Complete verification process

### 2. Create SendGrid Resource

1. **In Azure Portal:**
   - Click "Create a resource" (+ icon)
   - Search for "SendGrid"
   - Select "SendGrid Email Delivery"
   - Click "Create"

2. **Configure SendGrid:**
   ```
   Subscription: Your Azure subscription
   Resource Group: Create new → "arkansas-contract-rg"
   Name: arkansas-sendgrid
   Location: East US
   Pricing Tier: Free (100 emails/day)
   Contact Information: Fill required fields
   ```
   
3. **Click "Review + Create" → "Create"**
   - Wait 2-3 minutes for deployment

### 3. Get SendGrid API Key

1. **After deployment completes:**
   - Click "Go to resource"
   - In left menu, click "Manage" → Opens SendGrid portal

2. **In SendGrid Portal:**
   - Left menu → Settings → API Keys
   - Click "Create API Key"
   - Name: `arkansas-offer-sheet`
   - API Key Permissions: "Full Access"
   - Click "Create & View"

3. **IMPORTANT: Copy the API key immediately!**
   ```
   Example: SG.xxxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyy
   ```
   ⚠️ You won't see this key again after closing the window!

### 4. Configure Sender Authentication (Optional but Recommended)

1. **In SendGrid Portal:**
   - Settings → Sender Authentication
   - Choose "Single Sender Verification" (easier)
   - Click "Get Started"

2. **Add Sender:**
   ```
   From Email: contractextraction@gmail.com
   From Name: Arkansas Contract Agent
   Reply To: contractextraction@gmail.com
   Company: Your Company Name
   Address: Your Address
   City, State, Zip: Your Location
   Country: United States
   ```

3. **Verify Email:**
   - SendGrid sends verification email
   - Click verification link in email
   - Status changes to "Verified"

## 5. Add to Railway Environment Variables

1. **Go to Railway Dashboard**
2. **Select your project**
3. **Variables tab → Add variables:**

```env
# Azure SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyy
SENDGRID_FROM_EMAIL=contractextraction@gmail.com
SENDGRID_FROM_NAME=Arkansas Contract Agent - Offer Sheet
```

## 6. Deploy and Test

1. **Push changes to GitHub:**
   ```bash
   git add .
   git commit -m "Add SendGrid configuration"
   git push origin main
   ```

2. **Railway auto-deploys**

3. **Check logs in Railway:**
   - Should see: "✉️ Using Azure SendGrid for offer sheet emails"
   - Instead of: "📮 Using Gmail SMTP for offer sheet emails"

## How It Works

The app automatically detects SendGrid:

```typescript
// In azure-email-service.ts
if (process.env.SENDGRID_API_KEY) {
  // Uses SendGrid SMTP
  host: 'smtp.sendgrid.net'
  port: 587
  auth.user: 'apikey'
  auth.pass: SENDGRID_API_KEY
} else {
  // Falls back to Gmail SMTP
}
```

## Testing SendGrid

1. **Send test contract to:** contractextraction@gmail.com
2. **Check Railway logs for:**
   - "📧 Initializing SendGrid email service..."
   - "✅ Offer sheet sent successfully"

## Monitoring Usage

1. **Azure Portal:**
   - Resource → Metrics
   - Shows emails sent, bounces, etc.

2. **SendGrid Portal:**
   - Dashboard → Activity
   - Real-time email status
   - Delivery statistics

## Troubleshooting

### "Authentication failed" error
- Verify API key is copied correctly
- Check key has "Full Access" permissions
- Ensure no extra spaces in Railway variable

### Emails not sending
- Check sender email is verified
- Verify SENDGRID_FROM_EMAIL matches verified sender
- Check SendGrid dashboard for blocks/bounces

### Rate limiting
- Free tier: 100 emails/day
- Upgrade to Essentials ($15/month) for 40,000 emails

## Cost Breakdown

| Tier | Cost | Emails/Month | Best For |
|------|------|--------------|----------|
| Free | $0 | 3,000 | Testing & low volume |
| Essentials | $15 | 40,000 | Production use |
| Pro | $90 | 100,000 | High volume |

## Support Resources

- SendGrid Docs: https://docs.sendgrid.com
- Azure Support: https://azure.microsoft.com/support
- Status Page: https://status.sendgrid.com

## Notes

- The app works perfectly without SendGrid (uses Gmail SMTP)
- SendGrid is optional but provides better deliverability
- All configuration is through environment variables
- No code changes needed - just add the API key!