require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');

async function testNewImageExtraction() {
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
  });

  console.log('🔍 Testing GPT-4o with newly converted image...\n');
  
  // Read the newly converted image
  const imageBuffer = fs.readFileSync('test_new_conversion.png');
  const base64Image = imageBuffer.toString('base64');
  console.log('📏 New image size:', imageBuffer.length, 'bytes\n');
  
  // Use the same prompt as the extraction
  const prompt = `Extract ALL information from this Arkansas contract page 1:

1. PARAGRAPH 1 - PARTIES:
   - All buyer names (full names)
   - All seller names if visible
   - Property address (complete)

2. PARAGRAPH 2 - PROPERTY TYPE:
   - Which checkbox is marked? (Single family detached, One-to-four attached, Manufactured/Mobile, Condo/Town, Builder Owned)

3. PARAGRAPH 3 - PURCHASE DETAILS:
   CRITICAL: Check which section is marked:
   - 3A: "PURCHASE PURSUANT TO NEW FINANCING" (has purchase price and loan type)
   - 3B: "PURCHASE PURSUANT TO LOAN ASSUMPTION"
   - 3C: "PURCHASE PURSUANT TO CASH" (has cash amount, no loan)
   
   If 3A is checked, extract:
   - Purchase price amount (number after $ sign)
   - Loan type (CONVENTIONAL/VA/FHA/USDA-RD/OTHER)
   
   If 3C is checked, extract:
   - Cash amount (number after "exact sum of $")
   - Note: loan_type should be "CASH" or null

Return JSON:
{
  "buyers": ["name1", "name2"],
  "sellers": ["names"] or [],
  "property_address": "full address",
  "property_type": "exact type selected",
  "purchase_type": "FINANCED" or "CASH" or "LOAN_ASSUMPTION",
  "para3_option_checked": "3A" or "3B" or "3C",
  "purchase_price": number (if 3A),
  "cash_amount": number (if 3C),
  "loan_type": "FHA/VA/CONVENTIONAL/USDA-RD/OTHER/CASH" or null
}`;

  try {
    console.log('Sending request to GPT-4o...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { 
            type: 'image_url', 
            image_url: { 
              url: `data:image/png;base64,${base64Image}`,
              detail: 'high'
            }
          }
        ]
      }],
      max_tokens: 600,
      temperature: 0.1
    });
    
    const content = response.choices[0].message.content || '';
    console.log('\n📝 Raw Response:\n', content);
    
    // Parse and check the result
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanContent);
      
      console.log('\n📊 Extracted Data:');
      console.log('  Buyers:', parsed.buyers);
      console.log('  Property:', parsed.property_address);
      console.log('  Type:', parsed.purchase_type);
      console.log('  Cash Amount:', parsed.cash_amount);
      
      if (parsed.buyers && parsed.buyers[0].includes('Brian')) {
        console.log('\n✅ SUCCESS! Extracted real data (Brian Curtis)!');
        console.log('The new ImageMagick parameters work correctly!');
      } else if (parsed.buyers && parsed.buyers[0].includes('John')) {
        console.log('\n⚠️ WARNING: Still returning demo data (John Doe)');
        console.log('The conversion parameters need more adjustment.');
      } else {
        console.log('\n❓ Unexpected response - check the data above');
      }
    } catch (e) {
      console.log('\n❌ Could not parse JSON response');
    }
    
  } catch (err) {
    console.log('Error:', err.message);
  }
}

testNewImageExtraction().catch(console.error);