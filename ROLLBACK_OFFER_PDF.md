# Rollback Instructions - Offer Sheet PDF Feature

## What Was Changed
Date: January 9, 2025
Feature: Added PDF generation for offer sheets

### Files Modified:
1. `offer-sheet-app/azure-email-service.ts` - Added support for multiple PDF attachments
2. `offer-sheet-app/offer-sheet-processor.ts` - Integrated PDF generation
3. `Dockerfile` - Changed CMD from `start.js` to `start-combined.js` and added directory

### Files Added:
1. `offer-sheet-app/offer-sheet-pdf-generator.ts` - New PDF generator
2. `test-offer-sheet-pdf.ts` - Test script
3. `ROLLBACK_OFFER_PDF.md` - This file

## How to Rollback

### Option 1: Quick Rollback (Disable PDF only)
If the PDF generation is causing issues but you want to keep the combined services:

1. Comment out PDF generation in `offer-sheet-app/offer-sheet-processor.ts`:
```typescript
// Around line 281-289, comment out:
/*
console.log('📄 Generating offer sheet PDF...');
let offerSheetPdfPath: string | undefined;
try {
  offerSheetPdfPath = await this.pdfGenerator.generateOfferSheetPDF(offerData);
  console.log('✅ Offer sheet PDF generated:', offerSheetPdfPath);
} catch (error) {
  console.error('⚠️  Failed to generate offer sheet PDF:', error);
}
*/
```

2. Push the change:
```bash
git add offer-sheet-app/offer-sheet-processor.ts
git commit -m "Temporarily disable PDF generation"
git push origin main
```

### Option 2: Full Rollback to Previous Version
To completely revert all changes:

```bash
# Revert to the commit before PDF changes
git revert HEAD
git push origin main
```

Or manually:

```bash
# Reset to previous commit (d49b04d)
git reset --hard d49b04d
git push --force origin main
```

### Option 3: Rollback Dockerfile Only
If you want to go back to single service (main monitor only):

1. Edit Dockerfile line 66:
```dockerfile
# Change from:
CMD ["node", "start-combined.js"]
# Back to:
CMD ["node", "start.js"]
```

2. Push:
```bash
git add Dockerfile
git commit -m "Revert to single service deployment"
git push origin main
```

## Testing After Rollback

1. Check Railway deployment logs for errors
2. Send test email to `contractextraction@gmail.com`
3. Verify you receive response (without PDF if disabled)

## Re-enabling the Feature

To re-enable PDF generation:
1. Uncomment the code in `offer-sheet-processor.ts`
2. Ensure Dockerfile uses `start-combined.js`
3. Push changes

## Railway Dashboard
- URL: https://railway.com
- Login with GitHub credentials (bac1876)
- Check deployment logs for any errors

## Contact for Issues
If rollback fails, check:
- Railway deployment logs
- GitHub Actions (if any)
- Email service status