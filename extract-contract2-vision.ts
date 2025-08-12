/**
 * Extract contract2 data using Vision API on all pages
 */

import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function extractContract2() {
  console.log('Contract 2 - Complete Vision Extraction');
  console.log('='.repeat(50) + '\n');
  
  const results: any = {};
  
  // Page 1 - Basic info
  console.log('📄 Processing Page 1...');
  const img1 = await fs.readFile('./contract2_pages/page1.png');
  const resp1 = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: `Extract: property type (Para 2), purchase type (3A/3C), price, loan type, address, buyers. Return JSON with all fields.` },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img1.toString('base64')}`, detail: "high" } }
      ]
    }],
    max_tokens: 500
  });
  Object.assign(results, JSON.parse(resp1.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
  
  // Page 3 - Agency
  console.log('📄 Processing Page 3...');
  const img3 = await fs.readFile('./contract2_pages/page3.png');
  const resp3 = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: `Extract Para 4 Agency option (A/B/C/D). Return: {"agency": "letter"}` },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img3.toString('base64')}`, detail: "high" } }
      ]
    }],
    max_tokens: 100
  });
  Object.assign(results, JSON.parse(resp3.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
  
  // Page 4 - Financial
  console.log('📄 Processing Page 4...');
  const img4 = await fs.readFile('./contract2_pages/page4.png');
  const resp4 = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: `Extract Para 5 amounts/text, Para 7 earnest money (YES/NO), Para 8 non-refundable (YES/NO). Return JSON.` },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img4.toString('base64')}`, detail: "high" } }
      ]
    }],
    max_tokens: 300
  });
  Object.assign(results, JSON.parse(resp4.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
  
  // Page 5 - Title
  console.log('📄 Processing Page 5...');
  const img5 = await fs.readFile('./contract2_pages/page5.png');
  const resp5 = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: `Extract Para 10 Title option (A/B/C). Return: {"title": "letter"}` },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img5.toString('base64')}`, detail: "high" } }
      ]
    }],
    max_tokens: 100
  });
  Object.assign(results, JSON.parse(resp5.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
  
  // Page 6 - Survey
  console.log('📄 Processing Page 6...');
  const img6 = await fs.readFile('./contract2_pages/page6.png');
  const resp6 = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: `Extract Para 11 Survey (who pays). Return: {"survey": "answer"}` },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img6.toString('base64')}`, detail: "high" } }
      ]
    }],
    max_tokens: 100
  });
  Object.assign(results, JSON.parse(resp6.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
  
  // Page 8 - Warranty/Inspection
  console.log('📄 Processing Page 8...');
  const img8 = await fs.readFile('./contract2_pages/page8.png');
  const resp8 = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: `Extract Para 15 Warranty (YES/NO), Para 16 Inspection (A/B/C/D). Return JSON.` },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img8.toString('base64')}`, detail: "high" } }
      ]
    }],
    max_tokens: 100
  });
  Object.assign(results, JSON.parse(resp8.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
  
  // Page 10 - Termite
  console.log('📄 Processing Page 10...');
  const img10 = await fs.readFile('./contract2_pages/page10.png');
  const resp10 = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: `Extract Para 19 Termite (A/B/C). Return: {"termite": "letter"}` },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img10.toString('base64')}`, detail: "high" } }
      ]
    }],
    max_tokens: 100
  });
  Object.assign(results, JSON.parse(resp10.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
  
  // Page 11 - Lead
  console.log('📄 Processing Page 11...');
  const img11 = await fs.readFile('./contract2_pages/page11.png');
  const resp11 = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: `Extract Para 20 Lead Paint (A/B/C/D). Return: {"lead": "letter"}` },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img11.toString('base64')}`, detail: "high" } }
      ]
    }],
    max_tokens: 100
  });
  Object.assign(results, JSON.parse(resp11.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
  
  // Page 13 - Possession
  console.log('📄 Processing Page 13...');
  const img13 = await fs.readFile('./contract2_pages/page13.png');
  const resp13 = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: `Extract Para 23 Possession (A/B/C). Return: {"possession": "letter"}` },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img13.toString('base64')}`, detail: "high" } }
      ]
    }],
    max_tokens: 100
  });
  Object.assign(results, JSON.parse(resp13.choices[0].message.content?.replace(/```json\n?/g, '').replace(/```/g, '').trim() || '{}'));
  
  console.log('\n' + '='.repeat(50));
  console.log('EXTRACTION COMPLETE\n');
  
  // Display results
  console.log('Buyers:', results.buyers || 'Not found');
  console.log('Property:', results.property_address || results.address || 'Not found');
  console.log('Purchase Type:', results.purchase_type || 'Not found');
  console.log('Price:', results.purchase_price || results.cash_amount || 'Not found');
  console.log('Loan Type:', results.loan_type || 'Not found');
  console.log('Agency:', results.agency || 'Not found');
  console.log('Title:', results.title || 'Not found');
  console.log('Survey:', results.survey || 'Not found');
  console.log('Warranty:', results.warranty || 'Not found');
  console.log('Inspection:', results.inspection || 'Not found');
  console.log('Termite:', results.termite || 'Not found');
  console.log('Lead Paint:', results.lead || 'Not found');
  console.log('Possession:', results.possession || 'Not found');
  
  // Save JSON
  await fs.writeFile('./contract2_vision_results.json', JSON.stringify(results, null, 2));
  
  // Create CSV
  const csvRows = [
    ['Field', 'Value'],
    ['Buyers', Array.isArray(results.buyers) ? results.buyers.join('; ') : results.buyers || ''],
    ['Property', results.property_address || results.address || ''],
    ['Purchase Type', results.purchase_type || ''],
    ['Price', results.purchase_price || results.cash_amount || ''],
    ['Loan Type', results.loan_type || ''],
    ['Agency', results.agency || ''],
    ['Earnest Money', results.earnest_money || ''],
    ['Non-refundable', results.non_refundable || ''],
    ['Title', results.title || ''],
    ['Survey', results.survey || ''],
    ['Warranty', results.warranty || ''],
    ['Inspection', results.inspection || ''],
    ['Termite', results.termite || ''],
    ['Lead Paint', results.lead || ''],
    ['Possession', results.possession || '']
  ];
  
  const csv = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  await fs.writeFile('./contract2_vision_results.csv', csv);
  
  console.log('\n✓ Results saved to contract2_vision_results.json');
  console.log('✓ CSV saved to contract2_vision_results.csv');
}

extractContract2().catch(console.error);