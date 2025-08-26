/**
 * Cleanup Utility - Remove duplicates and fix issues
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { DuplicatePreventionService } from './duplicate-prevention-service';

async function cleanupDuplicates() {
  console.log('🧹 Arkansas Contract Agent - Cleanup Utility');
  console.log('============================================\n');

  const duplicateService = new DuplicatePreventionService();

  // 1. Find and remove duplicate PDFs
  console.log('📁 Checking for duplicate PDFs...');
  const pdfDir = path.join('processed_contracts', 'pdfs');
  
  try {
    const files = await fs.readdir(pdfDir);
    
    // Group files by property address
    const filesByProperty = new Map<string, Array<{name: string, timestamp: number}>>();
    
    for (const file of files) {
      // Extract property address from filename (timestamp_property.pdf)
      const match = file.match(/^(\d+)_(.*?)\.pdf$/);
      if (match) {
        const timestamp = parseInt(match[1]);
        const property = match[2];
        
        if (!filesByProperty.has(property)) {
          filesByProperty.set(property, []);
        }
        
        filesByProperty.get(property)!.push({ name: file, timestamp });
      }
    }

    // Find and remove duplicates
    let totalDuplicates = 0;
    const duplicateReport: string[] = [];

    for (const [property, propertyFiles] of filesByProperty.entries()) {
      if (propertyFiles.length > 1) {
        // Sort by timestamp (newest first)
        propertyFiles.sort((a, b) => b.timestamp - a.timestamp);
        
        console.log(`\n📍 Property: ${property}`);
        console.log(`   Found ${propertyFiles.length} files:`);
        
        propertyFiles.forEach((file, index) => {
          const date = new Date(file.timestamp);
          const status = index === 0 ? '✅ KEEP' : '🗑️ DELETE';
          console.log(`   ${status}: ${file.name} (${date.toLocaleString()})`);
        });

        // Delete duplicates (keep the newest)
        for (let i = 1; i < propertyFiles.length; i++) {
          const filePath = path.join(pdfDir, propertyFiles[i].name);
          try {
            await fs.unlink(filePath);
            duplicateReport.push(`Removed: ${propertyFiles[i].name}`);
            totalDuplicates++;
          } catch (error) {
            console.error(`   ❌ Failed to delete ${propertyFiles[i].name}:`, error);
          }
        }
      }
    }

    console.log(`\n✅ Removed ${totalDuplicates} duplicate PDF files`);

    // 2. Clean up result files
    console.log('\n📊 Checking for duplicate result files...');
    const resultsDir = path.join('processed_contracts', 'results');
    let resultDuplicates = 0;
    
    try {
      const resultFiles = await fs.readdir(resultsDir);
      const resultsByProperty = new Map<string, Array<{name: string, timestamp: number}>>();
      
      for (const file of resultFiles) {
        const match = file.match(/^(\d+)_(.*?)_result\.json$/);
        if (match) {
          const timestamp = parseInt(match[1]);
          const property = match[2];
          
          if (!resultsByProperty.has(property)) {
            resultsByProperty.set(property, []);
          }
          
          resultsByProperty.get(property)!.push({ name: file, timestamp });
        }
      }

      for (const [property, files] of resultsByProperty.entries()) {
        if (files.length > 1) {
          files.sort((a, b) => b.timestamp - a.timestamp);
          
          // Keep newest, delete rest
          for (let i = 1; i < files.length; i++) {
            const filePath = path.join(resultsDir, files[i].name);
            try {
              await fs.unlink(filePath);
              resultDuplicates++;
            } catch (error) {
              console.error(`Failed to delete ${files[i].name}:`, error);
            }
          }
        }
      }

      console.log(`✅ Removed ${resultDuplicates} duplicate result files`);
    } catch (error) {
      console.log('⚠️ No results directory found');
    }

    // 3. Clean up net sheets
    console.log('\n📄 Checking for duplicate net sheets...');
    const netSheetDirs = ['net_sheets_pdf', 'net_sheets_csv'];
    
    for (const dir of netSheetDirs) {
      try {
        const files = await fs.readdir(dir);
        const filesByProperty = new Map<string, string[]>();
        
        for (const file of files) {
          // Extract property from netsheet_[property].[pdf|csv]
          const match = file.match(/^netsheet_(.*?)\.(pdf|csv)$/);
          if (match) {
            const property = match[1];
            if (!filesByProperty.has(property)) {
              filesByProperty.set(property, []);
            }
            filesByProperty.get(property)!.push(file);
          }
        }

        // Net sheets shouldn't have duplicates, but check anyway
        for (const [property, files] of filesByProperty.entries()) {
          if (files.length > 1) {
            console.log(`⚠️ Found ${files.length} net sheets for ${property}`);
          }
        }
      } catch (error) {
        console.log(`⚠️ Directory ${dir} not found`);
      }
    }

    // 4. Clean up temp directories
    console.log('\n🗑️ Checking for leftover temp directories...');
    const mainDir = '.';
    const entries = await fs.readdir(mainDir);
    let tempDirsRemoved = 0;

    for (const entry of entries) {
      if (entry.startsWith('magick_temp_') || entry.startsWith('temp_') || entry.startsWith('pdf2pic_temp_')) {
        const fullPath = path.join(mainDir, entry);
        try {
          const stat = await fs.stat(fullPath);
          if (stat.isDirectory()) {
            await fs.rm(fullPath, { recursive: true, force: true });
            console.log(`   Removed: ${entry}`);
            tempDirsRemoved++;
          }
        } catch (error) {
          console.error(`   Failed to remove ${entry}:`, error);
        }
      }
    }

    console.log(`✅ Removed ${tempDirsRemoved} temporary directories`);

    // 5. Generate summary report
    console.log('\n📊 Cleanup Summary');
    console.log('==================');
    console.log(`✅ PDF duplicates removed: ${totalDuplicates}`);
    console.log(`✅ Result duplicates removed: ${resultDuplicates}`);
    console.log(`✅ Temp directories removed: ${tempDirsRemoved}`);
    console.log(`✅ Total items cleaned: ${totalDuplicates + resultDuplicates + tempDirsRemoved}`);

    // 6. Save cleanup report
    const report = {
      timestamp: new Date().toISOString(),
      pdfsRemoved: totalDuplicates,
      resultsRemoved: resultDuplicates,
      tempDirsRemoved: tempDirsRemoved,
      duplicateFiles: duplicateReport
    };

    await fs.writeFile(
      `cleanup_report_${Date.now()}.json`,
      JSON.stringify(report, null, 2)
    );

    console.log('\n✅ Cleanup complete! Report saved.');

  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  cleanupDuplicates().catch(console.error);
}

export { cleanupDuplicates };