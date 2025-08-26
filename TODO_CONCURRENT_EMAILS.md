# TODO: Improve Concurrent Email Handling

## Reminder for Next Session
**Created:** 2025-08-14 at 11:00 AM
**Reminder:** User will return in about 1 hour to address this

## Current Issue
When multiple emails arrive close together (e.g., 30 seconds apart), the second email gets skipped if the first is still processing. The system uses a simple `isProcessing` flag that blocks ALL new email processing.

## Current Behavior Problems:
1. Second email shows "⏳ Already processing emails, skipping..."
2. Email won't be processed until next trigger (could be delayed)
3. No queue system - purely sequential processing
4. No user feedback about pending emails

## Proposed Solution:
1. **Implement Email Queue System**
   - Queue incoming emails instead of skipping
   - Process queue items sequentially or in parallel
   - Show queue status in console

2. **Add Parallel Processing Option**
   - Process multiple PDFs simultaneously (with limit)
   - Use worker threads or process pool
   - Maintain separate processing status per email

3. **Better Status Tracking**
   - Track individual email processing status
   - Show which emails are queued/processing/completed
   - Add retry mechanism for failed emails

4. **Immediate Acknowledgment**
   - Always acknowledge new emails immediately
   - Add to queue even if currently processing
   - Provide feedback: "Email queued, position #2"

## Code Location:
- Main issue: `email-monitor.ts` lines 182-184
- Processing lock: `isProcessing` flag
- Sequential loop: line 211-213

## Quick Fix vs Full Solution:
- **Quick Fix**: Remove the skip, always process (may cause overlap issues)
- **Better Fix**: Queue system with proper state management
- **Best Fix**: Worker pool with concurrent processing limits

## Testing Needed:
- Send 3-5 emails rapidly (10 second intervals)
- Verify all get processed
- Check for race conditions
- Monitor memory usage with concurrent processing