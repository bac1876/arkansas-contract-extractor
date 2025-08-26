# Tech Stack

## Core Technologies

### Runtime & Language
- **Node.js**: v20.10.0+ (Runtime environment)
- **TypeScript**: 5.3.0 (Primary language)
- **JavaScript**: ES6+ (Supporting scripts)

### Web Framework
- **Express**: 5.1.0 (Web server)
- **CORS**: 2.8.5 (Cross-origin resource sharing)
- **Multer**: 2.0.2 (File upload handling)

## AI & Machine Learning

### OpenAI Integration
- **OpenAI SDK**: 5.12.2
- **GPT-4 Vision API**: For contract field extraction
- **Models Used**:
  - gpt-4-vision-preview (primary)
  - gpt-4o (alternative)
  - gpt-5-mini (testing)

## Document Processing

### PDF Manipulation
- **pdf-lib**: 1.17.1 (PDF generation)
- **pdf-parse**: 1.1.1 (PDF text extraction)
- **pdfjs-dist**: 5.4.54 (PDF rendering)
- **@pdf-lib/fontkit**: 1.1.1 (Custom fonts)

### Image Processing
- **ImageMagick**: External binary (PDF to PNG conversion)
- **Sharp**: 0.33.0 (Image manipulation)
- **Canvas**: 3.1.2 (Image rendering)
- **Tesseract.js**: 5.1.1 (OCR backup)

## Google Services

### APIs & SDKs
- **googleapis**: 105.0.0
- **Google Sheets API**: v4
- **Google Drive API**: v3
- **Service Account Authentication**

## Email Processing

### IMAP & Parsing
- **imap**: 0.8.19 (Email retrieval)
- **mailparser**: 3.7.4 (Email parsing)
- **@types/imap**: 0.8.42
- **@types/mailparser**: 3.4.6

## Data Processing

### Spreadsheets & Data
- **xlsx**: 0.18.5 (Excel file handling)
- **dayjs**: 1.11.10 (Date manipulation)
- **joi**: 17.11.0 (Data validation)

## Development Tools

### Build & Compilation
- **ts-node**: 10.9.1 (TypeScript execution)
- **ts-jest**: 29.1.1 (TypeScript testing)
- **TypeScript**: 5.3.0

### Testing
- **Jest**: 29.7.0 (Test framework)
- **@types/jest**: 29.5.8

### Development Dependencies
- **pdf-page-counter**: 1.0.3
- **pdf-to-png-converter**: 3.7.1
- **pdf2pic**: 3.2.0
- **puppeteer**: 24.16.2 (Browser automation)

## Environment & Configuration

### Environment Management
- **dotenv**: 17.2.1 (Environment variables)
- **.env file**: API keys and secrets

### Required Environment Variables
```
OPENAI_API_KEY=<OpenAI API key>
GOOGLE_SERVICE_ACCOUNT_KEY=<Path to service account JSON>
EMAIL_USER=<Email address for monitoring>
EMAIL_PASSWORD=<Email app password>
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993
```

## External Services

### Third-Party APIs
- OpenAI API (GPT-4 Vision)
- Google Sheets API
- Google Drive API
- Gmail IMAP

### External Binaries
- ImageMagick (magick.exe)
- Ghostscript (optional, for advanced PDF operations)

## Deployment Configuration

### Supported Platforms
- Local development (Windows/Mac/Linux)
- Railway (cloud deployment)
- Docker containers
- Node.js hosting providers

### File Structure
```
/dist              - Compiled JavaScript
/public            - Static web assets
/uploads           - Temporary file storage
/processed_contracts - Completed extractions
/net_sheets_pdf    - Generated PDFs
/net_sheets_csv    - Generated CSVs
```

## Version Management

### Package Management
- **npm**: Package manager
- **package.json**: Dependency tracking
- **package-lock.json**: Version locking

### Git Integration
- Version control via Git
- CLAUDE.md for AI context
- .agent-os for Agent OS integration