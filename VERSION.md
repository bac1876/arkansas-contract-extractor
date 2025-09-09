# Arkansas Contract Agent - Version History

## Current Version: 1.2.0
**Release Date:** January 9, 2025

### 🚀 Version 1.2.0 Features

#### Core Functionality
- **Combined Services Deployment**: Both main email monitor and offer sheet processor run in single container
- **Full Contract Extraction**: Extracts 41 fields from Arkansas real estate contracts using GPT-4 Vision
- **Dual Email Processing**:
  - Main: `offers@searchnwa.com` - Full extraction with Google Sheets/Drive integration
  - Offer Sheet: `contractextraction@gmail.com` - Quick offer sheet generation

#### Recent Enhancements
- **PDF Generation**:
  - Offer sheets generated as clean PDFs with format: `Offer Sheet [address].pdf`
  - Single-page layout without branding or timestamps
  - Professional formatting with gradient header
  
- **Address Cleaning**:
  - Property addresses normalized to stop at ZIP code
  - Removes legal descriptions (e.g., "Lot 10 Block 2")
  - Consistent formatting across all outputs

- **Email Improvements**:
  - HTML formatted offer summaries in email body
  - Dual PDF attachments (original contract + offer sheet)
  - Clean subject lines: `Offer [Property Address]`

- **System Reliability**:
  - Timeout protection for stuck processes
  - Watchdog monitoring for email processing
  - Automatic retry logic for failed extractions

#### Integration Features
- Google Sheets tracking and net sheet generation
- Google Drive automatic uploads
- Dropbox backup support
- Seller net sheet calculations with tax data
- Agent information sheet generation

### 📝 Changelog

#### Version 1.2.0 (January 9, 2025)
- Standardized versioning system
- Added offer sheet PDF generation
- Fixed property address cleaning
- Removed timestamps from PDF filenames
- Single-page PDF formatting

#### Version 1.1.0 (Previous)
- Initial production deployment
- Basic extraction functionality
- Email monitoring system

### 🔧 Technical Details

**Architecture**: Node.js/TypeScript with Express
**AI Model**: GPT-4 Vision (gpt-4-turbo)
**PDF Processing**: ImageMagick + Playwright
**Deployment**: Railway (Docker container)
**Email**: IMAP monitoring with SMTP sending

### 📌 Version Guidelines

When updating this system:
1. Current version will be displayed: **1.2.0**
2. You will be asked what version number to use for updates
3. Version format: MAJOR.MINOR.PATCH (semantic versioning)
4. This file will be updated with each version change

### 🎯 Next Version Planning

For the next version update:
- Ask: "Current version is 1.2.0. What version should this update be?"
- Update package.json
- Update this VERSION.md file
- Document changes in changelog
- Commit with version number in message