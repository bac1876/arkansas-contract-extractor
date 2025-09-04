# Getting SendGrid API Key from Azure - Detailed Steps

## Important: Two Portals Involved
Azure SendGrid requires you to work in TWO different portals:
1. **Azure Portal** - Creates the SendGrid resource
2. **SendGrid Portal** - Where you get the actual API key

## Step 1: In Azure Portal (portal.azure.com)

### Find Your SendGrid Resource
1. Go to [portal.azure.com](https://portal.azure.com)
2. In the search bar at top, type "sendgrid"
3. Click on your SendGrid resource (if you already created one)

### OR Create New SendGrid Resource
1. Click **"Create a resource"** (+ icon)
2. Search for **"SendGrid"**
3. Select **"Twilio SendGrid"** (it might say Twilio now - that's correct, Twilio owns SendGrid)
4. Click **"Create"**

### Configure New SendGrid (if creating new):
```
Name: arkansas-sendgrid (or any name)
Subscription: Your subscription
Resource group: Create new or use existing
Location: East US (or your preference)
Pricing tier: Free (100 emails/day)
```

Click **"Review + Create"** then **"Create"**

## Step 2: Access SendGrid Portal (CRITICAL STEP)

After your SendGrid resource is created or if you already have one:

1. **In Azure Portal**, go to your SendGrid resource
2. Look for ONE of these options in the SendGrid resource page:
   
   ### Option A: "Manage" Button
   - Look in the **Overview** page
   - Find a button labeled **"Manage"** or **"Manage Account"**
   - Click it - this opens SendGrid Portal in new tab
   
   ### Option B: Left Menu
   - In the left sidebar menu
   - Look for **"Manage"** or **"Open SaaS Account"**
   - Click it - this opens SendGrid Portal

   ### Option C: Essentials Section
   - In the Overview page
   - Look for **"SaaS subscription"** or **"Manage on provider's site"**
   - Click the link

## Step 3: In SendGrid Portal (app.sendgrid.com)

Once you're in the SendGrid Portal (different website - usually app.sendgrid.com):

### First Time Setup
If this is your first time:
1. You might need to complete account setup
2. Verify your email address
3. Fill in required information

### Get Your API Key

1. **Left Sidebar Menu:**
   - Click **"Settings"** (gear icon)
   - Click **"API Keys"**

2. **Create New API Key:**
   - Click blue button **"Create API Key"**
   - Fill in:
     - **API Key Name:** `arkansas-offer-sheet`
     - **API Key Permissions:** Select **"Full Access"**
   - Click **"Create & View"**

3. **CRITICAL - COPY THE KEY NOW!**
   ```
   Your API key will look like:
   SG.xxxxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
   
   ⚠️ COPY IT IMMEDIATELY!
   ⚠️ You will NEVER see this key again after leaving this page!
   ```

4. **Copy the ENTIRE key** starting with "SG."

## Step 4: Add to Railway

Add this to your Railway environment variables:
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```

## Troubleshooting

### "Can't find Manage button"
- Make sure you're looking at the SendGrid resource in Azure
- Try refreshing the page
- Look for any button/link that says "Portal", "Dashboard", "Manage", or "Open"

### "No API Keys menu in SendGrid"
- Make sure you're in SendGrid Portal (not Azure Portal)
- URL should be `app.sendgrid.com`
- Try: Settings → API Keys
- Or look for "Integrate" → "Web API" → "API Keys"

### "Access Denied in SendGrid Portal"
1. Go back to Azure Portal
2. Find your SendGrid resource
3. Click "Manage" again
4. It might require you to:
   - Set up SSO (Single Sign-On)
   - Create a SendGrid password
   - Verify your email

### "Can't create API Key"
- Your account might need email verification first
- Check for any warning banners at top of SendGrid portal
- Try: Settings → Sender Authentication → Single Sender Verification

## Alternative: Direct SendGrid Signup (Easier!)

If Azure is too complicated, you can sign up directly with SendGrid:

1. Go to [sendgrid.com](https://sendgrid.com)
2. Click "Start for Free"
3. Create account (use different email than contractextraction@gmail.com)
4. Verify your email
5. In dashboard: Settings → API Keys → Create API Key
6. Copy the key and add to Railway

**Note:** Direct signup gives you same free tier (100 emails/day) without Azure complexity!

## Quick Check: Do You See This?

In Azure Portal, your SendGrid resource page should show:
```
Resource name: your-sendgrid-name
Status: Active
Subscription: Your subscription
Publisher: Twilio Inc. (or SendGrid)

[Manage] or [Open SaaS Account] button <- CLICK THIS!
```

## Still Stuck?

The easiest solution is to:
1. Forget Azure SendGrid
2. Sign up directly at sendgrid.com
3. Get API key from there
4. It works exactly the same!

The app doesn't care where the SendGrid API key comes from - Azure or direct signup both work!