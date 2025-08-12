/**
 * Targeted extraction for Paragraph 18
 * Find what this paragraph contains and which checkbox is selected
 */

const pdfParse = require('pdf-parse');
import * as fs from 'fs/promises';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

async function extractParagraph18() {
  console.log('Paragraph 18 - Checkbox Extraction');
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

    // Method 1: Pattern matching for Paragraph 18
    console.log('METHOD 1: Pattern matching for Paragraph 18...');
    console.log('-----------------------------------------------');
    
    const patterns = [
      /18\.\s*[A-Z][^]*?(?=19\.|PARAGRAPH 19|$)/gi,
      /18\.[^]*?(?=19\.|$)/gi,
      /PARAGRAPH 18[^]*?(?=PARAGRAPH 19|$)/gi,
      /\b18\b[^]*?(?=\b19\b|$)/gi,
      /18\.\s*MINERAL[^]*?(?=19\.|$)/gi,  // Often about mineral rights
      /18\.\s*OIL[^]*?(?=19\.|$)/gi,      // Or oil/gas rights
      /18\.\s*RIGHTS[^]*?(?=19\.|$)/gi    // Or surface rights
    ];

    let para18Text = '';
    for (const pattern of patterns) {
      const matches = pdfData.text.match(pattern);
      if (matches && matches[0].length > 30 && matches[0].length < 3000) {
        para18Text = matches[0];
        console.log(`Found paragraph 18 with pattern: ${pattern}`);
        console.log('\nExtracted text:');
        console.log('---------------');
        console.log(para18Text.substring(0, 800));
        console.log('---------------\n');
        break;
      }
    }

    // Look for checkboxes or options
    if (para18Text) {
      console.log('Analyzing for checkboxes and options...\n');
      
      // Check for A/B/C pattern
      const hasOptionA = /\bA\.\s/i.test(para18Text);
      const hasOptionB = /\bB\.\s/i.test(para18Text);
      const hasOptionC = /\bC\.\s/i.test(para18Text);
      const hasOptionD = /\bD\.\s/i.test(para18Text);
      
      console.log(`Has Option A: ${hasOptionA}`);
      console.log(`Has Option B: ${hasOptionB}`);
      console.log(`Has Option C: ${hasOptionC}`);
      console.log(`Has Option D: ${hasOptionD}`);
      
      // Determine which option appears first
      const aPos = para18Text.search(/\bA\.\s/i);
      const bPos = para18Text.search(/\bB\.\s/i);
      const cPos = para18Text.search(/\bC\.\s/i);
      const dPos = para18Text.search(/\bD\.\s/i);
      
      let selected = null;
      const positions = [
        { option: 'A', pos: aPos },
        { option: 'B', pos: bPos },
        { option: 'C', pos: cPos },
        { option: 'D', pos: dPos }
      ].filter(p => p.pos > -1).sort((a, b) => a.pos - b.pos);
      
      if (positions.length > 0) {
        selected = positions[0].option;
      }
      
      console.log(`\n✓ Pattern matching suggests: Option ${selected || 'NOT FOUND'}\n`);
    }

    // Method 2: Search in document range where Para 18 typically appears
    console.log('METHOD 2: Searching in document...');
    console.log('-----------------------------------');
    
    // Paragraph 18 is usually after the middle of the contract
    const searchSection = pdfData.text.substring(25000, 45000);
    
    const eighteenMatches = searchSection.match(/18\.[^]*?(?=19\.|$)/gi);
    
    if (eighteenMatches) {
      console.log(`Found ${eighteenMatches.length} potential matches for paragraph 18`);
      
      eighteenMatches.forEach((match, index) => {
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
Find Paragraph 18 and determine:
1. What the paragraph is about (topic)
2. Which checkbox or option is selected (A, B, C, D, or other)
3. The exact text of the paragraph`;

    const userPrompt = `Find Paragraph 18 in this contract and tell me:
1. What is the topic of Paragraph 18?
2. Which option or checkbox is selected?
3. Quote the relevant text

CONTRACT TEXT:
${pdfData.text.substring(20000, 40000)}

Return JSON:
{
  "topic": "what paragraph 18 is about",
  "selected_option": "A" or "B" or "C" or null,
  "text": "first 200 characters of paragraph 18",
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

    // Method 4: Topic-based search for common Para 18 topics
    console.log('\n\nMETHOD 4: Topic-based search...');
    console.log('---------------------------------');
    
    const commonTopics = [
      'mineral',
      'oil',
      'gas',
      'surface rights',
      'subsurface',
      'royalty',
      'extraction'
    ];

    for (const topic of commonTopics) {
      const topicPattern = new RegExp(`18\\.[^]*?${topic}`, 'gi');
      const topicMatch = pdfData.text.match(topicPattern);
      
      if (topicMatch) {
        console.log(`✓ Found Paragraph 18 related to: ${topic.toUpperCase()}`);
        console.log(`   Text: "${topicMatch[0].substring(0, 100)}..."`);
        break;
      }
    }

    // Final determination
    console.log('\n\n════════════════════════════════════════');
    console.log('         FINAL DETERMINATION            ');
    console.log('════════════════════════════════════════\n');
    
    let finalResult = null;
    
    if (gptResult.selected_option) {
      finalResult = gptResult.selected_option;
      console.log(`PARAGRAPH 18 CHECKBOX: ${gptResult.selected_option}`);
      console.log(`TOPIC: ${gptResult.topic || 'Unknown'}`);
    } else if (para18Text) {
      console.log('PARAGRAPH 18 FOUND but no clear checkbox selection identified');
      console.log('The paragraph may not have checkbox options in this contract');
    } else {
      console.log('PARAGRAPH 18: Unable to locate or extract');
      console.log('This paragraph may not be filled in the contract');
    }

    // Save results
    const results = {
      paragraph_18: {
        topic: gptResult.topic || 'Unknown',
        selected_option: finalResult,
        text: para18Text.substring(0, 500) || gptResult.text || 'Not found',
        confidence: gptResult.confidence || 0
      }
    };

    await fs.writeFile('./para18_extraction.json', JSON.stringify(results, null, 2));
    console.log('\n✓ Results saved to para18_extraction.json');

    return finalResult;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Error:', errorMessage);
  }
}

// Run the test
console.log('Starting Paragraph 18 extraction...\n');
extractParagraph18().catch(console.error);