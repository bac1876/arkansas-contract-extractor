# Decisions

## Key Architectural Decisions

### 1. GPT-4 Vision API over Traditional OCR
**Decision**: Use OpenAI's GPT-4 Vision API instead of traditional OCR tools
**Date**: January 2025
**Rationale**:
- Superior checkbox detection (critical for contract fields)
- Handles handwritten notes effectively
- Understands context, not just text extraction
- 100% accuracy achieved vs 70-80% with OCR
**Trade-offs**:
- Higher API costs (~$0.10-0.30 per contract)
- Requires internet connectivity
- API rate limits

### 2. ImageMagick for PDF Conversion
**Decision**: Use ImageMagick binary for PDF to PNG conversion
**Date**: January 2025
**Rationale**:
- Most reliable conversion quality
- Preserves checkbox visibility
- Better than pdf2pic, canvas, or pdfjs-dist
- Handles multi-page documents efficiently
**Trade-offs**:
- Requires external binary installation
- Platform-specific setup needed
- Temporary file management overhead

### 3. Page-by-Page Extraction Strategy
**Decision**: Process each page individually with targeted prompts
**Date**: January 2025
**Rationale**:
- Allows specific field targeting per page
- Reduces token usage and costs
- Enables parallel processing potential
- Better error isolation
**Implementation**:
- Page 1: Parties and property
- Page 4-5: Financial terms
- Page 6: Para 13 fixtures (critical fix)
- Page 7+: Contingencies and dates

### 4. No Seller Information Extraction
**Decision**: Explicitly exclude seller data from extraction
**Date**: January 2025
**Rationale**:
- User requirement (emphasized 5+ times)
- Reduces processing complexity
- Privacy consideration
- Focus on buyer-side transaction management
**Impact**:
- Simplified data model
- Faster processing
- Reduced storage requirements

### 5. TypeScript over JavaScript
**Decision**: Use TypeScript for all new code
**Date**: Project inception
**Rationale**:
- Type safety for complex data structures
- Better IDE support and autocomplete
- Easier refactoring
- Self-documenting code
**Trade-offs**:
- Compilation step required
- Learning curve for contributors

### 6. Express Server Architecture
**Decision**: Simple Express server over complex frameworks
**Date**: Project inception
**Rationale**:
- Lightweight and fast
- Easy deployment
- Minimal dependencies
- Well-understood by developers
**Alternatives Considered**:
- Next.js (overkill for API-only service)
- Fastify (less ecosystem support)
- NestJS (too complex for requirements)

### 7. Google Service Account Authentication
**Decision**: Use service accounts instead of OAuth
**Date**: January 2025
**Rationale**:
- No user interaction required
- Permanent authentication
- Better for automated workflows
- Simpler implementation
**Trade-offs**:
- Requires key file management
- Less flexible permissions

### 8. Email Monitoring via IMAP
**Decision**: Direct IMAP connection over email webhooks
**Date**: January 2025
**Rationale**:
- Works with any email provider
- No webhook setup required
- Full email access and control
- Can process historical emails
**Trade-offs**:
- Requires polling
- App-specific passwords needed
- Connection management complexity

### 9. Local File Storage for Processing
**Decision**: Store files locally during processing
**Date**: Project inception
**Rationale**:
- Faster processing
- No cloud storage costs
- Better for development/testing
- Data sovereignty
**Future Consideration**:
- Move to S3/Cloud storage for scale
- Implement cleanup policies

### 10. CSV + JSON Dual Output
**Decision**: Always generate both CSV and JSON outputs
**Date**: January 2025
**Rationale**:
- CSV for spreadsheet users
- JSON for API integration
- No additional processing cost
- Covers all use cases
**Format Details**:
- CSV: Flattened structure, Excel-compatible
- JSON: Nested structure, preserves types

## Pivotal Fixes

### Para 13 Page Mapping Fix
**Issue**: Para 13 was being read from page 7 instead of page 6
**Resolution**: Corrected page mapping in extraction logic
**Impact**: Fixed missing fixture data, achieved 100% extraction

### Checkbox Detection Enhancement
**Issue**: Standard OCR missing checkbox states
**Resolution**: GPT-4 Vision API with visual prompts
**Impact**: Reliable checkbox state detection

## Future Decision Points

1. **Multi-state Support**: Standardize or customize per state?
2. **Cloud Deployment**: AWS, Azure, or Google Cloud?
3. **Database Integration**: PostgreSQL or MongoDB for persistence?
4. **Caching Strategy**: Redis for extraction results?
5. **API Gateway**: Rate limiting and authentication approach?