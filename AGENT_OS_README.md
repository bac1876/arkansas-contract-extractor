# Agent OS - Arkansas Contract Agent

## Overview
This project is integrated with Agent OS for automated task management and workflow execution.

## Available Agent OS Commands

### Project Management
- `/analyze-product` - Analyze the existing codebase and generate documentation
- `/plan-product` - Plan new features and architecture
- `/create-spec` - Create specifications for new features
- `/execute-tasks` - Execute a series of development tasks

## Project-Specific Workflows

### 1. Email Processing Workflow
```bash
# Start monitoring emails
npm run monitor-emails

# Check monitoring status
npm run monitor-status

# Process specific email
node -r ts-node/register process-specific-email.ts [EMAIL_NUMBER]
```

### 2. Contract Extraction Workflow
```bash
# Extract from test contract
node -r ts-node/register extract-all-fields-complete.ts test_contract2.pdf

# Manual extraction from any PDF
node -r ts-node/register extract-all-fields-complete.ts [PDF_PATH]
```

### 3. Troubleshooting Workflow
```bash
# Check inbox for new emails
node -r ts-node/register check-inbox-simple.ts

# Mark all emails as processed
node -r ts-node/register mark-all-processed.ts

# Reset net sheets
node -r ts-node/register reset-netsheets.ts
```

## Agent Configuration

The project uses specialized agents for:
- **Contract Extraction**: Uses GPT-4 Vision for 85-91% field extraction
- **Email Monitoring**: Continuous IMAP monitoring of contractextraction@gmail.com
- **Net Sheet Generation**: Automated calculation and PDF/CSV generation
- **Google Drive Integration**: Automatic upload to shared drive

## Current Status

### Working Features
✅ Email monitoring and processing
✅ PDF contract extraction (85-91% accuracy)
✅ Net sheet generation (PDF and CSV)
✅ Google Drive upload
✅ Property listing data integration

### Recent Fixes
- Fixed email attachment filename mismatch issue
- Removed hardcoded message IDs from processing
- Improved error handling for corrupted PDFs

## Quick Start

1. **Start the monitoring service:**
   ```bash
   npm run monitor-emails
   ```

2. **Send a contract to:** contractextraction@gmail.com

3. **Check processing status:**
   ```bash
   npm run monitor-status
   ```

4. **View results in Google Drive:**
   - Folder: Arkansas Contract Data
   - Files: netsheet_[property_address].pdf/csv

## Development with Agent OS

To add new features or modify the system:

1. **Create a specification:**
   ```
   /create-spec
   ```

2. **Execute development tasks:**
   ```
   /execute-tasks
   ```

3. **Run tests:**
   Use the test-runner agent to validate changes

## Support

For Agent OS documentation: https://buildermethods.com/agent-os
For project-specific issues: Check SYSTEM_STATUS.md and SESSION_STATE_*.md files