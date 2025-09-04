#!/usr/bin/env node

/**
 * Offer Sheet Service Startup Script
 * Standalone launcher for the offer sheet processor only
 * For separate Railway deployment
 */

// Load environment variables FIRST
require('dotenv').config();

console.log('🚀 Starting Offer Sheet Service...');
console.log('📧 Email: contractextraction@gmail.com');
console.log('📄 Purpose: Quick offer sheet extraction and email response');

// Start health check server IMMEDIATELY
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Track service status
const serviceStatus = {
  status: 'initializing',
  lastCheck: null,
  emailsProcessed: 0,
  startTime: new Date().toISOString()
};

// Simple health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    uptime: process.uptime(),
    service: 'offer-sheet-processor',
    details: serviceStatus
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    uptime: process.uptime(),
    service: 'offer-sheet-processor',
    details: serviceStatus
  });
});

app.get('/', (req, res) => {
  const uptimeMinutes = Math.floor(process.uptime() / 60);
  const html = `
    <html>
      <head>
        <title>Offer Sheet Service</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          }
          h1 {
            color: #333;
            margin-bottom: 10px;
          }
          .status {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 5px;
            font-weight: bold;
            background: ${serviceStatus.status === 'running' ? '#10b981' : '#f59e0b'};
            color: white;
          }
          .info {
            margin: 20px 0;
            padding: 15px;
            background: #f3f4f6;
            border-radius: 5px;
          }
          .metric {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
          }
          .label {
            font-weight: 600;
            color: #6b7280;
          }
          .value {
            color: #111827;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📄 Arkansas Offer Sheet Service</h1>
          <p>Quick contract extraction and email response system</p>
          
          <div class="status">${serviceStatus.status.toUpperCase()}</div>
          
          <div class="info">
            <div class="metric">
              <span class="label">Service Email:</span>
              <span class="value">contractextraction@gmail.com</span>
            </div>
            <div class="metric">
              <span class="label">Uptime:</span>
              <span class="value">${uptimeMinutes} minutes</span>
            </div>
            <div class="metric">
              <span class="label">Emails Processed:</span>
              <span class="value">${serviceStatus.emailsProcessed}</span>
            </div>
            <div class="metric">
              <span class="label">Last Check:</span>
              <span class="value">${serviceStatus.lastCheck || 'Never'}</span>
            </div>
            <div class="metric">
              <span class="label">Email Provider:</span>
              <span class="value">${process.env.SENDGRID_API_KEY ? 'Azure SendGrid' : 'Gmail SMTP'}</span>
            </div>
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background: #fef3c7; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #92400e;">How to Use:</h3>
            <ol style="color: #78350f;">
              <li>Send contract PDF to <strong>contractextraction@gmail.com</strong></li>
              <li>Service extracts offer details using GPT-5</li>
              <li>Receive formatted offer sheet via email in 15-20 seconds</li>
              <li>Forward the offer sheet to listing agents</li>
            </ol>
          </div>
        </div>
      </body>
    </html>
  `;
  res.status(200).send(html);
});

// Start listening immediately
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Health check server running on port ${PORT}`);
  console.log('📍 Endpoints available: /, /health, /api/health');
  
  // Load TypeScript support
  require('ts-node/register');
  
  // Show available environment variables
  console.log('\n📋 Checking environment variables...');
  const hasOfferEmail = !!process.env.OFFER_SHEET_EMAIL;
  const hasOfferPassword = !!process.env.OFFER_SHEET_PASSWORD;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasSendGrid = !!process.env.SENDGRID_API_KEY;
  
  console.log(`✅ OFFER_SHEET_EMAIL: ${hasOfferEmail ? 'Set' : '❌ Missing'}`);
  console.log(`✅ OFFER_SHEET_PASSWORD: ${hasOfferPassword ? 'Set' : '❌ Missing'}`);
  console.log(`✅ OPENAI_API_KEY: ${hasOpenAI ? 'Set' : '❌ Missing'}`);
  console.log(`📧 SENDGRID_API_KEY: ${hasSendGrid ? 'Set (using SendGrid)' : 'Not set (using Gmail SMTP)'}`);
  
  // Check for required variables
  const requiredVars = ['OFFER_SHEET_PASSWORD', 'OPENAI_API_KEY'];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.error('\n❌ Missing required environment variables:', missingVars.join(', '));
    console.log('⚠️ Offer Sheet processor cannot start without these variables');
    console.log('💡 Add these in Railway Variables tab');
    serviceStatus.status = 'error - missing variables';
    return;
  }
  
  // Start the Offer Sheet Processor
  console.log('\n📄 Starting Offer Sheet Processor...');
  
  try {
    const { OfferSheetProcessor } = require('./offer-sheet-app/offer-sheet-processor.ts');
    const processor = new OfferSheetProcessor();
    
    console.log('📧 Initializing email monitoring...');
    
    processor.start().then(() => {
      console.log('✅ Offer Sheet processor running successfully!');
      console.log('📧 Monitoring: contractextraction@gmail.com');
      console.log('⏰ Check interval: Every 5 minutes');
      
      if (process.env.SENDGRID_API_KEY) {
        console.log('✉️ Using Azure SendGrid for email delivery');
        console.log('   Better deliverability and tracking');
      } else {
        console.log('📮 Using Gmail SMTP for email delivery');
        console.log('   Consider adding SendGrid for better deliverability');
      }
      
      serviceStatus.status = 'running';
      serviceStatus.lastCheck = new Date().toISOString();
      
      console.log('\n🎯 Service Ready!');
      console.log('Send contracts to: contractextraction@gmail.com');
      console.log('View status at: /');
      
    }).catch(err => {
      console.error('❌ Failed to start offer processor:', err.message);
      serviceStatus.status = 'error - ' + err.message;
    });
    
  } catch (error) {
    console.error('❌ Failed to load offer processor:', error.message);
    console.error('Stack trace:', error.stack);
    serviceStatus.status = 'error - ' + error.message;
    console.log('⚠️ Health check server still running despite error');
  }
  
  // Update status periodically
  setInterval(() => {
    if (serviceStatus.status === 'running') {
      serviceStatus.lastCheck = new Date().toISOString();
    }
  }, 60000); // Update every minute
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down Offer Sheet Service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});