/**
 * Robust Extraction System with Multiple Retries and Fallback Logic
 * Ensures extraction always attempts multiple times before giving up
 */

import { HybridExtractor } from './extraction-hybrid';
import { FallbackExtractor } from './extraction-fallback';
import { ImageMagickExtractor } from './extraction-imagemagick';
import { ExtractionValidator } from './extraction-validator';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ExtractionAttempt {
  attemptNumber: number;
  method: string;
  success: boolean;
  fieldsExtracted?: number;
  error?: string;
  duration: number;
  fullResult?: any; // Store the complete extraction result to avoid re-running
}

export interface RobustExtractionResult {
  success: boolean;
  data?: any;
  error?: string;
  extractionRate?: string;
  fieldsExtracted?: number;
  totalFields?: number;
  attempts: ExtractionAttempt[];
  finalMethod?: string;
  isPartial?: boolean;
}

export class RobustExtractor {
  private hybridExtractor: HybridExtractor;
  private fallbackExtractor: FallbackExtractor;
  private imagemagickExtractor: ImageMagickExtractor;

  // SAFETY FIX: Add absolute limit to prevent unbounded array growth
  private readonly MAX_TOTAL_ATTEMPTS = 10;

  // Configuration for retry behavior
  private config = {
    maxPrimaryAttempts: 3,      // Try main extraction 3 times
    maxFallbackAttempts: 2,      // Try fallback extraction 2 times
    retryDelay: 2000,           // Wait 2 seconds between retries
    timeoutPerAttempt: 300000,  // 300 seconds (5 min) timeout per attempt - allows ~17 pages at 60s each
    minFieldsForSuccess: 15,    // Minimum fields to consider extraction successful
    acceptPartialAfterAttempts: 2  // Accept partial extraction after 2 failed attempts
  };

  constructor() {
    this.hybridExtractor = new HybridExtractor();
    this.fallbackExtractor = new FallbackExtractor();
    this.imagemagickExtractor = new ImageMagickExtractor();
  }

  /**
   * Main extraction method with robust retry logic
   */
  async extractFromPDF(pdfPath: string): Promise<RobustExtractionResult> {
    console.log('🚀 Starting Robust Extraction Process');
    console.log(`📄 PDF: ${path.basename(pdfPath)}`);
    
    const attempts: ExtractionAttempt[] = [];
    let bestResult: any = null;
    let bestFieldCount = 0;
    
    // Phase 1: Try primary extraction with GPT-5-mini (multiple attempts)
    console.log('\n📊 Phase 1: Primary Extraction (GPT-5-mini)');
    for (let attempt = 1; attempt <= this.config.maxPrimaryAttempts; attempt++) {
      console.log(`\n🔄 Attempt ${attempt}/${this.config.maxPrimaryAttempts}`);
      
      const attemptResult = await this.attemptExtraction(
        'GPT-5-mini',
        async () => this.hybridExtractor.extractFromPDF(pdfPath, {
          model: 'gpt-5-mini',
          fallbackToGPT4o: false,
          verbose: false
        }),
        attempt
      );

      // SAFETY FIX: Enforce maximum attempts limit
      if (attempts.length >= this.MAX_TOTAL_ATTEMPTS) {
        console.error(`❌ Safety limit reached: ${this.MAX_TOTAL_ATTEMPTS} attempts exceeded`);
        break;
      }

      attempts.push(attemptResult);

      // Check if extraction was successful
      if (attemptResult.success && attemptResult.fieldsExtracted) {
        // If we got enough fields, we're done
        if (attemptResult.fieldsExtracted >= this.config.minFieldsForSuccess && attemptResult.fullResult) {
          console.log(`✅ Successful extraction with ${attemptResult.fieldsExtracted} fields!`);
          
          // Use the cached result instead of re-running extraction
          const result = attemptResult.fullResult;
          
          return {
            success: true,
            data: result.data,
            extractionRate: result.extractionRate,
            fieldsExtracted: result.fieldsExtracted,
            totalFields: result.totalFields,
            attempts,
            finalMethod: 'GPT-5-mini'
          };
        }
        
        // Keep track of best partial result
        if (attemptResult.fieldsExtracted > bestFieldCount && attemptResult.fullResult) {
          bestFieldCount = attemptResult.fieldsExtracted;
          bestResult = attemptResult.fullResult; // Use cached result
        }
      }
      
      // Wait before retrying (except on last attempt)
      if (attempt < this.config.maxPrimaryAttempts) {
        console.log(`⏳ Waiting ${this.config.retryDelay/1000}s before retry...`);
        await this.delay(this.config.retryDelay);
      }
    }
    
    // Phase 2: Try GPT-4o extraction if GPT-5 failed
    console.log('\n📊 Phase 2: Fallback to GPT-4o');
    for (let attempt = 1; attempt <= 2; attempt++) {
      console.log(`\n🔄 GPT-4o Attempt ${attempt}/2`);
      
      const attemptResult = await this.attemptExtraction(
        'GPT-4o',
        async () => this.imagemagickExtractor.extractFromPDF(pdfPath),
        attempt
      );

      // SAFETY FIX: Enforce maximum attempts limit
      if (attempts.length >= this.MAX_TOTAL_ATTEMPTS) {
        console.error(`❌ Safety limit reached: ${this.MAX_TOTAL_ATTEMPTS} attempts exceeded`);
        break;
      }

      attempts.push(attemptResult);
      
      if (attemptResult.success && attemptResult.fieldsExtracted) {
        if (attemptResult.fieldsExtracted >= this.config.minFieldsForSuccess && attemptResult.fullResult) {
          console.log(`✅ GPT-4o extraction successful with ${attemptResult.fieldsExtracted} fields!`);
          
          // Use the cached result instead of re-running extraction
          const result = attemptResult.fullResult;
          
          return {
            success: true,
            data: result.data,
            extractionRate: result.extractionRate,
            fieldsExtracted: result.fieldsExtracted,
            totalFields: result.totalFields,
            attempts,
            finalMethod: 'GPT-4o'
          };
        }
        
        // Update best result if this is better
        if (attemptResult.fieldsExtracted > bestFieldCount && attemptResult.fullResult) {
          bestFieldCount = attemptResult.fieldsExtracted;
          bestResult = attemptResult.fullResult; // Use cached result
        }
      }
      
      if (attempt < 2) {
        await this.delay(this.config.retryDelay);
      }
    }
    
    // Phase 3: Quick fallback extraction for critical fields
    console.log('\n📊 Phase 3: Quick Fallback Extraction');
    for (let attempt = 1; attempt <= this.config.maxFallbackAttempts; attempt++) {
      console.log(`\n🔄 Fallback Attempt ${attempt}/${this.config.maxFallbackAttempts}`);
      
      const attemptResult = await this.attemptExtraction(
        'Fallback',
        async () => {
          const data = await this.fallbackExtractor.quickExtractAll(pdfPath);
          const fieldsExtracted = Object.keys(data).filter(k => data[k] != null).length;
          return {
            success: fieldsExtracted > 0,
            data,
            fieldsExtracted,
            totalFields: 41,
            extractionRate: `${Math.round((fieldsExtracted / 41) * 100)}%`
          };
        },
        attempt
      );

      // SAFETY FIX: Enforce maximum attempts limit
      if (attempts.length >= this.MAX_TOTAL_ATTEMPTS) {
        console.error(`❌ Safety limit reached: ${this.MAX_TOTAL_ATTEMPTS} attempts exceeded`);
        break;
      }

      attempts.push(attemptResult);
      
      if (attemptResult.success && attemptResult.fieldsExtracted) {
        // Even with few fields, accept it if it's our best option
        if (attemptResult.fieldsExtracted > bestFieldCount && attemptResult.fullResult) {
          bestFieldCount = attemptResult.fieldsExtracted;
          // Use the cached result instead of re-extracting
          bestResult = {
            success: true,
            partial: true,
            data: attemptResult.fullResult.data,
            fieldsExtracted: attemptResult.fieldsExtracted,
            totalFields: 41,
            extractionRate: attemptResult.fullResult.extractionRate
          };
        }
      }
      
      if (attempt < this.config.maxFallbackAttempts) {
        await this.delay(this.config.retryDelay / 2); // Shorter delay for fallback
      }
    }
    
    // Phase 4: Return best result we have (even if partial)
    console.log('\n📊 Final Result Summary:');
    console.log(`  Total attempts: ${attempts.length}`);
    console.log(`  Best field count: ${bestFieldCount}`);
    
    if (bestResult && bestFieldCount > 0) {
      console.log(`⚠️  Returning partial extraction with ${bestFieldCount} fields`);
      
      return {
        success: false,  // Mark as failed but with partial data
        isPartial: true,
        data: bestResult.data,
        extractionRate: bestResult.extractionRate,
        fieldsExtracted: bestFieldCount,
        totalFields: 41,
        attempts,
        finalMethod: bestFieldCount > 10 ? 'Partial-Primary' : 'Fallback',
        error: 'Full extraction failed - returning partial data'
      };
    }
    
    // Complete failure - no data extracted
    console.error('❌ Complete extraction failure - no data could be extracted');
    
    return {
      success: false,
      error: 'All extraction attempts failed - no data could be extracted',
      attempts,
      fieldsExtracted: 0,
      totalFields: 41,
      extractionRate: '0%'
    };
  }
  
  /**
   * Attempt a single extraction with timeout and error handling
   */
  private async attemptExtraction(
    method: string,
    extractionFn: () => Promise<any>,
    attemptNumber: number
  ): Promise<ExtractionAttempt> {
    const startTime = Date.now();
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${this.config.timeoutPerAttempt/1000}s`)), 
                   this.config.timeoutPerAttempt);
      });
      
      // Race between extraction and timeout
      const result = await Promise.race([
        extractionFn(),
        timeoutPromise
      ]) as any;
      
      const duration = Date.now() - startTime;
      
      // Check if we got a valid result
      if (result && (result.success || result.data)) {
        const fieldsExtracted = result.fieldsExtracted || 
                               (result.data ? Object.keys(result.data).filter(k => result.data[k] != null).length : 0);
        
        console.log(`  ✅ ${method} succeeded: ${fieldsExtracted} fields in ${(duration/1000).toFixed(1)}s`);
        
        return {
          attemptNumber,
          method,
          success: true,
          fieldsExtracted,
          duration,
          fullResult: result // Store the complete result
        };
      } else {
        console.log(`  ❌ ${method} failed: No data extracted`);
        
        return {
          attemptNumber,
          method,
          success: false,
          error: result?.error || 'No data extracted',
          duration
        };
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      console.log(`  ❌ ${method} error: ${errorMsg}`);
      
      return {
        attemptNumber,
        method,
        success: false,
        error: errorMsg,
        duration
      };
    }
  }
  
  /**
   * Helper to delay between retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get extraction statistics from attempts
   */
  getStatistics(attempts: ExtractionAttempt[]): {
    totalAttempts: number;
    successfulAttempts: number;
    averageDuration: number;
    bestFieldCount: number;
    methodsUsed: string[];
  } {
    const successfulAttempts = attempts.filter(a => a.success);
    const totalDuration = attempts.reduce((sum, a) => sum + a.duration, 0);
    const bestFieldCount = Math.max(...attempts.map(a => a.fieldsExtracted || 0));
    const methodsUsed = [...new Set(attempts.map(a => a.method))];
    
    return {
      totalAttempts: attempts.length,
      successfulAttempts: successfulAttempts.length,
      averageDuration: totalDuration / attempts.length,
      bestFieldCount,
      methodsUsed
    };
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const pdfPath = args[0];
  
  if (!pdfPath) {
    console.log('Usage: ts-node extraction-robust.ts <pdf-path>');
    process.exit(1);
  }
  
  const extractor = new RobustExtractor();
  
  extractor.extractFromPDF(pdfPath)
    .then(result => {
      console.log('\n' + '='.repeat(60));
      console.log('EXTRACTION COMPLETE');
      console.log('='.repeat(60));
      
      if (result.success) {
        console.log('✅ Status: SUCCESS');
      } else if (result.isPartial) {
        console.log('⚠️  Status: PARTIAL SUCCESS');
      } else {
        console.log('❌ Status: FAILED');
      }
      
      console.log(`📊 Fields Extracted: ${result.fieldsExtracted}/${result.totalFields}`);
      console.log(`📈 Extraction Rate: ${result.extractionRate}`);
      console.log(`🔧 Final Method: ${result.finalMethod || 'None'}`);
      console.log(`🔄 Total Attempts: ${result.attempts.length}`);
      
      // Show statistics
      const stats = new RobustExtractor().getStatistics(result.attempts);
      console.log('\n📊 Statistics:');
      console.log(`  Average Duration: ${(stats.averageDuration/1000).toFixed(1)}s`);
      console.log(`  Methods Used: ${stats.methodsUsed.join(', ')}`);
      console.log(`  Success Rate: ${((stats.successfulAttempts/stats.totalAttempts)*100).toFixed(1)}%`);
      
      if (result.data) {
        // Save results
        const outputFile = pdfPath.replace('.pdf', '_robust_result.json');
        fs.writeFile(outputFile, JSON.stringify(result, null, 2))
          .then(() => console.log(`\n💾 Results saved to: ${outputFile}`));
      }
    })
    .catch(console.error);
}