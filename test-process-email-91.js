require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;

// Load TypeScript support
require('ts-node/register');

async function testProcessEmail() {
  console.log('Testing email processor with UID 91...\n');
  
  try {
    // Import the processor
    const { OfferSheetProcessor } = require('./offer-sheet-app/offer-sheet-processor.ts');
    
    // Create an instance
    const processor = new OfferSheetProcessor();
    
    console.log('Starting processor...');
    await processor.start();
    
    // Give it a moment to connect and check
    console.log('Waiting for email check...');
    
    // The processor should automatically check on start
    // and then every 5 minutes
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testProcessEmail();