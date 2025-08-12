/**
 * Position-based extraction for Para 18-19 using coordinate analysis
 * This solves the problem where options and checkmarks are separated in text extraction
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import * as fs from 'fs/promises';
import * as path from 'path';

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.entry');

interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

async function extractWithPositions(pdfPath: string): Promise<TextItem[]> {
  const data = await fs.readFile(pdfPath);
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const allTextItems: TextItem[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    for (const item of textContent.items) {
      if ('str' in item && item.str.trim()) {
        allTextItems.push({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width || 0,
          height: item.height || 0,
          page: pageNum
        });
      }
    }
  }

  return allTextItems;
}

function findNearestOption(xMark: TextItem, options: TextItem[], maxDistance: number = 100): string | null {
  let nearest: TextItem | null = null;
  let minDistance = maxDistance;

  for (const option of options) {
    // Check if option is on same page and above or at same level as X mark
    if (option.page === xMark.page) {
      // Calculate distance (considering Y increases from bottom to top in PDF)
      const dx = Math.abs(xMark.x - option.x);
      const dy = Math.abs(xMark.y - option.y);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        nearest = option;
      }
    }
  }

  return nearest ? nearest.text : null;
}

async function extractPara18and19(pdfPath: string) {
  console.log(`\nAnalyzing: ${path.basename(pdfPath)}`);
  console.log('='.repeat(60));

  try {
    const textItems = await extractWithPositions(pdfPath);
    
    // Find Para 18 and 19 region
    const para18Index = textItems.findIndex(item => item.text.trim() === '18.');
    const para19Index = textItems.findIndex(item => item.text.trim() === '19.');
    const para20Index = textItems.findIndex(item => item.text.trim() === '20.');
    
    if (para18Index === -1 || para19Index === -1) {
      console.log('Could not find Para 18 or 19');
      return null;
    }

    console.log(`Found Para 18 at index ${para18Index}`);
    console.log(`Found Para 19 at index ${para19Index}`);
    if (para20Index !== -1) {
      console.log(`Found Para 20 at index ${para20Index}`);
    }

    // Extract options between Para 18 and Para 20
    const optionRegion = textItems.slice(para18Index, para20Index !== -1 ? para20Index : para19Index + 10);
    
    // Find all options (A, B, C, D)
    const para18Options: TextItem[] = [];
    const para19Options: TextItem[] = [];
    
    let currentPara = 18;
    for (const item of optionRegion) {
      if (item.text.trim() === '19.') {
        currentPara = 19;
        continue;
      }
      
      if (item.text.trim().match(/^[A-D]\.?$/)) {
        if (currentPara === 18) {
          para18Options.push(item);
        } else {
          para19Options.push(item);
        }
      }
    }

    console.log(`\nPara 18 options found: ${para18Options.map(o => o.text).join(', ')}`);
    console.log(`Para 19 options found: ${para19Options.map(o => o.text).join(', ')}`);

    // Find ✖ marks or X marks
    const xMarks = textItems.filter(item => 
      item.text.includes('✖') || 
      item.text.includes('X') && item.text.length === 1 ||
      item.text.includes('x') && item.text.length === 1
    );

    console.log(`\nFound ${xMarks.length} potential X marks in document`);

    // Find X marks near our paragraphs (same page, reasonable Y distance)
    const para18Page = textItems[para18Index].page;
    const para18Y = textItems[para18Index].y;
    
    const relevantXMarks = xMarks.filter(mark => {
      return mark.page === para18Page && 
             Math.abs(mark.y - para18Y) < 200; // Within 200 units vertically
    });

    console.log(`Found ${relevantXMarks.length} X marks near Para 18-19`);

    if (relevantXMarks.length > 0) {
      console.log('\nX Mark Positions:');
      for (const mark of relevantXMarks) {
        console.log(`  "${mark.text}" at (${mark.x.toFixed(1)}, ${mark.y.toFixed(1)}) on page ${mark.page}`);
      }

      // Now map X marks to nearest options
      console.log('\nMapping X marks to options:');
      
      const allOptions = [...para18Options, ...para19Options];
      const selections: { para: number, option: string }[] = [];

      for (const xMark of relevantXMarks) {
        const nearestOption = findNearestOption(xMark, allOptions);
        if (nearestOption) {
          // Determine which paragraph this option belongs to
          const optionLetter = nearestOption.replace('.', '');
          const isPara18 = para18Options.some(o => o.text.includes(optionLetter));
          const para = isPara18 ? 18 : 19;
          
          console.log(`  X mark at (${xMark.x.toFixed(1)}, ${xMark.y.toFixed(1)}) → Para ${para} Option ${optionLetter}`);
          selections.push({ para, option: optionLetter });
        }
      }

      // Extract final selections
      const para18Selection = selections.find(s => s.para === 18)?.option || null;
      const para19Selection = selections.find(s => s.para === 19)?.option || null;

      console.log('\n' + '='.repeat(60));
      console.log('EXTRACTED SELECTIONS:');
      console.log(`Para 18: ${para18Selection || 'Not detected'}`);
      console.log(`Para 19: ${para19Selection || 'Not detected'}`);

      return { para18: para18Selection, para19: para19Selection };
    } else {
      // Try alternative: Look at the positions of options and see if any are offset
      console.log('\nNo clear X marks found. Analyzing option positions for anomalies...');
      
      // Check if any options have different X positions (might indicate selection)
      console.log('\nPara 18 option positions:');
      for (const opt of para18Options) {
        console.log(`  ${opt.text} at X=${opt.x.toFixed(1)}, Y=${opt.y.toFixed(1)}`);
      }
      
      console.log('\nPara 19 option positions:');
      for (const opt of para19Options) {
        console.log(`  ${opt.text} at X=${opt.x.toFixed(1)}, Y=${opt.y.toFixed(1)}`);
      }

      // Look for options that are offset (selected options might be indented or at different X)
      const findAnomalousOption = (options: TextItem[]) => {
        if (options.length < 2) return null;
        
        const xPositions = options.map(o => o.x);
        const avgX = xPositions.reduce((a, b) => a + b, 0) / xPositions.length;
        
        for (const opt of options) {
          if (Math.abs(opt.x - avgX) > 5) { // More than 5 units different
            return opt.text.replace('.', '');
          }
        }
        return null;
      };

      const para18Anomaly = findAnomalousOption(para18Options);
      const para19Anomaly = findAnomalousOption(para19Options);

      if (para18Anomaly || para19Anomaly) {
        console.log('\nDetected anomalous positions:');
        if (para18Anomaly) console.log(`Para 18: Option ${para18Anomaly} has different position`);
        if (para19Anomaly) console.log(`Para 19: Option ${para19Anomaly} has different position`);
      }

      return { para18: para18Anomaly, para19: para19Anomaly };
    }
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

async function main() {
  console.log('Position-Based Extraction for Para 18-19');
  console.log('=========================================\n');

  const contracts = [
    './sample_contract_flat.pdf',
    './Offer (EXE)-3461 Alliance Dr.pdf'
  ];

  const results = [];
  
  for (const contract of contracts) {
    const result = await extractPara18and19(contract);
    results.push({
      file: path.basename(contract),
      ...result
    });
  }

  // Save results
  await fs.writeFile(
    './position_extraction_results.json',
    JSON.stringify(results, null, 2)
  );

  console.log('\n\nFINAL RESULTS:');
  console.log('='.repeat(60));
  for (const result of results) {
    console.log(`\n${result.file}:`);
    console.log(`  Para 18: ${result.para18 || 'Not detected'}`);
    console.log(`  Para 19: ${result.para19 || 'Not detected'}`);
  }
  
  console.log('\n✓ Results saved to position_extraction_results.json');
}

// Run the extraction
main().catch(console.error);