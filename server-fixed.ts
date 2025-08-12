/**
 * FIXED Express Server - Uses working extraction
 */

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { FixedContractExtractor } from './extraction-fixed';

const app = express();
const PORT = process.env.PORT || 3001;

// Use the FIXED extractor
const extractionService = new FixedContractExtractor();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
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
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

    // Use FIXED extraction
    const result = await extractionService.extractFromPDF(filePath);

    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Extraction failed'
      });
    }

    // Clean up
    await fs.unlink(filePath).catch(() => {});

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

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 FIXED Arkansas Contract Extractor Server`);
  console.log(`📍 Running at: http://localhost:${PORT}`);
  console.log(`✅ Using FIXED extraction with tempimg_ folders`);
});

// Keep alive
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});

setInterval(() => {}, 1000 * 60 * 60);