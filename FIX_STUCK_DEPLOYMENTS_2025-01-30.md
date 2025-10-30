# CRITICAL FIX: Email Monitor Connection & Processing Recovery - January 30, 2025

## Issue Summary

Both Railway deployments (Courageous Appreciation and Determined Embrace) were stuck and unable to process emails:

### Symptoms:
1. **offers@searchnwa.com (Determined Embrace)**:
   - Stuck showing "⏳ Already processing emails, will check when done..."
   - `isProcessing` flag locked to `true`
   - No emails processed for hours

2. **contractextraction@gmail.com (Courageous Appreciation)**:
   - Repeated EPIPE socket errors: "This socket has been ended by the other party"
   - Connection dying and unable to recover properly
   - No emails processed for hours

### Root Causes:
1. **`isProcessing` flag gets stuck** when IMAP connection dies during processing
2. **IMAP callbacks never fire** on dead connections → Promises hang forever
3. **No timeout mechanisms** for operations that can hang
4. **Reconnect doesn't reset state** → System stays broken after recovery
5. **Old connections not closed** before reconnecting → Resource leaks

---

## Fixes Applied

### Fix #1: Reset `isProcessing` Flag During Reconnect ⚠️ CRITICAL
**File:** `email-monitor.ts` lines 1057-1082

**Problem:** When IMAP connection died during email processing, the `isProcessing` flag stayed `true` forever. Reconnect would succeed but system would be permanently stuck.

**Solution:**
- Added `this.isProcessing = false` at start of reconnect
- Added `this.imap.end()` to close old connection before creating new one
- Added detailed logging

```typescript
private async reconnect() {
  try {
    console.log('🔄 Starting reconnect process...');

    // CRITICAL FIX #1: Reset isProcessing flag
    if (this.isProcessing) {
      console.log('⚠️  Resetting stuck isProcessing flag from true → false');
      this.isProcessing = false;
    }

    // Close old IMAP connection
    if (this.imap) {
      console.log('🔌 Closing old IMAP connection...');
      this.imap.end();
    }
    // ... rest of reconnect logic
  }
}
```

---

### Fix #2: Add Timeout Wrapper for `processEmail()` ⚠️ CRITICAL
**File:** `email-monitor.ts` lines 416-430

**Problem:** If IMAP connection died while fetching email, the Promise would hang forever waiting for events that never fire. `isProcessing` would stay `true` and system would be stuck.

**Solution:**
- Created timeout wrapper using `Promise.race()`
- 2-minute timeout for email processing
- Renamed original method to `processEmailInternal()`
- Ensures system can continue even if individual email hangs

```typescript
private async processEmail(uid: number): Promise<void> {
  // CRITICAL FIX #2: Add timeout wrapper
  const timeoutPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      console.error(`❌ TIMEOUT: Email processing exceeded 2 minutes for UID ${uid}`);
      resolve(); // Resolve to allow processing to continue
    }, 120000); // 2 minute timeout
  });

  const processingPromise = this.processEmailInternal(uid);

  // Race between timeout and actual processing
  return Promise.race([processingPromise, timeoutPromise]);
}
```

---

### Fix #3: Add Connection State Validation ⚠️ HIGH
**File:** `email-monitor.ts` lines 358-371

**Problem:** System would attempt IMAP operations on dead/unauthenticated connections, causing operations to fail silently or hang.

**Solution:**
- Added connection state checks before operations
- Check if `this.imap` exists
- Check if `this.imap.state === 'authenticated'`
- Trigger reconnect if validation fails

```typescript
private checkRecentEmails() {
  // ... existing checks ...

  // CRITICAL FIX #3: Validate IMAP connection state
  if (!this.imap) {
    console.error('❌ IMAP connection is null - cannot check emails');
    console.log('🔄 Triggering reconnect...');
    this.reconnect();
    return;
  }

  if (this.imap.state !== 'authenticated') {
    console.error(`❌ IMAP not authenticated (state: ${this.imap.state})`);
    console.log('🔄 Triggering reconnect to restore connection...');
    this.reconnect();
    return;
  }
  // ... continue with search
}
```

---

### Fix #4: Add Search Callback Timeout ⚠️ HIGH
**File:** `email-monitor.ts` lines 387-410

**Problem:** `imap.search()` callback would never fire if connection was dead. System would wait forever with `isProcessing = true`.

**Solution:**
- Added 30-second timeout for search callback
- If callback doesn't fire, reset state and reconnect
- Added better error classification for connection issues
- Triggers reconnect for connection-related errors

```typescript
// CRITICAL FIX #4: Add timeout for search callback
let searchCompleted = false;
const searchTimeout = setTimeout(() => {
  if (!searchCompleted) {
    console.error('❌ TIMEOUT: IMAP search callback never fired after 30 seconds');
    console.error('   Connection likely dead - triggering reconnect');
    this.isProcessing = false;
    this.reconnect();
  }
}, 30000); // 30 second timeout

this.imap.search([['UNSEEN']], async (err: Error, uids: number[]) => {
  searchCompleted = true;
  clearTimeout(searchTimeout);

  if (err) {
    // ... error handling with connection detection
    if (err.message.includes('Not authenticated') || err.message.includes('connection')) {
      console.log('🔄 Search error indicates connection issue - triggering reconnect');
      this.reconnect();
    }
  }
  // ... rest of callback
});
```

---

### Fix #5: Better Error State Reset ⚠️ MEDIUM
**File:** `email-monitor.ts` lines 280-322

**Problem:** When IMAP error or connection end events fired, processing state wasn't cleaned up, leaving system in broken state.

**Solution:**
- Reset `isProcessing = false` when IMAP error occurs
- Clear polling interval when error occurs
- Same cleanup for both 'error' and 'end' events
- Added better error logging

```typescript
this.imap.once('error', (err: Error) => {
  console.error('❌ IMAP Error:', err);

  // CRITICAL FIX #5: Reset processing state
  if (this.isProcessing) {
    console.log('⚠️  Resetting isProcessing flag due to IMAP error');
    this.isProcessing = false;
  }
  if (this.checkInterval) {
    console.log('⚠️  Clearing polling interval due to IMAP error');
    clearInterval(this.checkInterval);
    this.checkInterval = null;
  }

  // ... trigger reconnect
});

this.imap.once('end', () => {
  console.log('📧 Email connection ended');

  // CRITICAL FIX #5: Reset processing state
  if (this.isProcessing) {
    console.log('⚠️  Resetting isProcessing flag due to connection end');
    this.isProcessing = false;
  }
  if (this.checkInterval) {
    console.log('⚠️  Clearing polling interval due to connection end');
    clearInterval(this.checkInterval);
    this.checkInterval = null;
  }

  // ... trigger reconnect
});
```

---

## Expected Outcomes

### Immediate Recovery (After Deploy):
1. ✅ **offers@searchnwa.com** will recover from stuck "already processing" state
2. ✅ **contractextraction@gmail.com** will handle EPIPE errors and reconnect properly
3. ✅ Both services will start processing emails within 30-60 seconds

### Long-Term Improvements:
1. ✅ **Auto-Recovery**: Future connection failures will self-recover within 30-60 seconds
2. ✅ **No More Stuck Flags**: `isProcessing` cannot get permanently stuck
3. ✅ **Timeout Protection**: Hung operations won't block the system indefinitely
4. ✅ **Clean Reconnects**: Old connections properly closed before new ones created
5. ✅ **Better Diagnostics**: Enhanced logging shows exactly what's happening

---

## New Logging Output

You'll now see these diagnostic messages in Railway logs:

### Reconnect Process:
```
🔄 Starting reconnect process...
⚠️  Resetting stuck isProcessing flag from true → false
🧹 Clearing existing polling interval
🔌 Closing old IMAP connection...
✅ Reconnected successfully
```

### Connection Validation:
```
❌ IMAP not authenticated (state: closed)
🔄 Triggering reconnect to restore connection...
```

### Timeout Detection:
```
❌ TIMEOUT: IMAP search callback never fired after 30 seconds
   Connection likely dead - triggering reconnect
```

```
❌ TIMEOUT: Email processing exceeded 2 minutes for UID 1234
   This email may have hung - forcing completion to prevent stuck state
```

### Error State Reset:
```
❌ IMAP Error: Error: This socket has been ended by the other party
   Error code: EPIPE, Source: socket
⚠️  Resetting isProcessing flag due to IMAP error
⚠️  Clearing polling interval due to IMAP error
🔄 Attempting to reconnect after error...
```

---

## Testing Performed

1. ✅ TypeScript compilation successful
2. ✅ Code review of all changes
3. ✅ Logic verification against identified bugs

---

## Deployment

**Status:** ✅ Ready to deploy
**Files Modified:** email-monitor.ts
**Railway Services:** Both Courageous Appreciation and Determined Embrace will receive this fix
**Deploy Method:** Push to GitHub main branch → Railway auto-deploys

---

## Post-Deployment Monitoring

### Watch for these indicators of success:

**Within 5 minutes:**
1. Look for reconnect messages in logs
2. Should see "Resetting stuck isProcessing flag" if flag was stuck
3. Should see successful connection establishment

**Within 10 minutes:**
1. Send test email to contractextraction@gmail.com
2. Send test email to offers@searchnwa.com
3. Both should process within 1-2 minutes

**Ongoing:**
1. No more repeated EPIPE errors without recovery
2. No more permanent "already processing" messages
3. Emails processed consistently every 30 seconds

---

## Rollback Plan (If Needed)

If issues occur:
1. Check Railway logs for new error messages
2. Previous commit was: `fce25e9`
3. Can revert: `git revert HEAD && git push`
4. Or redeploy previous commit in Railway dashboard

---

## Summary

All 5 critical fixes have been applied to email-monitor.ts to address the connection management and state handling issues that were causing both deployments to fail. The system now has:

- ✅ Proper state cleanup during reconnection
- ✅ Timeout protection against hanging operations
- ✅ Connection state validation before operations
- ✅ Callback timeout detection
- ✅ Comprehensive error state reset
- ✅ Enhanced diagnostic logging

Both Railway services should recover and resume normal operation immediately after deployment completes (~2-3 minutes).

**Version:** 1.3.2 (suggested)
**Priority:** CRITICAL
**Impact:** Both production services
**Risk:** Low (defensive additions, no breaking changes)
