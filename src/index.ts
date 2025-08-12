/**
 * Arkansas Real Estate Contract Agent - Main Entry Point
 * Orchestrates the contract extraction and processing workflow
 */

import { SmythOSRuntime, Workflow, Integration } from '@smythos/sdk';
import { ContractExtractorAgent } from './agents/contract-extractor.agent';
import { ArkansasRealEstateContract } from './schemas/arkansas-contract.schema';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ArkansasContractProcessor {
  private runtime: SmythOSRuntime;
  private extractorAgent: ContractExtractorAgent;
  private workflow: Workflow;

  constructor() {
    this.runtime = new SmythOSRuntime({
      name: 'Arkansas Contract Processing System',
      debug: process.env.NODE_ENV === 'development'
    });

    this.extractorAgent = new ContractExtractorAgent();
    this.setupWorkflow();
  }

  private setupWorkflow() {
    this.workflow = new Workflow({
      name: 'Contract Processing Pipeline',
      description: 'Complete pipeline for processing Arkansas real estate contracts'
    });

    // Step 1: Document intake
    this.workflow.addStep({
      name: 'documentIntake',
      type: 'input',
      description: 'Receive contract document',
      validation: {
        fileTypes: ['.pdf', '.docx', '.doc', '.txt'],
        maxSize: '10MB'
      }
    });

    // Step 2: Text extraction
    this.workflow.addStep({
      name: 'textExtraction',
      type: 'process',
      agent: this.extractorAgent.getAgent(),
      skill: 'parsePDF'
    });

    // Step 3: Data extraction
    this.workflow.addStep({
      name: 'dataExtraction',
      type: 'process',
      agent: this.extractorAgent.getAgent(),
      skill: 'extractContractData'
    });

    // Step 4: Validation
    this.workflow.addStep({
      name: 'validation',
      type: 'process',
      agent: this.extractorAgent.getAgent(),
      skill: 'validateArkansasRequirements'
    });

    // Step 5: Export results
    this.workflow.addStep({
      name: 'export',
      type: 'output',
      formats: ['json', 'csv', 'pdf-summary']
    });
  }

  // Process a single contract
  async processContract(filePath: string): Promise<{
    success: boolean;
    data?: ArkansasRealEstateContract;
    error?: string;
  }> {
    try {
      console.log(`Processing contract: ${filePath}`);
      
      // Validate file exists
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      if (!fileExists) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Process through agent
      const result = await this.extractorAgent.processContract(filePath);

      // Save results
      await this.saveResults(result, filePath);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error(`Error processing contract: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Process multiple contracts
  async processBatch(folderPath: string): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{
      file: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const files = await fs.readdir(folderPath);
    const pdfFiles = files.filter(f => f.endsWith('.pdf'));
    
    const results = [];
    let successful = 0;
    let failed = 0;

    for (const file of pdfFiles) {
      const filePath = path.join(folderPath, file);
      const result = await this.processContract(filePath);
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      results.push({
        file,
        success: result.success,
        error: result.error
      });
    }

    return {
      total: pdfFiles.length,
      successful,
      failed,
      results
    };
  }

  // Save extraction results
  private async saveResults(data: ArkansasRealEstateContract, originalPath: string) {
    const baseName = path.basename(originalPath, path.extname(originalPath));
    const outputDir = path.join(path.dirname(originalPath), 'extracted');
    
    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    // Save JSON
    const jsonPath = path.join(outputDir, `${baseName}_extracted.json`);
    await fs.writeFile(jsonPath, JSON.stringify(data, null, 2));

    // Save CSV (simplified)
    const csvPath = path.join(outputDir, `${baseName}_extracted.csv`);
    await fs.writeFile(csvPath, this.convertToCSV(data));

    // Save summary
    const summaryPath = path.join(outputDir, `${baseName}_summary.txt`);
    await fs.writeFile(summaryPath, data.summary || 'No summary available');

    console.log(`Results saved to: ${outputDir}`);
  }

  // Convert to CSV format
  private convertToCSV(data: ArkansasRealEstateContract): string {
    const rows = [
      ['Field', 'Value'],
      ['Buyer(s)', data.parties?.buyers?.map(b => b.name).join('; ') || ''],
      ['Seller(s)', data.parties?.sellers?.map(s => s.name).join('; ') || ''],
      ['Property Address', data.property?.address?.streetAddress || ''],
      ['Purchase Price', data.financial?.purchasePrice?.toString() || ''],
      ['Earnest Money', data.financial?.earnestMoney?.amount?.toString() || ''],
      ['Closing Date', data.dates?.closingDate || ''],
      ['Financing Type', data.financial?.financing?.type || ''],
      ['Inspection Deadline', data.dates?.inspectionDeadline || ''],
      ['Contingencies', Object.keys(data.contingencies || {}).filter(c => data.contingencies[c]?.required).join('; ')]
    ];

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  // Deploy the agent to SmythOS
  async deploy() {
    console.log('Deploying Arkansas Contract Agent to SmythOS...');
    
    await this.runtime.deploy({
      agent: this.extractorAgent.getAgent(),
      workflow: this.workflow,
      config: {
        name: 'Arkansas Contract Extractor',
        description: 'Extracts and validates data from Arkansas real estate contracts',
        version: '1.0.0',
        endpoint: '/api/contracts/extract',
        authentication: true,
        rateLimit: {
          requests: 100,
          period: '1h'
        }
      }
    });

    console.log('Deployment complete!');
  }

  // Start local development server
  async startDevServer(port: number = 3000) {
    console.log(`Starting development server on port ${port}...`);
    
    await this.runtime.startLocal({
      port,
      agents: [this.extractorAgent.getAgent()],
      workflow: this.workflow,
      ui: true // Enable SmythOS UI for testing
    });

    console.log(`Server running at http://localhost:${port}`);
    console.log(`SmythOS UI available at http://localhost:${port}/studio`);
  }
}

// CLI interface
if (require.main === module) {
  const processor = new ArkansasContractProcessor();
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'process':
      if (!arg) {
        console.error('Please provide a file path');
        process.exit(1);
      }
      processor.processContract(arg).then(result => {
        if (result.success) {
          console.log('Contract processed successfully!');
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          console.error('Processing failed:', result.error);
        }
      });
      break;

    case 'batch':
      if (!arg) {
        console.error('Please provide a folder path');
        process.exit(1);
      }
      processor.processBatch(arg).then(result => {
        console.log(`Processed ${result.total} contracts`);
        console.log(`Successful: ${result.successful}`);
        console.log(`Failed: ${result.failed}`);
      });
      break;

    case 'deploy':
      processor.deploy().catch(console.error);
      break;

    case 'dev':
      const port = arg ? parseInt(arg) : 3000;
      processor.startDevServer(port).catch(console.error);
      break;

    default:
      console.log(`
Arkansas Contract Agent CLI

Commands:
  process <file>    Process a single contract PDF
  batch <folder>    Process all PDFs in a folder
  deploy           Deploy agent to SmythOS Cloud
  dev [port]       Start development server (default: 3000)

Examples:
  npm run dev
  ts-node src/index.ts process ./contracts/sample.pdf
  ts-node src/index.ts batch ./contracts/
  ts-node src/index.ts deploy
      `);
  }
}

export { ContractExtractorAgent, ArkansasRealEstateContract };