# Setting Up Google Drive Shared Folder

## Step 1: Create and Share the Folder

1. **Go to Google Drive**: https://drive.google.com
2. **Create a new folder** named "Arkansas Net Sheets"
3. **Right-click the folder** → **Share**
4. **Add this email**: `arkansas-contract-agent@arkansas-contract-agent.iam.gserviceaccount.com`
5. **Set permission to**: **Editor**
6. **Click Send**

## Step 2: Get the Folder ID

1. **Open the folder** you just created
2. **Look at the URL** - it will be something like:
   ```
   https://drive.google.com/drive/folders/1ABC123def456GHI789jkl
   ```
3. **Copy the ID** (the part after `/folders/`)
   In this example: `1ABC123def456GHI789jkl`

## Step 3: Add to .env File

Add this line to your `.env` file:
```
GOOGLE_DRIVE_SHARED_FOLDER_ID=YOUR_FOLDER_ID_HERE
```

## Step 4: Restart the Server

After adding the folder ID to .env, restart the server:
```bash
# Stop the server (Ctrl+C)
# Start it again
npm run server
```

## That's It!

Now when you process contracts, the net sheets will be created in your shared folder where you have full control over them.

The sheets will:
- Be created in YOUR Google Drive folder
- Be fully editable by you
- Be shareable with your clients
- Have professional formatting