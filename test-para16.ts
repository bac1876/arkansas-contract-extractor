/**
 * Targeted extraction for Paragraph 16
 * Find out what this paragraph contains and which checkbox is selected
 */

const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

async function extractParagraph16() {
  console.log('Paragraph 16 - Checkbox Extraction');
  console.log('===================================\n');

  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  const contractPath = './sample_contract.pdf';

  try {
    // Parse PDF
    const dataBuffer = await fs.readFile(contractPath);
    const pdfData = await pdfParse(dataBuffer);
    console.log(`PDF parsed: ${pdfData.numpages} pages\n`);

    // Method 1: Find Paragraph 16 with various patterns
    console.log('METHOD 1: Pattern matching for Paragraph 16...');
    console.log('-----------------------------------------------');
    
    const patterns = [
      /16\.\s*[A-Z][^]*?(?=17\.|PARAGRAPH 17|$)/gi,
      /16\.[^]*?(?=17\.|$)/gi,
      /PARAGRAPH 16[^]*?(?=PARAGRAPH 17|$)/gi,
      /\b16\b[^]*?(?=\b17\b|$)/gi,
      /16\.\s*INSPECTION[^]*?(?=17\.|$)/gi,  // Often about inspection
      /16\.\s*REPAIRS[^]*?(?=17\.|$)/gi,      // Or repairs
      /16\.\s*RISK[^]*?(?=17\.|$)/gi          // Or risk of loss
    ];

    let para16Text = '';
    for (const pattern of patterns) {
      const matches = pdfData.text.match(pattern);
      if (matches && matches[0].length > 30 && matches[0].length < 3000) {
        para16Text = matches[0];
        console.log(`Found paragraph 16 with pattern: ${pattern}`);
        console.log('\nExtracted text:');
        console.log('---------------');
        console.log(para16Text.substring(0, 800));
        console.log('---------------\n');
        break;
      }
    }

    // Look for checkboxes or options in the found text
    if (para16Text) {
      console.log('Analyzing for checkboxes and options...\n');
      
      // Check for A/B pattern
      const hasOptionA = /\bA\.\s/i.test(para16Text);
      const hasOptionB = /\bB\.\s/i.test(para16Text);
      const hasOptionC = /\bC\.\s/i.test(para16Text);
      
      console.log(`Has Option A: ${hasOptionA}`);
      console.log(`Has Option B: ${hasOptionB}`);
      console.log(`Has Option C: ${hasOptionC}`);
      
      // Check for checkbox patterns
      const checkboxPatterns = [
        /\[\s*[X✓]\s*\]/gi,
        /\(\s*[X✓]\s*\)/gi,
        /☑/gi,
        /☐/gi
      ];
      
      console.log('\nCheckbox patterns found:');
      checkboxPatterns.forEach(pattern => {
        const matches = para16Text.match(pattern);
        if (matches) {
          console.log(`  ${pattern}: ${matches.length} occurrences`);
        }
      });
      
      // Determine which option appears first
      const aPos = para16Text.search(/\bA\.\s/i);
      const bPos = para16Text.search(/\bB\.\s/i);
      const cPos = para16Text.search(/\bC\.\s/i);
      
      let selected = null;
      if (aPos > -1 && (bPos === -1 || aPos < bPos) && (cPos === -1 || aPos < cPos)) {
        selected = 'A';
      } else if (bPos > -1 && (cPos === -1 || bPos < cPos)) {
        selected = 'B';
      } else if (cPos > -1) {
        selected = 'C';
      }
      
      console.log(`\n✓ Pattern matching suggests: Option ${selected || 'NOT FOUND'}\n`);
    }

    // Method 2: Search in specific document range
    console.log('METHOD 2: Searching in document middle section...');
    console.log('--------------------------------------------------');
    
    // Paragraph 16 is usually in the middle of the contract
    const middleSection = pdfData.text.substring(20000, 40000);
    
    // Look for "16." 
    const sixteenMatches = middleSection.match(/16\.[^]*?(?=17\.|$)/gi);
    
    if (sixteenMatches) {
      console.log(`Found ${sixteenMatches.length} potential matches for paragraph 16`);
      
      sixteenMatches.forEach((match, index) => {
        if (match.length > 30 && match.length < 2000) {
          console.log(`\nMatch ${index + 1}:`);
          console.log(match.substring(0, 300));
          console.log('...');
        }
      });
    }

    // Method 3: GPT-4 Analysis
    console.log('\n\nMETHOD 3: GPT-4 Analysis...');
    console.log('-----------------------------');

    const systemPrompt = `You are analyzing an Arkansas real estate contract.
Find Paragraph 16 and determine:
1. What the paragraph is about (topic)
2. Which checkbox or option is selected (A, B, C, or other)
3. The exact text of the paragraph`;

    const userPrompt = `Find Paragraph 16 in this contract and tell me:
1. What is the topic of Paragraph 16?
2. Which option or checkbox is selected?
3. Quote the relevant text

CONTRACT TEXT:
${pdfData.text.substring(15000, 35000)}

Return JSON:
{
  "topic": "what paragraph 16 is about",
  "selected_option": "A" or "B" or null,
  "text": "first 200 characters of paragraph 16",
  "confidence": 0-100
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const gptResult = JSON.parse(response.choices[0].message.content || '{}');
    
    console.log('GPT-4 Analysis:');
    console.log(`Topic: ${gptResult.topic || 'NOT FOUND'}`);
    console.log(`Selected Option: ${gptResult.selected_option || 'NOT FOUND'}`);
    console.log(`Confidence: ${gptResult.confidence}%`);
    if (gptResult.text) {
      console.log(`\nText excerpt: "${gptResult.text}"`);
    }

    // Method 4: Context search - what comes before and after
    console.log('\n\nMETHOD 4: Context analysis...');
    console.log('-------------------------------');
    
    // Find what's around paragraph 16
    const beforePattern = /15\.[^]*?$/gi;
    const afterPattern = /^[^]*?17\./gi;
    
    const beforeMatch = pdfData.text.match(beforePattern);
    const afterMatch = pdfData.text.match(afterPattern);
    
    if (beforeMatch) {
      const lastLine = beforeMatch[0].split('\n').pop();
      console.log(`Before Para 16: ...${lastLine}`);
    }
    
    if (afterMatch) {
      const firstLine = afterMatch[0].split('\n')[0];
      console.log(`After Para 16: ${firstLine}...`);
    }

    // Method 5: Direct keyword search for common Para 16 topics
    console.log('\n\nMETHOD 5: Topic-based search...');
    console.log('---------------------------------');
    
    const commonTopics = [
      'risk of loss',
      'inspection',
      'repairs',
      'property condition',
      'as-is',
      'damage',
      'casualty'
    ];

    for (const topic of commonTopics) {
      const topicPattern = new RegExp(`16\\.[^]*?${topic}`, 'gi');
      const topicMatch = pdfData.text.match(topicPattern);
      
      if (topicMatch) {
        console.log(`✓ Found Paragraph 16 related to: ${topic.toUpperCase()}`);
        console.log(`   Text: "${topicMatch[0].substring(0, 100)}..."`);
        break;
      }
    }

    // Final determination
    console.log('\n\n════════════════════════════════════════');
    console.log('         FINAL DETERMINATION            ');
    console.log('════════════════════════════════════════\n');
    
    if (gptResult.selected_option) {
      console.log(`PARAGRAPH 16 CHECKBOX: ${gptResult.selected_option}`);
      console.log(`TOPIC: ${gptResult.topic || 'Unknown'}`);
    } else if (para16Text) {
      console.log('PARAGRAPH 16 FOUND but no clear checkbox selection identified');
      console.log('The paragraph may not have checkbox options in this contract');
    } else {
      console.log('PARAGRAPH 16: Unable to locate or extract');
    }

    // Save results
    const results = {
      paragraph_16: {
        topic: gptResult.topic || 'Unknown',
        selected_option: gptResult.selected_option || null,
        text: para16Text.substring(0, 500) || gptResult.text || 'Not found',
        confidence: gptResult.confidence || 0
      }
    };

    await fs.writeFile('./para16_extraction.json', JSON.stringify(results, null, 2));
    console.log('\n✓ Results saved to para16_extraction.json');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Error:', errorMessage);
  }
}

// Run the test
console.log('Starting Paragraph 16 extraction...\n');
extractParagraph16().catch(console.error);