/**
 * Analyze all PDF pages to determine extraction methods needed
 */

const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';

async function analyzeAllPages() {
  console.log('\nAnalyzing All Contract Pages');
  console.log('='.repeat(60) + '\n');

  const results = [];

  for (let pageNum = 1; pageNum <= 18; pageNum++) {
    try {
      const pdfPath = `./pages/page${pageNum}.pdf`;
      const dataBuffer = await fs.readFile(pdfPath);
      const pdfData = await pdfParse(dataBuffer);
      const text = pdfData.text;

      // Look for checkboxes
      const hasCheckboxes = 
        text.includes('[X]') || 
        text.includes('[x]') || 
        text.includes('☑') || 
        text.includes('☐') ||
        text.includes('✖') ||
        text.includes('✓');

      // Look for form patterns
      const hasFormPatterns = 
        /\b[A-D]\.\s+(Yes|No)\b/i.test(text) ||
        /Option\s+[A-D]/i.test(text) ||
        /Check\s+one/i.test(text);

      // Look for paragraphs
      const paragraphs = text.match(/\d{1,2}\.\s+[A-Z]/g) || [];
      
      // Look for dates
      const hasDates = /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(text) || /_+\/+_+\/+_+/.test(text);
      
      // Look for blanks
      const hasBlankFields = /_+/.test(text) || /\$_+/.test(text);

      // Determine what's on this page
      let content = [];
      if (paragraphs.length > 0) {
        const paraNumbers = paragraphs.map(p => p.match(/\d+/)?.[0]).filter(Boolean);
        content.push(`Paragraphs ${paraNumbers.join(', ')}`);
      }
      if (hasDates) content.push('dates');
      if (hasBlankFields) content.push('fill-in fields');
      if (hasCheckboxes) content.push('checkboxes');

      // Determine extraction method
      let method = 'TEXT';
      let reason = '';
      
      if (pageNum === 2) {
        method = 'SKIP';
        reason = 'No data to extract (notices)';
      } else if (pageNum === 9) {
        method = 'SKIP';
        reason = 'No data needed per user';
      } else if (pageNum === 17) {
        method = 'SKIP';
        reason = 'Not needed per user';
      } else if (hasCheckboxes || hasFormPatterns) {
        method = 'VISION';
        reason = 'Has checkboxes or selection options';
      } else if (pageNum === 12) {
        method = 'MAYBE_VISION';
        reason = 'Has date field - may need Vision';
      }

      results.push({
        page: pageNum,
        method,
        content: content.join(', ') || 'text only',
        reason,
        textLength: text.length
      });

    } catch (error) {
      results.push({
        page: pageNum,
        method: 'ERROR',
        content: 'Could not analyze',
        reason: String(error),
        textLength: 0
      });
    }
  }

  // Display results
  console.log('📊 PAGE ANALYSIS SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\n🔍 PAGES NEEDING VISION API:');
  results.filter(r => r.method === 'VISION').forEach(r => {
    console.log(`  Page ${r.page}: ${r.content} - ${r.reason}`);
  });

  console.log('\n📝 PAGES FOR TEXT EXTRACTION:');
  results.filter(r => r.method === 'TEXT').forEach(r => {
    console.log(`  Page ${r.page}: ${r.content}`);
  });

  console.log('\n❓ UNCERTAIN (may need Vision):');
  results.filter(r => r.method === 'MAYBE_VISION').forEach(r => {
    console.log(`  Page ${r.page}: ${r.content} - ${r.reason}`);
  });

  console.log('\n⏭️  PAGES TO SKIP:');
  results.filter(r => r.method === 'SKIP').forEach(r => {
    console.log(`  Page ${r.page}: ${r.reason}`);
  });

  // Summary count
  const visionCount = results.filter(r => r.method === 'VISION').length;
  const textCount = results.filter(r => r.method === 'TEXT').length;
  const skipCount = results.filter(r => r.method === 'SKIP').length;
  const maybeCount = results.filter(r => r.method === 'MAYBE_VISION').length;

  console.log('\n' + '='.repeat(60));
  console.log('TOTALS:');
  console.log(`  Vision API needed: ${visionCount} pages`);
  console.log(`  Text extraction: ${textCount} pages`);
  console.log(`  Maybe Vision: ${maybeCount} pages`);
  console.log(`  Skip: ${skipCount} pages`);
  console.log(`  Total: ${results.length} pages`);

  // Save results
  await fs.writeFile('./page_analysis.json', JSON.stringify(results, null, 2));
  console.log('\n✓ Full analysis saved to page_analysis.json');

  return results;
}

analyzeAllPages().catch(console.error);