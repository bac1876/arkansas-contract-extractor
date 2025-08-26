# Hybrid GPT-4/GPT-5 Extraction Implementation Guide

## Current State (As of 8/25/2025)

### Testing Results
- **GPT-4**: 90% accuracy, $0.14 per contract
- **GPT-5**: 117% extraction rate but only 67% accuracy on critical fields, $0.04 per contract
- **Main Issues with GPT-5**:
  - Cannot extract Para 5 seller concessions amount ("$10k")
  - OCR errors on buyer names
  - Cannot extract Para 38 expiration date/time
  - Missing other filled-in form values

### What Works with GPT-5
- ✅ Processes all 17 pages
- ✅ Extracts checkboxes correctly
- ✅ Gets pre-printed text
- ✅ 83% cheaper than GPT-4

## Hybrid Solution Design

### Cost: $0.069 per contract (51% cheaper than full GPT-4)

### Pages Requiring GPT-4 (5 pages):
1. **Page 1**: Buyer names, property address, purchase price
2. **Page 4**: Para 5 seller concessions, Para 7-8 earnest money/non-refundable
3. **Page 14**: Para 32 additional terms, buyer agency fees
4. **Page 15**: Para 38 contract expiration
5. **Page 16**: Agent information

### Pages for GPT-5 (12 pages):
- Pages 2, 3, 5-13, 17
- All checkbox selections
- Standard form options

## Implementation Steps

### Step 1: Create New Hybrid Extractor Class
Create `extraction-hybrid.ts` that:
- Uses GPT-4 for pages [1, 4, 14, 15, 16]
- Uses GPT-5 for all other pages
- Merges results from both models

### Step 2: Update Email Monitor
Modify `email-monitor.ts` to:
- Use hybrid extractor instead of GPT-5
- Handle the merged results properly

### Step 3: Test on All Contracts
Test contracts to verify:
1. Offer (EXE)-3418 Justice Dr.pdf ✓ (manually tested)
2. Offer (EXE)-3461 Alliance Dr.pdf
3. Offer (EXE)-18 Alyce Ln.pdf
4. Offer (EXE)-2702 Hughmount Rd.pdf
5. Offer (EXE) 10050 Smokey Bear Rd (1).pdf
6. Offer (EXE)-3315 Alliance Dr.pdf
7. Offer (BBS)-269 Honor Court.pdf

### Step 4: Update Net Sheet Calculator
Ensure `seller-net-sheet-calculator.ts` handles:
- Para 5 seller concessions correctly
- Buyer agency fees from Para 32
- All new fields from hybrid extraction

## Code Structure Needed

```typescript
// extraction-hybrid.ts
class HybridExtractor {
  private gpt4Pages = [1, 4, 14, 15, 16];
  private gpt5Pages = [2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 17];
  
  async extractFromPDF(pdfPath: string) {
    // Convert PDF to images
    // Extract gpt4Pages with GPT-4
    // Extract gpt5Pages with GPT-5
    // Merge results
    // Return combined data
  }
}
```

## Expected Results
- **Accuracy**: 95%+ on all critical fields
- **Cost**: $0.069 per contract
- **Fields Properly Extracted**:
  - ✅ Buyer names
  - ✅ Para 5 seller concessions ($10k)
  - ✅ Para 32 buyer agency fees (2.7%)
  - ✅ Para 38 expiration date/time
  - ✅ All checkboxes and standard fields

## After Restart Instructions

**Tell Claude Code exactly this:**

"Continue implementing the hybrid GPT-4/GPT-5 extraction system as documented in HYBRID_EXTRACTION_TODO.md. Create extraction-hybrid.ts that uses GPT-4 for pages 1,4,14,15,16 and GPT-5 for all other pages. Test it on the 3418 Justice Dr contract to verify it extracts the $10k seller concession and all other critical fields correctly."

## Current File States
- `extraction-gpt5.ts`: Updated with improved prompts but still missing critical fields
- `extraction-gpt4o.ts`: Original GPT-4 extractor (works but expensive)
- `email-monitor.ts`: Currently using GPT-5 extractor
- `3418 Justice Dr`: Manual extraction completed, needs 95%+ accuracy

## Success Criteria
1. Extract "$10k" from Para 5 on page 4
2. Extract "Antonio Pimentel II" correctly (not III)
3. Extract "December 29, 2024 at 9:00 PM" from Para 38
4. Extract "2.7%" buyer agency fee from Para 32
5. Maintain cost under $0.07 per contract