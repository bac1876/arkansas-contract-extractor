# Deploy to Railway - Step by Step

## Prerequisites
1. GitHub account with the repository
2. Railway account (sign up at railway.app)
3. OpenAI API key with GPT-4 Vision access

## Step 1: Push to GitHub

1. Create a new repository on GitHub (e.g., `arkansas-contract-extractor`)
2. Add the remote and push:
```bash
git remote add origin https://github.com/YOUR_USERNAME/arkansas-contract-extractor.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account if not already connected
5. Select your repository: `arkansas-contract-extractor`
6. Railway will automatically detect the Dockerfile

## Step 3: Configure Environment Variables

1. In Railway dashboard, click on your deployed service
2. Go to "Variables" tab
3. Add the following:
   - Click "New Variable"
   - Name: `OPENAI_API_KEY`
   - Value: `your-openai-api-key-here`
4. The service will automatically redeploy

## Step 4: Configure Domain (Optional)

1. In the service settings, go to "Settings" tab
2. Under "Domains", click "Generate Domain"
3. Railway will provide a URL like: `arkansas-contract-extractor.up.railway.app`

## Step 5: Verify Deployment

1. Once deployed, visit your Railway URL
2. Test the health endpoint: `https://your-app.up.railway.app/api/health`
3. You should see:
```json
{
  "status": "healthy",
  "version": "PRODUCTION",
  "extraction": "ImageMagick + GPT-4 Vision API"
}
```

## Step 6: Test Contract Upload

1. Visit the main URL in your browser
2. Upload `test_contract2.pdf` to test
3. Should extract 37 fields successfully

## Monitoring & Logs

- Click on your service in Railway dashboard
- Go to "Logs" tab to see real-time logs
- Check for any errors during startup

## Troubleshooting

### ImageMagick Issues
- Railway's Docker build includes ImageMagick
- If you see ImageMagick errors, check the Dockerfile

### Memory Issues
- Default Railway plan has 512MB RAM
- Upgrade if processing large PDFs

### Build Failures
- Check that all TypeScript files compile
- Ensure package.json has all dependencies

## Cost Estimates
- Railway: $5/month (Hobby plan) or usage-based
- OpenAI API: ~$0.14 per contract extraction

## Support
- Railway Discord: https://discord.gg/railway
- Check logs for detailed error messages
- Ensure OPENAI_API_KEY is set correctly