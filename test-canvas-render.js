// Test if we can render PDFs using pdfjs-dist + canvas
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Use the legacy build for Node.js
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf');

async function testRender() {
  try {
    console.log('Testing PDF rendering with canvas...');
    
    const pdfPath = path.join(__dirname, 'test_contract2.pdf');
    const pdfData = new Uint8Array(fs.readFileSync(pdfPath));
    
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });
    
    const pdfDoc = await loadingTask.promise;
    console.log('PDF loaded, pages:', pdfDoc.numPages);
    
    // Test rendering page 1
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    
    console.log('Page dimensions:', viewport.width, 'x', viewport.height);
    
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    console.log('✅ Rendering successful!');
    
    // Save test image
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('test_page1.png', buffer);
    console.log('Saved test_page1.png');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testRender();