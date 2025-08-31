# Quick Restore Guide - Version 4.0

## 🚨 EMERGENCY RESTORE COMMANDS

If something breaks, run these commands to get back to Version 4.0:

```bash
# Option 1: Reset to Version 4.0 commit
git reset --hard 017199f

# Option 2: Checkout Version 4.0 as new branch
git checkout -b version-4-restore 017199f

# Option 3: Cherry-pick Version 4.0 fixes
git cherry-pick e10400b  # ImageMagick Docker fixes
git cherry-pick 017199f  # Final syntax fixes
```

## ✅ VERSION 4.0 VERIFICATION CHECKLIST

After restore, verify these are working:

### 1. Local Extraction Test
```bash
npx ts-node test-extraction-locally.ts
```
**Expected**: Should extract 29/29 fields with real values (not $0.00)

### 2. ImageMagick Check
```bash
convert -version
```
**Expected**: ImageMagick 6.x or 7.x installed

### 3. Send Test Email
```bash
npx ts-node send-test-email.ts
```
**Expected**: Email sent successfully to offers@searchnwa.com

### 4. Check Railway Deployment
- Go to Railway dashboard
- Check logs for "Email monitor started successfully"
- No ImageMagick errors
- No PDF conversion errors

## 🔧 CRITICAL FILES TO PRESERVE

If manually restoring, ensure these files match Version 4.0:

### extraction-gpt5.ts
- Line 69-71: Linux uses 'convert' not 'magick'
- Line 85-92: PDF header validation
- Line 107-118: Enhanced error messages

### Dockerfile
- Lines 6-14: ImageMagick + Ghostscript installation
- Lines 62-71: Policy fixes for PDF processing
- Line 80: Uses start.js entry point

### email-monitor.ts
- Line 408: PDF saved directly from attachment buffer
- Line 419: Uses robust extractor
- Marks emails as read after processing

## 🎯 VERSION 4.0 KEY FIXES

1. **ImageMagick Policy** - Removed PDF restrictions
2. **Linux Command** - Uses 'convert' instead of 'magick'
3. **PDF Validation** - Checks header before processing
4. **Ghostscript** - Installed for PDF support
5. **Error Logging** - Detailed failure diagnostics

## 📝 GIT HISTORY

Key commits for Version 4.0:
```
017199f - Fix duplicate variable declaration (FINAL)
e10400b - Fix PDF extraction on Railway
eb44a64 - Add ImageMagick policy fixes
```

## ⚡ QUICK FIX COMMANDS

### If PDFs are corrupted:
```bash
# Apply ImageMagick policy fix
git show e10400b:Dockerfile > Dockerfile
git add Dockerfile && git commit -m "Restore ImageMagick fixes"
git push
```

### If extraction returns empty values:
```bash
# Apply extraction fixes
git show 017199f:extraction-gpt5.ts > extraction-gpt5.ts
git add extraction-gpt5.ts && git commit -m "Restore extraction fixes"
git push
```

### If Railway won't deploy:
```bash
# Ensure Dockerfile is correct
git checkout 017199f -- Dockerfile nixpacks.toml
git commit -m "Restore deployment configuration"
git push
```

## ✅ SUCCESS INDICATORS

You know Version 4.0 is restored when:
1. Local extraction shows 29/29 fields
2. No $0.00 values in output
3. Railway logs show successful processing
4. Google Drive receives proper PDFs and CSVs
5. Net sheets have actual calculated values

---
**Version 4.0 Reference Commit**: `017199f`
**Date**: January 31, 2025
**Status**: PRODUCTION READY