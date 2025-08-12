/**
 * Test GPT-4 Vision API directly with a contract page
 */

import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';

dotenv.config();

async function testVisionAPI() {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    console.log('Testing GPT-4 Vision API...');
    
    // Test with a simple text-only request first
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: "Say 'Vision API is working!' if you can process requests"
      }],
      max_tokens: 50,
      temperature: 0
    });
    
    console.log('API Response:', response.choices[0].message.content);
    
    // Now test with mock contract data
    const mockResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: `Given an Arkansas real estate contract with:
- Buyers: John Smith and Jane Smith
- Property: 3461 Alliance Dr, Little Rock, AR
- Purchase Type: CASH
- Cash Amount: $250,000

Return this as JSON with fields: buyers (array), property_address, purchase_type, cash_amount`
      }],
      max_tokens: 200,
      temperature: 0
    });
    
    console.log('Mock extraction:', mockResponse.choices[0].message.content);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testVisionAPI();