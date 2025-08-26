/**
 * HYBRID Server - Supports both GPT-4o and GPT-5 models
 * Automatically detects and uses the best available model
 */

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { HybridExtractor, ModelType } from './extraction-hybrid';
import SellerNetSheetCalculator from './seller-net-sheet-calculator';
import GoogleDriveIntegration from './google-drive-integration';
import CSVExporter from './csv-exporter';
import PDFGenerator from './pdf-generator';
import { getActualPurchaseAmount, validatePurchaseAmounts } from './extraction-utils';

const app = express();
const PORT = process.env.PORT || 3006;

// Use the Hybrid extractor that supports both GPT-4o and GPT-5
const extractionService = new HybridExtractor();
const netSheetCalculator = new SellerNetSheetCalculator();
const csvExporter = new CSVExporter();
const pdfGenerator = new PDFGenerator();
let googleDrive: GoogleDriveIntegration | null = null;

// Initialize Google Drive
(async () => {
  try {
    googleDrive = new GoogleDriveIntegration();
    await googleDrive.initialize();
    console.log('📁 Google Drive integration ready');
  } catch (error) {
    console.log('⚠️  Google Drive not available - will save locally only');
  }
})();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed') as any);
    }
  }
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// Health check
app.get('/api/health', async (req, res) => {
  res.json({ 
    status: 'healthy',
    version: 'HYBRID',
    extraction: 'ImageMagick + GPT-4o/GPT-5 Vision API',
    models: {
      primary: 'gpt-5-mini',  // GPT-5-mini is now PRIMARY!
      fallback: 'gpt-4o',
      experimental: ['gpt-5', 'gpt-5-nano'],
      note: 'GPT-5-mini proven to work better than GPT-4o for vision!'
    },
    message: '🚀 Using GPT-5-mini for superior extraction!'
  });
});

// Model availability check endpoint
app.get('/api/models', async (req, res) => {
  try {
    console.log('🔍 Checking model availability...');
    
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const models = [
      { name: 'gpt-4o', type: 'production' },
      { name: 'gpt-5', type: 'experimental' },
      { name: 'gpt-5-mini', type: 'experimental' },
      { name: 'gpt-5-nano', type: 'experimental' }
    ];
    
    const availability: any[] = [];
    
    for (const model of models) {
      try {
        const testParams: any = {
          model: model.name,
          messages: [{ role: 'user', content: 'Hi' }]
        };
        
        if (model.name.startsWith('gpt-5')) {
          testParams.max_completion_tokens = 10;
        } else {
          testParams.max_tokens = 10;
        }
        
        const response = await openai.chat.completions.create(testParams);
        const hasContent = response.choices?.[0]?.message?.content?.length > 0;
        
        availability.push({
          model: model.name,
          type: model.type,
          available: true,
          functional: hasContent,
          vision: false // Will test separately
        });
        
        // Test vision if text works
        if (hasContent) {
          try {
            const visionParams: any = {
              model: model.name,
              messages: [{
                role: 'user',
                content: [
                  { type: 'text', text: 'Test' },
                  { 
                    type: 'image_url', 
                    image_url: { 
                      url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                      detail: 'low'
                    }
                  }
                ]
              }]
            };
            
            if (model.name.startsWith('gpt-5')) {
              visionParams.max_completion_tokens = 50;
            } else {
              visionParams.max_tokens = 50;
            }
            
            const visionResponse = await openai.chat.completions.create(visionParams);
            const visionWorks = visionResponse.choices?.[0]?.message?.content?.length > 0;
            
            availability[availability.length - 1].vision = visionWorks;
          } catch {
            // Vision not supported
          }
        }
      } catch (error: any) {
        availability.push({
          model: model.name,
          type: model.type,
          available: false,
          functional: false,
          vision: false,
          error: error.message
        });
      }
    }
    
    res.json({ models: availability });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Upload and extract endpoint with model selection
app.post('/api/extract', upload.single('contract'), async (req, res) => {
  let filePath: string | null = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    filePath = req.file.path;
    
    // Get model preference from request - DEFAULT TO GPT-5-MINI!
    const requestedModel = (req.body?.model || req.query?.model || 'gpt-5-mini') as ModelType;
    const fallback = req.body?.fallback !== false && req.query?.fallback !== 'false';
    
    console.log(`📤 Processing upload: ${req.file.originalname}`);
    console.log(`📁 File path: ${filePath}`);
    console.log(`🤖 Requested model: ${requestedModel}`);
    console.log(`🔄 Fallback enabled: ${fallback}`);
    console.log(`🔧 Server built at: ${new Date().toISOString()}`);

    // Use Hybrid extraction
    const result = await extractionService.extractFromPDF(filePath, {
      model: requestedModel,
      fallbackToGPT4o: fallback,
      verbose: true
    });

    if (!result.success) {
      console.error('❌ Extraction failed:', result.error);
      return res.status(500).json({ 
        error: result.error || 'Extraction failed'
      });
    }
    
    // Log extracted data
    console.log('📊 Extraction Result Summary:');
    console.log('  - Success:', result.success);
    console.log('  - Fields:', `${result.fieldsExtracted}/${result.totalFields}`);
    console.log('  - Rate:', result.extractionRate);
    console.log('  - Buyers:', result.data?.buyers);
    console.log('  - Property:', result.data?.property_address);
    
    // Validate purchase price logic
    const validation = validatePurchaseAmounts(result.data);
    const actualAmount = getActualPurchaseAmount(result.data);
    console.log('  - Purchase Amount:', actualAmount ? `$${actualAmount.toLocaleString()}` : 'Not found');
    console.log('  - Validation:', validation.message);
    
    if (result.reasoningTokens) {
      console.log('  - Reasoning Tokens:', result.reasoningTokens);
    }
    
    // Alert if test data detected
    if (result.data?.buyers?.includes('John Doe')) {
      console.error('⚠️ WARNING: Test data detected!');
    }
    
    // Generate seller net sheet if extraction was successful
    let netSheetData = null;
    if (result.success && result.data) {
      try {
        const netSheetInput = {
          purchase_price: result.data.purchase_price || result.data.cash_amount || 0,
          seller_concessions: result.data.para5_custom_text,
          closing_date: result.data.closing_date,
          home_warranty: result.data.home_warranty,
          warranty_amount: result.data.warranty_amount,
          title_option: result.data.title_option,
          para32_other_terms: result.data.para32_other_terms,
          annual_taxes: 3650 // Default, could be made configurable
        };
        
        netSheetData = netSheetCalculator.calculate(netSheetInput);
        
        // Save net sheet to file
        const timestamp = Date.now();
        const netSheetDir = path.join(process.cwd(), 'processed_contracts', 'seller_net_sheets');
        await fs.mkdir(netSheetDir, { recursive: true });
        
        const netSheetPath = path.join(
          netSheetDir,
          `${timestamp}_${req.file?.originalname.replace('.pdf', '')}_net_sheet.json`
        );
        await fs.writeFile(netSheetPath, JSON.stringify(netSheetData, null, 2));
        
        // Also save HTML version
        const htmlReport = netSheetCalculator.generateHTMLReport(netSheetData, result.data.property_address);
        const htmlPath = netSheetPath.replace('.json', '.html');
        await fs.writeFile(htmlPath, htmlReport);
        
        console.log('💰 Net sheet generated successfully');
        console.log(`  - Net to seller: $${netSheetData.cash_to_seller.toLocaleString()}`);
        
        // Create individual Google Sheet for this net sheet
        if (googleDrive) {
          try {
            const driveResult = await googleDrive.createSellerNetSheet(
              netSheetData,
              result.data.property_address || 'Unknown Property',
              result.data
            );
            console.log('📊 Created individual net sheet in Google Drive');
            console.log(`   📎 Link: ${driveResult.shareableLink}`);
            
            // Add link to response
            netSheetData.googleSheetLink = driveResult.shareableLink;
          } catch (driveError) {
            console.error('⚠️  Could not create Google Drive sheet:', driveError);
            
            // Fallback to PDF and CSV export
            try {
              // Generate PDF
              const pdfPath = await pdfGenerator.generateNetSheetPDF(
                netSheetData,
                result.data.property_address || 'Unknown Property',
                result.data
              );
              console.log('📑 Created PDF net sheet as primary output');
              netSheetData.pdfPath = pdfPath;
              
              // Also generate CSV for data portability
              const csvPath = await csvExporter.exportNetSheet(
                netSheetData,
                result.data.property_address || 'Unknown Property',
                result.data
              );
              console.log('📄 Created CSV net sheet for data export');
              netSheetData.csvPath = csvPath;
              
              // Upload both files to Google Drive
              try {
                const uploadResults = await googleDrive.uploadNetSheetFiles(pdfPath, csvPath);
                if (uploadResults.pdfLink) {
                  console.log('☁️  PDF uploaded to Google Drive');
                  netSheetData.pdfDriveLink = uploadResults.pdfLink;
                }
                if (uploadResults.csvLink) {
                  console.log('☁️  CSV uploaded to Google Drive');
                  netSheetData.csvDriveLink = uploadResults.csvLink;
                }
              } catch (uploadError) {
                console.log('⚠️  Could not upload to Drive, files saved locally');
              }
            } catch (exportError) {
              console.error('⚠️  Could not create PDF/CSV:', exportError);
            }
          }
        } else {
          // No Google Drive API available, just create local files
          try {
            // Generate PDF as primary output
            const pdfPath = await pdfGenerator.generateNetSheetPDF(
              netSheetData,
              result.data.property_address || 'Unknown Property',
              result.data
            );
            console.log('📑 Created PDF net sheet');
            netSheetData.pdfPath = pdfPath;
            
            // Also generate CSV
            const csvPath = await csvExporter.exportNetSheet(
              netSheetData,
              result.data.property_address || 'Unknown Property',
              result.data
            );
            console.log('📄 Created CSV net sheet');
            netSheetData.csvPath = csvPath;
          } catch (exportError) {
            console.error('⚠️  Could not create PDF/CSV:', exportError);
          }
        }
      } catch (error) {
        console.error('⚠️  Could not generate net sheet:', error);
      }
    }
    
    // Clean up uploaded file
    await fs.unlink(filePath).catch(() => {});
    
    res.json({
      success: true,
      extractionRate: result.extractionRate,
      fieldsExtracted: result.fieldsExtracted,
      totalFields: result.totalFields,
      model: requestedModel === 'auto' ? 'gpt-5-mini' : requestedModel, // Auto now defaults to GPT-5-mini!
      data: result.data,
      netSheet: netSheetData
    });

  } catch (error: any) {
    console.error('❌ Server Error:', error);
    
    // Clean up file on error
    if (filePath) {
      await fs.unlink(filePath).catch(() => {});
    }
    
    res.status(500).json({ 
      error: error.message || 'Internal server error'
    });
  }
});

// Model comparison endpoint
app.post('/api/compare', upload.single('contract'), async (req, res) => {
  let filePath: string | null = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    filePath = req.file.path;
    console.log(`🔬 Running model comparison for: ${req.file.originalname}`);
    
    const results: any = {};
    const models: ModelType[] = ['gpt-4o', 'gpt-5', 'gpt-5-mini'];
    
    for (const model of models) {
      const start = Date.now();
      
      try {
        const result = await extractionService.extractFromPDF(filePath, {
          model,
          fallbackToGPT4o: false,
          verbose: false
        });
        
        const elapsed = Date.now() - start;
        
        results[model] = {
          success: result.success,
          time: elapsed,
          fieldsExtracted: result.fieldsExtracted,
          extractionRate: result.extractionRate,
          error: result.error
        };
      } catch (error: any) {
        results[model] = {
          success: false,
          error: error.message
        };
      }
    }
    
    // Clean up
    await fs.unlink(filePath).catch(() => {});
    
    res.json({ comparison: results });
    
  } catch (error: any) {
    console.error('❌ Comparison Error:', error);
    
    if (filePath) {
      await fs.unlink(filePath).catch(() => {});
    }
    
    res.status(500).json({ 
      error: error.message || 'Comparison failed'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Hybrid Arkansas Contract Extractor Server`);
  console.log(`📍 Running on port ${PORT}`);
  console.log(`🤖 Models: GPT-4o (production), GPT-5 (experimental)`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log(`📊 Endpoints:`);
  console.log(`   - GET  /api/health    - Health check`);
  console.log(`   - GET  /api/models    - Check model availability`);
  console.log(`   - POST /api/extract   - Extract with model selection`);
  console.log(`   - POST /api/compare   - Compare model performance`);
});

export default app;