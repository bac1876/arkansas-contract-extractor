/**
 * Extract Agency information from Page 3 using Vision API
 */

import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';

dotenv.config();

async function extractPage3Agency() {
  console.log('Page 3 - Agency Extraction (Paragraph 4)');
  console.log('=========================================\n');

  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  try {
    const imageBuffer = await fs.readFile('./pages/page3.png');
    const base64Image = imageBuffer.toString('base64');

    console.log('Sending to GPT-4 Vision API...\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this Arkansas real estate contract page and extract the AGENCY information (Paragraph 4).

Look for "4. AGENCY: (check all that apply)" and identify which options are checked.

The options are typically:
A. LISTING FIRM AND SELLING FIRM REPRESENT SELLER
B. LISTING FIRM REPRESENTS SELLER AND SELLING FIRM REPRESENTS BUYER  
C. LISTING FIRM AND SELLING FIRM REPRESENT BUYER
D. Other arrangements

Also look for:
- Listing Firm name
- Listing Agent name
- Selling Firm name
- Selling Agent name

These are usually at the bottom of the agency section.

Return a JSON object:
{
  "agency_options_checked": ["A", "B", "C", "D"] (array of checked options),
  "agency_type": "description of agency relationship",
  "listing_firm": "firm name or null",
  "listing_agent": "agent name or null",
  "selling_firm": "firm name or null",
  "selling_agent": "agent name or null",
  "paragraph_4_found": boolean
}

Look for [X], X, or filled checkboxes to determine selections.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.1
    });

    const visionResult = response.choices[0].message.content;
    console.log('Raw Response:');
    console.log(visionResult);
    console.log('\n');

    // Parse response
    const cleanJson = visionResult?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '{}';
    const extracted = JSON.parse(cleanJson);
    
    console.log('=== EXTRACTED AGENCY DATA ===\n');
    
    if (extracted.paragraph_4_found) {
      console.log('✓ Paragraph 4 (Agency) found\n');
      
      if (extracted.agency_options_checked && extracted.agency_options_checked.length > 0) {
        console.log('Options Checked:');
        extracted.agency_options_checked.forEach((option: string) => {
          console.log(`  ☑ Option ${option}`);
        });
        console.log('');
      } else {
        console.log('No agency options checked\n');
      }
      
      console.log('Agency Type:', extracted.agency_type || 'Not specified');
      console.log('');
      
      console.log('Firms and Agents:');
      console.log('  Listing Firm:', extracted.listing_firm || 'NOT FOUND');
      console.log('  Listing Agent:', extracted.listing_agent || 'NOT FOUND');
      console.log('  Selling Firm:', extracted.selling_firm || 'NOT FOUND');
      console.log('  Selling Agent:', extracted.selling_agent || 'NOT FOUND');
    } else {
      console.log('⚠️  Paragraph 4 (Agency) not found on this page');
    }
    
    // Save results
    await fs.writeFile('./pages/page3_agency_results.json', JSON.stringify(extracted, null, 2));
    console.log('\n✓ Results saved to ./pages/page3_agency_results.json');
    
    return extracted;
    
  } catch (error) {
    console.error('Error:', error);
  }
}

extractPage3Agency().catch(console.error);