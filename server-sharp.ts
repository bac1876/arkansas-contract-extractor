/**
 * Express Server using Sharp + pdfjs-dist (no external dependencies)
 * Pure JavaScript solution - no GraphicsMagick/ImageMagick required
 */

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { SharpPDFExtractor } from './extraction-sharp';

const app = express();
const PORT = process.env.PORT || 3003;

// Use the Sharp-based extractor
const extractionService = new SharpPDFExtractor();

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
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    version: '4.0',
    extraction: 'Sharp + pdfjs-dist',
    message: 'Pure JavaScript - No external dependencies!'
  });
});

// Upload and extract endpoint
app.post('/api/extract', upload.single('contract'), async (req, res) => {
  let filePath: string | null = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    filePath = req.file.path;
    console.log(`📤 Processing upload: ${req.file.originalname}`);
    console.log(`📍 File path: ${filePath}`);

    // Use Sharp extraction
    const result = await extractionService.extractFromPDF(filePath);

    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Extraction failed'
      });
    }

    // Clean up uploaded file
    await fs.unlink(filePath).catch(err => {
      console.warn('⚠️ Could not delete uploaded file:', err.message);
    });

    // Return results
    res.json({
      success: true,
      filename: req.file.originalname,
      extractionRate: result.extractionRate,
      fieldsExtracted: result.fieldsExtracted,
      totalFields: result.totalFields,
      data: result.data,
      csv: extractionService.toCSV(result.data!),
      estimatedCost: '$0.14'
    });

  } catch (error) {
    console.error('❌ Server error:', error);
    
    if (filePath) {
      await fs.unlink(filePath).catch(() => {});
    }

    res.status(500).json({ 
      error: 'Server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Batch upload endpoint
app.post('/api/extract-batch', upload.array('contracts', 10), async (req, res) => {
  if (!req.files || !Array.isArray(req.files)) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const results = [];
  
  for (const file of req.files) {
    try {
      console.log(`📦 Processing batch file: ${file.originalname}`);
      const result = await extractionService.extractFromPDF(file.path);
      
      results.push({
        filename: file.originalname,
        success: result.success,
        extractionRate: result.extractionRate,
        data: result.data,
        error: result.error
      });

      // Clean up file
      await fs.unlink(file.path).catch(() => {});
    } catch (error) {
      results.push({
        filename: file.originalname,
        success: false,
        error: 'Processing failed'
      });
    }
  }

  res.json({
    success: true,
    totalFiles: req.files.length,
    results,
    estimatedTotalCost: `$${(req.files.length * 0.14).toFixed(2)}`
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Arkansas Contract Extractor Server (Sharp Edition)`);
  console.log(`📍 Running at: http://localhost:${PORT}`);
  console.log(`✅ Using Sharp + pdfjs-dist (Pure JavaScript)`);
  console.log(`🎯 No external dependencies required!`);
  console.log(`📄 Finally fixed the path issues!`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  server.close(() => process.exit(0));
});

// Keep alive
setInterval(() => {}, 1000 * 60 * 60);