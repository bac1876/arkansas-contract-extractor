import express from 'express';
import { ImageMagickExtractor } from './extraction-imagemagick';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const extractor = new ImageMagickExtractor();

app.get('/test', async (req, res) => {
  try {
    const testFile = path.resolve('uploads/1755021099036-test_contract2.pdf');
    console.log('Testing with:', testFile);
    
    const result = await extractor.extractFromPDF(testFile);
    
    res.json({
      success: result.success,
      rate: result.extractionRate,
      fields: `${result.fieldsExtracted}/${result.totalFields}`,
      error: result.error
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3007;
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log(`Visit http://localhost:${PORT}/test to test extraction`);
});