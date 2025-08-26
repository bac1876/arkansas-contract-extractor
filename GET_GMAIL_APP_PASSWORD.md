# 🔐 How to Get Gmail App Password for contractextraction@gmail.com

## Important: App Passwords vs Regular Passwords
- **Regular password**: What you use to log into Gmail normally
- **App password**: Special 16-character code for apps (what we need!)

## Step-by-Step Instructions:

### 1. Enable 2-Factor Authentication (Required First!)
1. Sign in to contractextraction@gmail.com
2. Go to https://myaccount.google.com/security
3. Click "2-Step Verification"
4. Follow the setup process (use phone number for codes)

### 2. Generate App Password
1. After 2FA is enabled, go to: https://myaccount.google.com/apppasswords
2. Or from Security page, click "2-Step Verification" → "App passwords"
3. Select app: "Mail"
4. Select device: "Other (Custom name)"
5. Enter name: "Arkansas Contract Extractor"
6. Click "Generate"

### 3. Copy the App Password
- You'll see a 16-character password like: `abcd efgh ijkl mnop`
- Copy it WITHOUT spaces: `abcdefghijklmnop`
- **IMPORTANT**: You'll only see this password once!

### 4. Update the .env File
Replace the current password with your new app password:
```
GMAIL_PASSWORD=abcdefghijklmnop
```

### 5. Test the Connection
```bash
npm run email-monitor
```

## Troubleshooting:

### "Invalid credentials" Error
- Make sure 2FA is enabled first
- Use app password, not regular password
- Remove any spaces from the 16-character code
- Password should be exactly 16 characters (no special chars)

### Can't Find App Passwords Option
- 2-Factor Authentication must be enabled first
- Look under Security → 2-Step Verification → App passwords

### Example of Correct App Password Format:
- ✅ Correct: `xzvqbtyuioplkjhg` (16 lowercase letters)
- ❌ Wrong: `4W2Z84mUB@WhQ&xcd7rpT` (has special characters)
- ❌ Wrong: `abcd efgh ijkl mnop` (has spaces)

## Current Status:
The password in .env (`4W2Z84mUB@WhQ&xcd7rpT`) appears to be:
- Either a regular password (not an app password)
- Or a generated password with special characters

You need a Gmail App Password which is always:
- Exactly 16 characters
- Only lowercase letters
- No spaces or special characters

## Ready to Test?
Once you have the correct app password:
1. Update .env file
2. Run: `npm run email-monitor`
3. Send test email to contractextraction@gmail.com
4. Watch the magic happen! ✨