/**
 * AWS Lambda function to process emails from S3 and extract PDFs
 * Triggers when SES writes email to S3 bucket
 */

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { simpleParser } from "mailparser";
import fetch from 'node-fetch';

const s3 = new S3Client({});

// Your extraction service endpoint
const EXTRACTION_ENDPOINT = process.env.EXTRACTION_ENDPOINT || 'https://your-app.com/api/process-contract';
const API_KEY = process.env.API_KEY;

export const handler = async (event) => {
  console.log('Processing email event:', JSON.stringify(event, null, 2));
  
  try {
    // Get the S3 object details from the event
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    console.log(`Fetching email from S3: ${bucket}/${key}`);
    
    // Get the raw email from S3
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });
    
    const response = await s3.send(command);
    const emailData = await streamToString(response.Body);
    
    // Parse the email
    const parsed = await simpleParser(emailData);
    
    console.log(`Email from: ${parsed.from?.text}`);
    console.log(`Subject: ${parsed.subject}`);
    console.log(`Attachments: ${parsed.attachments?.length || 0}`);
    
    // Process each PDF attachment
    const results = [];
    
    if (parsed.attachments) {
      for (const attachment of parsed.attachments) {
        if (attachment.contentType === 'application/pdf' || 
            attachment.filename?.toLowerCase().endsWith('.pdf')) {
          
          console.log(`Processing PDF: ${attachment.filename}`);
          
          // Send PDF to extraction service
          const result = await sendToExtractionService({
            filename: attachment.filename,
            content: attachment.content.toString('base64'),
            from: parsed.from?.text,
            subject: parsed.subject,
            date: parsed.date,
            messageId: parsed.messageId
          });
          
          results.push(result);
        }
      }
    }
    
    // Store processing results back to S3 (optional)
    if (results.length > 0) {
      const resultsKey = key.replace(/^inbox\//, 'processed/') + '.json';
      await storeResults(bucket, resultsKey, results);
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Email processed successfully',
        attachments: results.length,
        results: results
      })
    };
    
  } catch (error) {
    console.error('Error processing email:', error);
    
    // Store error info for debugging
    const errorKey = `errors/${Date.now()}_error.json`;
    await storeResults(record.s3.bucket.name, errorKey, {
      error: error.message,
      stack: error.stack,
      event: event
    });
    
    throw error;
  }
};

/**
 * Convert stream to string
 */
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Send PDF to extraction service
 */
async function sendToExtractionService(data) {
  try {
    const response = await fetch(EXTRACTION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Extraction service returned ${response.status}: ${await response.text()}`);
    }
    
    const result = await response.json();
    console.log(`Extraction successful for ${data.filename}`);
    return result;
    
  } catch (error) {
    console.error(`Failed to process ${data.filename}:`, error);
    return {
      success: false,
      filename: data.filename,
      error: error.message
    };
  }
}

/**
 * Store results back to S3
 */
async function storeResults(bucket, key, data) {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({});
  
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json'
  }));
  
  console.log(`Stored results at s3://${bucket}/${key}`);
}