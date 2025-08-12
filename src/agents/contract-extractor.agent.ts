/**
 * Arkansas Real Estate Contract Extractor Agent
 * Uses SmythOS SDK to create an intelligent agent for contract data extraction
 */

import { Agent, Skill } from '@smythos/sdk';
import { ArkansasRealEstateContract } from '../schemas/arkansas-contract.schema';
import * as pdfParse from 'pdf-parse';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ContractExtractorAgent {
  private agent: Agent;

  constructor() {
    this.agent = new Agent({
      name: 'ArkansasContractExtractor',
      model: 'gpt-4o',
      behavior: `You are an expert at extracting information from Arkansas real estate contracts.
        You understand legal terminology, real estate concepts, and Arkansas-specific requirements.
        You extract data accurately and identify any missing or unclear information.
        You validate extracted data against Arkansas real estate regulations.`,
      temperature: 0.1, // Low temperature for accuracy
      maxTokens: 4000
    });

    this.setupSkills();
  }

  private setupSkills() {
    // Skill: Extract contract data from text
    this.agent.addSkill({
      name: 'extractContractData',
      description: 'Extract structured data from contract text',
      parameters: {
        contractText: { 
          type: 'string', 
          description: 'Full text of the contract',
          required: true 
        },
        documentType: {
          type: 'string',
          description: 'Type of document (purchase agreement, addendum, etc.)',
          required: false
        }
      },
      process: async ({ contractText, documentType }) => {
        const prompt = `
          Extract all relevant information from this Arkansas real estate contract.
          Return the data in a structured JSON format matching our schema.
          
          Document Type: ${documentType || 'Purchase Agreement'}
          
          Contract Text:
          ${contractText}
          
          Extract the following information:
          1. All parties (buyers, sellers, agents, brokers)
          2. Property details (address, legal description, type)
          3. Financial terms (price, earnest money, financing)
          4. Important dates (contract, closing, possession)
          5. Contingencies (inspection, financing, appraisal)
          6. Included/excluded items
          7. Special stipulations
          
          If any information is unclear or missing, note it in the response.
          Validate that earnest money and dates comply with Arkansas requirements.
        `;

        const extraction = await this.agent.prompt(prompt);
        return this.parseAndValidateExtraction(extraction);
      }
    });

    // Skill: Parse PDF documents
    this.agent.addSkill({
      name: 'parsePDF',
      description: 'Extract text from PDF contracts',
      parameters: {
        filePath: { 
          type: 'string', 
          description: 'Path to PDF file',
          required: true 
        }
      },
      process: async ({ filePath }) => {
        try {
          const dataBuffer = await fs.readFile(filePath);
          const pdfData = await pdfParse(dataBuffer);
          
          return {
            text: pdfData.text,
            pages: pdfData.numpages,
            info: pdfData.info,
            metadata: pdfData.metadata
          };
        } catch (error) {
          throw new Error(`Failed to parse PDF: ${error.message}`);
        }
      }
    });

    // Skill: Validate Arkansas-specific requirements
    this.agent.addSkill({
      name: 'validateArkansasRequirements',
      description: 'Validate contract against Arkansas real estate laws',
      parameters: {
        contractData: {
          type: 'object',
          description: 'Extracted contract data',
          required: true
        }
      },
      process: async ({ contractData }) => {
        const validationPrompt = `
          Validate this Arkansas real estate contract data against state requirements:
          
          ${JSON.stringify(contractData, null, 2)}
          
          Check for:
          1. Required disclosures (property condition, lead paint if applicable)
          2. Earnest money requirements (must be held in trust)
          3. Reasonable inspection period (typically 10 days)
          4. Valid closing timeline (15-90 days typical)
          5. Required signatures from all parties
          6. Proper agent/broker licensing information
          
          Return validation results with any issues or warnings.
        `;

        const validation = await this.agent.prompt(validationPrompt);
        return JSON.parse(validation);
      }
    });

    // Skill: Extract key dates and deadlines
    this.agent.addSkill({
      name: 'extractDatesAndDeadlines',
      description: 'Extract and calculate all important dates',
      parameters: {
        contractText: {
          type: 'string',
          description: 'Contract text',
          required: true
        }
      },
      process: async ({ contractText }) => {
        const datePrompt = `
          Extract all dates and deadlines from this contract:
          ${contractText}
          
          Identify:
          1. Contract execution date
          2. Closing date
          3. Possession date
          4. Inspection deadline
          5. Financing contingency deadline
          6. Appraisal deadline
          7. Any other important dates
          
          Calculate the number of days between key dates.
          Flag any dates that seem unreasonable or conflicting.
        `;

        const dates = await this.agent.prompt(datePrompt);
        return JSON.parse(dates);
      }
    });

    // Skill: Identify missing information
    this.agent.addSkill({
      name: 'identifyMissingInfo',
      description: 'Identify missing or incomplete information',
      parameters: {
        contractData: {
          type: 'object',
          description: 'Partially extracted contract data',
          required: true
        }
      },
      process: async ({ contractData }) => {
        const missingPrompt = `
          Review this extracted contract data and identify missing critical information:
          ${JSON.stringify(contractData, null, 2)}
          
          Check for missing:
          1. Party information (names, signatures, contact info)
          2. Property details (address, legal description)
          3. Financial terms (price, earnest money, financing details)
          4. Important dates
          5. Required contingencies
          6. Arkansas-required disclosures
          
          Return a list of missing fields with their importance level (critical, important, optional).
        `;

        const missing = await this.agent.prompt(missingPrompt);
        return JSON.parse(missing);
      }
    });

    // Skill: Generate summary report
    this.agent.addSkill({
      name: 'generateSummary',
      description: 'Generate a human-readable summary of the contract',
      parameters: {
        contractData: {
          type: 'object',
          description: 'Complete contract data',
          required: true
        }
      },
      process: async ({ contractData }) => {
        const summaryPrompt = `
          Generate a clear, concise summary of this Arkansas real estate contract:
          ${JSON.stringify(contractData, null, 2)}
          
          Include:
          1. Transaction overview (parties, property, price)
          2. Key dates and deadlines
          3. Contingencies and conditions
          4. Special terms or stipulations
          5. Any warnings or concerns
          
          Format the summary for easy reading by real estate professionals.
        `;

        const summary = await this.agent.prompt(summaryPrompt);
        return summary;
      }
    });
  }

  private async parseAndValidateExtraction(extraction: string): Promise<Partial<ArkansasRealEstateContract>> {
    try {
      // Parse the AI response
      const parsed = JSON.parse(extraction);
      
      // Add metadata
      parsed.metadata = {
        extractionDate: new Date().toISOString(),
        extractionConfidence: this.calculateConfidence(parsed),
        extractedFields: Object.keys(parsed).filter(key => parsed[key] !== null),
        missingFields: this.identifyMissingFields(parsed)
      };

      return parsed;
    } catch (error) {
      throw new Error(`Failed to parse extraction: ${error.message}`);
    }
  }

  private calculateConfidence(data: any): number {
    // Calculate confidence based on completeness
    const requiredFields = [
      'parties.buyers', 'parties.sellers', 
      'property.address', 'financial.purchasePrice',
      'dates.contractDate', 'dates.closingDate'
    ];

    let filledFields = 0;
    requiredFields.forEach(field => {
      if (this.getNestedProperty(data, field)) {
        filledFields++;
      }
    });

    return (filledFields / requiredFields.length) * 100;
  }

  private identifyMissingFields(data: any): string[] {
    const missing: string[] = [];
    const requiredFields = [
      'parties.buyers',
      'parties.sellers',
      'property.address',
      'property.legalDescription',
      'financial.purchasePrice',
      'financial.earnestMoney.amount',
      'dates.contractDate',
      'dates.closingDate'
    ];

    requiredFields.forEach(field => {
      if (!this.getNestedProperty(data, field)) {
        missing.push(field);
      }
    });

    return missing;
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  // Public method to process a contract
  async processContract(filePath: string): Promise<ArkansasRealEstateContract> {
    // Parse PDF
    const pdfData = await this.agent.execute('parsePDF', { filePath });
    
    // Extract contract data
    const contractData = await this.agent.execute('extractContractData', {
      contractText: pdfData.text,
      documentType: 'Purchase Agreement'
    });

    // Validate Arkansas requirements
    const validation = await this.agent.execute('validateArkansasRequirements', {
      contractData
    });

    // Identify missing information
    const missingInfo = await this.agent.execute('identifyMissingInfo', {
      contractData
    });

    // Generate summary
    const summary = await this.agent.execute('generateSummary', {
      contractData
    });

    return {
      ...contractData,
      validation,
      missingInfo,
      summary
    } as ArkansasRealEstateContract;
  }

  // Export the agent for deployment
  getAgent(): Agent {
    return this.agent;
  }
}