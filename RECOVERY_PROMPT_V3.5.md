# Recovery Prompt for Arkansas Contract Agent v3.5

## Quick Recovery Prompt (Copy and paste this to Claude)

```
I need help with the Arkansas Contract Agent system (Version 3.5). The system is located at:
C:\Users\Owner\Claude Code Projects\SmthosExp\arkansas-contract-agent

Current state:
- Version 3.5 with RobustExtractor (multiple retries, no double extraction)
- Email monitor should be running on offers@searchnwa.com
- System extracts contracts from PDFs using GPT-5-mini with fallback to GPT-4o
- Generates net sheets and uploads to Google Drive

Please help me:
1. Check if the email monitor is running
2. If not, restart it with: node -r ts-node/register email-monitor.ts
3. Verify the system is using RobustExtractor (no double extractions)
4. Monitor incoming emails and ensure extraction works correctly

The system should:
- Only extract ONCE when successful (no double API calls)
- Use cached results from RobustExtractor
- Process contracts in under 2 minutes
- Generate net sheets and upload to Google Drive
```

## Detailed Recovery Prompt (For complex issues)

```
I need help recovering the Arkansas Contract Agent system to Version 3.5 state.

System Location: C:\Users\Owner\Claude Code Projects\SmthosExp\arkansas-contract-agent

Version 3.5 Features:
1. RobustExtractor with intelligent retry logic (extraction-robust.ts)
   - 3 attempts with GPT-5-mini
   - 2 fallback attempts with GPT-4o  
   - 2 quick fallback attempts
   - Caches results to avoid double extraction
   - Returns partial data on failure

2. Email Monitor (email-monitor.ts)
   - Monitors offers@searchnwa.com every 30 seconds
   - Uses RobustExtractor for processing
   - Generates net sheets and agent info sheets
   - Uploads to Google Drive

3. Fixed Issues:
   - Double extraction bug (now only extracts once)
   - 50% API cost reduction
   - No crashes on extraction failure

Current Problems I'm experiencing:
[Describe your issue here]

Please:
1. Check system status and running processes
2. Verify the extraction-robust.ts has the caching fix (fullResult property)
3. Ensure email-monitor.ts is using RobustExtractor
4. Start/restart the monitor if needed
5. Test with a contract to verify single extraction

Key files to check:
- extraction-robust.ts (should cache fullResult)
- email-monitor.ts (should use RobustExtractor)
- VERSION_3.5_COMPLETE.md (full documentation)
```

## Emergency Recovery Commands

```bash
# 1. Kill all Node processes
taskkill /F /IM node.exe

# 2. Navigate to project
cd "C:\Users\Owner\Claude Code Projects\SmthosExp\arkansas-contract-agent"

# 3. Start email monitor
node -r ts-node/register email-monitor.ts

# 4. Test extraction (in another terminal)
node -r ts-node/register test-robust-extraction.ts
```

## Key Validation Points

To verify Version 3.5 is working correctly:

1. **Check extraction-robust.ts has caching:**
   - Line 20: `fullResult?: any;` in ExtractionAttempt interface
   - Line 91: Uses `attemptResult.fullResult` instead of re-extracting
   - Line 281: Stores `fullResult: result` in attemptExtraction

2. **Check email-monitor.ts uses RobustExtractor:**
   - Line 10: `import { RobustExtractor } from './extraction-robust';`
   - Line 65: `this.robustExtractor = new RobustExtractor();`
   - Line 382: `const robustResult = await this.robustExtractor.extractFromPDF(pdfPath);`

3. **Test single extraction:**
   - Run: `node -r ts-node/register test-fixed-extraction.ts`
   - Should show: "🎉 PERFECT: Extraction succeeded on first attempt with NO duplicates!"

## Version 3.5 Success Indicators

When working correctly, you should see:

1. **In extraction logs:**
   ```
   ✅ Successful extraction with 29 fields!
   📊 Extraction completed after 1 attempt(s)
   ```
   (NOT followed by another "GPT-5 Extractor: Starting extraction")

2. **In health reports:**
   ```
   📈 Success Rate: 100.0%
   ✅ Successful: X
   ⚠️  Partial: 0
   ❌ Failed: 0
   ```

3. **Processing time:** 65-80 seconds per contract (not 130-160)

## Common Issues and Fixes

### Issue: Double extraction still happening
**Fix:** The email monitor is using old code from memory. Restart it:
```bash
taskkill /F /IM node.exe
node -r ts-node/register email-monitor.ts
```

### Issue: Extraction failing completely
**Fix:** Check API key and test manually:
```bash
node -r ts-node/register extraction-robust.ts test_contract2.pdf
```

### Issue: Emails not being detected
**Fix:** Check email credentials and connection:
- Verify offers@searchnwa.com credentials
- Check processed_emails.json isn't blocking new emails
- Ensure inbox has unread emails

### Issue: Google Drive uploads failing
**Fix:** Check service account credentials:
- Verify GOOGLE_APPLICATION_CREDENTIALS path
- Ensure service account has access to shared drive

## Contact for Help

If you need to return to exactly this state (Version 3.5 as of January 28, 2025):
1. Reference VERSION_3.5_COMPLETE.md for full specifications
2. Check ROBUST_EXTRACTION_IMPLEMENTATION.md for the double extraction fix
3. Use test-fixed-extraction.ts to verify the fix is applied

The system should process contracts automatically with:
- Single extraction per success (no duplicates)
- 100% success rate with retries
- 50% lower API costs than Version 3.0
```

---

**This prompt will help any Claude instance understand and recover the Version 3.5 state.**