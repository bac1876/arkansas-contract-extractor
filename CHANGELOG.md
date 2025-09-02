# Changelog

## Version 1.0.1 - Bug Fix Release
*Released: September 2, 2025*

### 🐛 Bug Fixes
- Fixed agent info sheet generation error where buyers field could be either string or array
- `formatBuyerNames` function now properly handles both data types
- Agent info sheet now successfully generates regardless of buyer data format

### 📝 Notes
- Quick patch to fix critical agent info sheet generation failure
- No other functionality changes

---

## Version 1.0 - First Stable Railway Deployment
*Released: September 2, 2025*

### 🎉 Major Milestone
This is the first production-ready version successfully deployed and running on Railway platform.

### ✨ Features
- **Email Monitoring**: Automated IMAP email monitoring with attachment processing
- **Contract Extraction**: Full PDF contract data extraction using GPT-4 Vision API
- **Seller Net Sheet Generation**: Professional PDF generation with accurate financial calculations
- **Agent Info Sheet Generation**: Summary documents for listing agents
- **Google Sheets Integration**: Public CSV export method for listing data (no auth required)
- **Google Drive Integration**: Automatic upload of all generated documents
- **CSV Export**: Structured data export for all extracted contracts

### 🔧 Technical Improvements
- **Railway Deployment**: Fully functional deployment with all dependencies
- **Simplified Authentication**: Removed complex Google Sheets API auth in favor of public CSV
- **Address Matching**: Improved fuzzy matching for property addresses
- **Error Handling**: Robust error recovery and logging

### 📄 Document Generation Updates
- **Seller Net Sheet**:
  - Removed all headers and footers for cleaner layout
  - Compressed layout to fit on single page
  - Flipped Sales Price and Closing Date positions
  - Increased notes font size for readability
  - Removed redundant "Total Estimated Costs" section

- **Agent Info Sheet**:
  - Removed header "OTHER INFORMATION ABOUT OFFER"
  - Removed Commission Information section
  - Formatted buyer names with "&" separator
  - Compressed layout for single page display

### 🐛 Bug Fixes
- Fixed ListingInfoService initialization on Railway
- Fixed agent info sheet return type mismatch
- Fixed PDF generation fallback to HTML when Playwright fails
- Fixed tax data lookup with partial address matching

### 📦 Dependencies
- Node.js 18.x
- TypeScript
- Playwright (for PDF generation)
- Google APIs
- OpenAI GPT-4 Vision

### 🚀 Deployment
Successfully deployed on Railway with automatic GitHub integration.

---

## Previous Versions

### Version 4.0 (Legacy)
- Initial hybrid extraction approach
- Basic email monitoring
- Manual deployment process

### Version 3.5 (Legacy)
- Contract extraction prototype
- Local development only