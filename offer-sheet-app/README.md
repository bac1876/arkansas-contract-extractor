# Offer Sheet App

Automated Arkansas Real Estate Contract Offer Sheet Generator

## Overview

This application monitors an email inbox for incoming real estate contracts, extracts key offer details, and sends back a professionally formatted offer sheet that agents can forward to listing agents.

## Features

- **Email Monitoring**: Automatically processes incoming contracts
- **GPT-5 Extraction**: Uses GPT-5-mini for superior vision capabilities and accuracy
- **Dual Extraction Modes**: 
  - Page-by-page extraction for specific fields (faster)
  - Full HybridExtractor for complete analysis (more thorough)
- **Professional Formatting**: Creates clean, easy-to-read offer summaries
- **Azure Integration**: Sends formatted emails via Azure (SendGrid)
- **Original Attachment**: Includes the original contract for forwarding
- **Automatic Fallback**: Falls back to GPT-4o if GPT-5 is unavailable

## Extracted Fields

The app extracts and formats the following information:

- **Buyer Name** (Page 1, Para 1)
- **Purchase Price** (Page 1, Para 3)
- **Seller Concessions** (Page 4, Para 5) - Only if applicable
- **Close Date** (Page 12, Para 22)
- **Contingency** (Page 14, Para 32) - Only if exists
- **Earnest Money** (Page 4, Para 7) - Yes/No
- **Non-Refundable Deposit** (Page 4, Para 8) - Yes/No with amount
- **Items to Convey** (Page 6, Para 13) - Only if specified
- **Home Warranty** (Page 8, Para 15) - Only if included
- **Survey** (Page 6, Para 11) - Only if required

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp offer-sheet-app/.env.example .env
```

Required settings:
- Email credentials (IMAP)
- SendGrid API key (from Azure)
- OpenAI API key

### 3. Install ImageMagick

The app requires ImageMagick for PDF processing:

**Windows:**
Download and install from https://imagemagick.org/script/download.php#windows

**Linux/Mac:**
```bash
sudo apt-get install imagemagick  # Ubuntu/Debian
brew install imagemagick           # macOS
```

## Usage

### Test the App

Run the test script to verify everything is working:

```bash
# Test with page-by-page GPT-5-mini extraction (default)
npx ts-node test-offer-sheet-app.ts

# Test with full HybridExtractor using GPT-5
npx ts-node test-offer-sheet-app.ts full
```

This will:
1. Extract data from a test contract using GPT-5
2. Generate formatted HTML and text versions
3. Save outputs to `offer-sheet-app/test-output/`
4. Test email service connection
5. Show which model was used for extraction

### Start the Processor

Run the main processor to start monitoring emails:

```bash
npx ts-node offer-sheet-app/offer-sheet-processor.ts
```

The processor will:
1. Connect to the configured email inbox
2. Check for new emails every 5 minutes
3. Process any PDFs found
4. Send formatted offer sheets back to senders

### Manual Processing

You can also process a specific contract manually:

```typescript
import { OfferSheetExtractor } from './offer-sheet-app/offer-sheet-extractor';
import { OfferSheetFormatter } from './offer-sheet-app/offer-sheet-formatter';

const extractor = new OfferSheetExtractor();
const formatter = new OfferSheetFormatter();

const data = await extractor.extractFromPDF('contract.pdf');
const html = formatter.formatOfferSheet(data);
```

## Email Format

The generated offer sheet email includes:

1. **Professional Header**: Eye-catching gradient header
2. **Offer Details**: Clean, organized field layout
3. **Conditional Fields**: Only shows relevant information
4. **Original Contract**: Attached for easy forwarding
5. **Footer**: Timestamp and generator info

## Architecture

```
offer-sheet-app/
├── offer-sheet-processor.ts    # Main email monitoring service
├── offer-sheet-extractor.ts    # PDF data extraction
├── offer-sheet-formatter.ts    # HTML/text formatting
├── azure-email-service.ts      # Email sending via Azure
├── config/
│   └── email-config.ts        # Configuration management
└── templates/                  # Email templates (future)
```

## Email Separation

This system uses two separate email addresses:
- **Main App** (`offers@searchnwa.com`): Full contract processing with Google Sheets, Dropbox, etc.
- **Offer Sheet App** (`contractextraction@gmail.com`): Quick offer sheet generation only

Agents should send contracts to:
- `offers@searchnwa.com` for full processing and tracking
- `contractextraction@gmail.com` for quick offer sheet generation

## Troubleshooting

### ImageMagick Issues
- Ensure ImageMagick is installed and in PATH
- On Windows, check installation at `C:\Program Files\ImageMagick-*`
- On Linux, verify with `which convert`

### Email Not Sending
- Verify SendGrid API key is correct
- Check sender email is verified in SendGrid
- Review logs for specific error messages

### Extraction Issues
- Ensure PDF is a valid Arkansas real estate contract
- Check OpenAI API key and rate limits
- Review extracted data in test output

## Development

### Adding Fields

To add new fields to extraction:

1. Update `OfferSheetData` interface in `offer-sheet-extractor.ts`
2. Add extraction logic for the specific page
3. Update formatter to display the new field
4. Test with sample contracts

### Customizing Format

Edit `offer-sheet-formatter.ts` to change:
- Email styling and colors
- Field display order
- Conditional logic for showing/hiding fields

## Security

- Never commit `.env` file with credentials
- Use app-specific passwords for email accounts
- Rotate API keys regularly
- Monitor usage and costs for OpenAI API

## Support

For issues or questions about the Arkansas Contract Agent system, check the main project documentation.