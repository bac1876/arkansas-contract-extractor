# Tomorrow's Tasks - System Reliability Improvements
**Created:** January 28, 2025
**For:** January 29, 2025

## Priority Tasks to Prevent Email Monitor Downtime

### 1. 🔄 Setup Windows Task Scheduler for Daily Restart
**Why:** Prevent memory leaks and connection issues from long-running processes
- Schedule daily restart at 3:00 AM (low activity time)
- Create a task that:
  1. Stops the current node process
  2. Waits 10 seconds
  3. Starts email-monitor.ts fresh
- Test the scheduled task manually first

### 2. 🛡️ Activate Monitor-Keeper Auto-Restart Service
**Why:** Automatic recovery from crashes without manual intervention
- The `monitor-keeper.bat` file already exists but needs to be running
- Setup to run as a separate process that:
  - Checks if email-monitor is running every 2 minutes
  - Automatically restarts if crashed
  - Logs restart events
- Consider adding to Windows startup

### 3. 💾 Implement Disk Space Management
**Why:** Prevent disk full errors from accumulated PDFs and temp files
- Add automatic cleanup for:
  - `gpt5_temp_*` folders older than 24 hours
  - Processed PDFs older than 30 days (after confirming backup)
  - Old log files
- Add disk space monitoring/alerts
- Current folders growing:
  - `processed_contracts/pdfs/` - Already has 130+ files
  - `net_sheets_pdf/`
  - `agent_info_sheets/`

### 4. ♻️ Implement Graceful 24-Hour Restart in Code
**Why:** Proactive restart before issues occur
- Add to email-monitor.ts:
  ```typescript
  // After 24 hours, gracefully restart
  setTimeout(() => {
    console.log('📅 24-hour restart initiated...');
    // Save state
    // Close connections properly
    // Exit with code that triggers restart
    process.exit(0);
  }, 24 * 60 * 60 * 1000);
  ```
- Ensure restart happens during low-activity period
- Save and restore any pending work

### 5. 🔧 Fix Existing Minor Issues
**Why:** Prevent accumulation of errors
- Fix IMAP keep-alive error: `this.imap._send is not a function`
- Fix Google Sheets API connection for tracking spreadsheet
- Add better error handling for corrupted PDFs

### 6. 📊 Add Memory Monitoring
**Why:** Detect memory leaks before they cause crashes
- Log memory usage every hour
- Alert if memory exceeds threshold (e.g., 500MB)
- Trigger graceful restart if approaching limit

## Implementation Order (Recommended)

1. **First:** Activate monitor-keeper.bat (immediate protection)
2. **Second:** Setup Task Scheduler (daily safety net)
3. **Third:** Implement graceful restart in code
4. **Fourth:** Add disk space management
5. **Fifth:** Fix minor issues
6. **Last:** Add memory monitoring

## Testing Checklist

- [ ] Monitor-keeper detects and restarts crashed process
- [ ] Task Scheduler successfully restarts at scheduled time
- [ ] Graceful restart preserves pending emails
- [ ] Disk cleanup removes old files without breaking system
- [ ] Memory monitoring logs usage correctly
- [ ] System runs 48+ hours without manual intervention

## Quick Commands for Tomorrow

```bash
# Test monitor-keeper
start monitor-keeper.bat

# Create scheduled task (run as admin)
schtasks /create /tn "RestartEmailMonitor" /tr "C:\Users\Owner\Claude Code Projects\SmthosExp\arkansas-contract-agent\restart-monitor.bat" /sc daily /st 03:00

# Check disk usage
dir "processed_contracts\pdfs" | find "File(s)"

# Monitor memory usage
tasklist /fi "imagename eq node.exe" /fo list | find "Mem Usage"
```

## Success Metrics

After implementing these improvements:
- System uptime: 99.9% (vs current ~95%)
- Automatic recovery time: < 2 minutes
- Disk space stable over 30+ days
- No manual interventions required
- Memory usage stable under 400MB

## Notes from Today's Session

- Version 3.5 is working well (50% API cost reduction)
- Double extraction bug is fixed
- Robust extraction with retries is functioning
- Main vulnerability is long-running stability

---

**Tomorrow's goal: Make the system completely autonomous and self-healing.**