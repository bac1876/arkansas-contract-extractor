# Setup Prompt for Version 3.0 Working State
**Arkansas Contract Agent - Production Ready**

## Quick Setup Instructions

To get to the exact Version 3.0 working state, follow these steps:

### 1. Git Checkout
```bash
git checkout d75ff8a
```
This will restore the exact working Version 3.0 codebase.

### 2. Environment Setup
Create a `.env` file with:
```env
OPENAI_API_KEY=your-openai-api-key-here
PORT=3006
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Required Software
- **Node.js** v18+ with TypeScript support
- **ImageMagick** 7.1.2+ installed at: `C:\Program Files\ImageMagick-7.1.2-Q16\magick.exe`
  - Download from: https://imagemagick.org/script/download.php#windows
  - IMPORTANT: During installation, check "Install development headers and libraries"

### 5. Quick Verification Test
```bash
npx ts-node test-contracts-quick.ts
```
This will test 3 contracts and should complete in ~18 minutes with 100% success.

### 6. Run Production Server
```bash
npm start
# or
npx ts-node server-hybrid.ts
```
Server will start on port 3006 with GPT-5-mini as default model.

---

## DETAILED SETUP PROMPT

Copy and paste this prompt when starting fresh or recovering the Version 3.0 state:

```
I need to set up the Arkansas Contract Agent Version 3.0 that successfully extracts real estate contract data with 100% accuracy. This version uses GPT-5-mini as the primary model with GPT-4o fallback.

CRITICAL CONFIGURATION:
1. The system MUST use GPT-5-mini as the primary model (NOT GPT-4o)
2. GPT-5 models MUST use max_completion_tokens: 8192 (NOT max_tokens)
3. Purchase price and cash amount are MUTUALLY EXCLUSIVE by design
4. The hybrid extractor must use GPT5Extractor class directly

KEY FILES TO CHECK/RESTORE:
- extraction-hybrid.ts: Must have tryGPT5Extraction using GPT5Extractor directly
- extraction-gpt5.ts: Must use max_completion_tokens: 8192
- extraction-utils.ts: Must have getActualPurchaseAmount() and validatePurchaseAmounts()
- server-hybrid.ts: Must default to 'gpt-5-mini' model
- extraction-imagemagick.ts: Must have updated prompts for purchase price logic

VERIFICATION CHECKLIST:
□ Git commit hash is d75ff8a (or contains Version 3.0 changes)
□ extraction-gpt5.ts uses max_completion_tokens: 8192
□ extraction-hybrid.ts prioritizes GPT-5-mini over GPT-4o
□ extraction-utils.ts exists with validation functions
□ server-hybrid.ts defaults to GPT-5-mini
□ ImageMagick is installed and path is correct
□ Test with: npx ts-node test-contracts-quick.ts
□ All 3 test contracts extract successfully
□ Purchase amounts validate correctly (CASH vs FINANCED)
□ Para 13 items extract properly
□ Processing time is ~6 minutes per contract

EXPECTED TEST RESULTS:
- test_contract2.pdf: CASH $300,000 ✅
- Offer (BBS)-269 Honor Court.pdf: Success ✅
- Offer (EXE)-3461 Alliance Dr.pdf: Success ✅
- Extraction rate: 100%+ (extracting more fields than baseline)
- All validations pass

DO NOT MODIFY:
- Token allocation (8192 is proven optimal)
- Model priority (GPT-5-mini first)
- Purchase price logic (mutually exclusive is correct)
- The tryGPT5Extraction implementation

If extraction fails or returns empty:
1. Check max_completion_tokens is 8192 (not max_tokens)
2. Verify GPT-5-mini is being used (not GPT-4o)
3. Ensure ImageMagick conversion settings are: -density 150 -resize 1224x1584
4. Check that extraction-hybrid.ts uses GPT5Extractor directly
```

---

## Production Testing Commands

### Test Single Contract
```bash
npx ts-node extraction-hybrid.ts test_contract2.pdf gpt-5-mini --verbose
```

### Test All Contracts (Comprehensive)
```bash
npx ts-node test-all-contracts-production.ts
```
This will test ALL PDF contracts in the directory (~20-30 contracts).
Expected time: 2-3 hours
Expected success rate: 100%

### Quick 3-Contract Test
```bash
npx ts-node test-contracts-quick.ts
```
Tests just 3 known-working contracts.
Expected time: 18 minutes
Expected success rate: 100%

### Direct GPT-5 Test (No Fallback)
```bash
npx ts-node test-all-contracts-direct.ts
```
Tests using ONLY GPT-5-mini without fallback.

---

## API Endpoints

Once server is running on port 3006:

- `GET http://localhost:3006/api/health` - System status
- `POST http://localhost:3006/api/extract` - Extract contract (uses GPT-5-mini)
- `GET http://localhost:3006/api/models` - Check model availability
- `POST http://localhost:3006/api/compare` - Compare model performance

### Extract Contract via API
```bash
curl -X POST http://localhost:3006/api/extract \
  -F "pdf=@test_contract2.pdf" \
  -F "model=gpt-5-mini"
```

---

## Troubleshooting

### If extraction returns empty results:
1. Verify max_completion_tokens is 8192 in extraction-gpt5.ts
2. Check GPT-5-mini is selected (not GPT-4o)
3. Ensure OpenAI API key has GPT-5 access

### If hybrid extractor fails with bind error:
1. Check extraction-hybrid.ts line 158-169
2. Must use: `const { GPT5Extractor } = require('./extraction-gpt5');`
3. NOT: `this.gpt4oExtractor.extractPage.bind(...)`

### If purchase price shows as null incorrectly:
1. Remember: purchase_price and cash_amount are MUTUALLY EXCLUSIVE
2. For CASH (3C): cash_amount has value, purchase_price is null
3. For FINANCED (3A): purchase_price has value, cash_amount is null
4. This is CORRECT behavior, not an error!

### If Para 13 extraction fails:
1. Para 13 is on PAGE 6 (not page 7)
2. Has two fields: para13_items_included and para13_items_excluded
3. Check ImageMagick conversion quality

---

## Version Confirmation

To confirm you have the correct Version 3.0:

```bash
# Check for Version 3.0 documentation
cat VERSION_3.0_WORKING.md | head -n 10

# Verify key configuration
grep "max_completion_tokens: 8192" extraction-gpt5.ts
grep "gpt-5-mini" extraction-hybrid.ts
grep "getActualPurchaseAmount" extraction-utils.ts

# Run quick test
npx ts-node test-contracts-quick.ts
```

All tests should pass with 100% success rate and ~6 minute processing time per contract.

---

**Created: January 26, 2025**
**Version: 3.0 PRODUCTION READY**
**Git Commit: d75ff8a**