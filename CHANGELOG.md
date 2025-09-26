# Changelog

## Version 1.3.0 - Percentage-Based Seller Concessions
*Released: September 26, 2025*

### ✨ Major Enhancement
- **Percentage-Based Seller Concessions**: Full support for percentage-based amounts in paragraph 5
  - Automatically detects "%" sign as trigger for calculation
  - Calculates actual dollar amount from percentage of purchase price
  - Example: "3% of purchase price" on $219,000 → correctly calculates $6,570

### 🐛 Critical Fixes
- **Offer Sheet**: Fixed issue where percentage concessions showed only the number (e.g., "$3" instead of "$6,570")
- **Net Sheet**: Fixed issue where percentage concessions showed "$0" instead of calculated amount
- **GPT-5 Extractor**: Now captures complete text including percentage symbols
- **ImageMagick Extractor**: Added calculation logic for percentage-based amounts
- **Offer Sheet Extractor**: Updated to use pre-calculated values when available

### 🔧 Technical Implementation
- Added `calculateSellerConcessions` method to handle both percentage and dollar amounts
- Enhanced extraction prompts to preserve percentage text (e.g., "3% of the purchase price")
- Implemented `seller_concessions_calculated` field for storing computed values
- Updated all three extractors: GPT-5, ImageMagick, and Offer Sheet ImageMagick

### 📝 Testing
- Comprehensive test suite added: `test-netsheet-percentage-flow.ts`
- Verified both offer sheet and net sheet display correct calculated amounts
- Tested with `testcontractsellerconcessions.pdf` containing "3% of purchase price"

---

## Version 1.2.0 - Standardization Update
*Released: September 25, 2025*

### 🔧 Improvements
- Standardized version numbering across the system
- Fixed Google Drive integration with new service account
- Enhanced survey field display logic
- Improved formatting for seller concessions, earnest money, and home warranty fields

---

## Version 1.1.0 - Dropbox Integration
*Released: September 2, 2025*

### ✨ New Features
- **Dropbox Integration**: Added optional Dropbox backup for all generated files
  - Automatic upload of net sheet PDFs
  - Automatic upload of agent info sheets
  - Shareable links generated for each file
  - Works alongside existing Google Drive integration
  - Completely optional - system works without it

### 🔧 Technical Details
- New `dropbox-integration.ts` module
- Dropbox SDK v10.34.0 added
- Environment variables: `DROPBOX_ACCESS_TOKEN` and `DROPBOX_FOLDER_PATH`
- Files are organized in Dropbox folders: `/Net Sheets` and `/Agent Info Sheets`

### 📝 Configuration
- Add `DROPBOX_ACCESS_TOKEN` to `.env` file
- Get token from: https://www.dropbox.com/developers/apps
- Optional: Customize folder path with `DROPBOX_FOLDER_PATH`

---

## Version 1.0.2 - Output Structure Changes
*Released: September 2, 2025*

### 🔧 Changes
- Removed CSV net sheet generation (keeping PDF and Google Sheets only)
- Agent info sheets now save in root directory instead of subdirectory
- Simplified output structure per user requirements

---

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