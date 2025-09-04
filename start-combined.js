#!/usr/bin/env node

/**
 * Combined Railway startup script
 * Runs both the main email monitor and offer sheet processor
 * Starts health check server immediately, then loads both applications
 */

// Load environment variables FIRST
require('dotenv').config();

console.log('🚀 Starting Railway deployment (Combined Services)...');

// Start health check server IMMEDIATELY
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Track service status
const serviceStatus = {
  mainMonitor: { status: 'initializing', lastCheck: null },
  offerSheet: { status: 'initializing', lastCheck: null }
};

// Simple health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    uptime: process.uptime(),
    services: serviceStatus
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    uptime: process.uptime(),
    services: serviceStatus 
  });
});

app.get('/', (req, res) => {
  const html = `
    <html>
      <head><title>Arkansas Contract Services</title></head>
      <body style="font-family: Arial; padding: 20px;">
        <h1>Arkansas Contract Processing Services</h1>
        <h2>Service Status:</h2>
        <ul>
          <li>Main Email Monitor: ${serviceStatus.mainMonitor.status}</li>
          <li>Offer Sheet Processor: ${serviceStatus.offerSheet.status}</li>
        </ul>
        <p>Uptime: ${Math.floor(process.uptime())} seconds</p>
      </body>
    </html>
  `;
  res.status(200).send(html);
});

// Service-specific endpoints
app.get('/status/main', (req, res) => {
  res.json(serviceStatus.mainMonitor);
});

app.get('/status/offer-sheet', (req, res) => {
  res.json(serviceStatus.offerSheet);
});

// Start listening immediately
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Health check server running on port ${PORT}`);
  console.log('📍 Endpoints available: /, /health, /api/health, /status/main, /status/offer-sheet');
  
  // Load TypeScript support
  require('ts-node/register');
  
  // Debug: Show what environment variables ARE available
  console.log('📋 Available environment variables:');
  const envKeys = Object.keys(process.env).filter(key => 
    !key.startsWith('npm_') && 
    !key.startsWith('NODE_') && 
    !key.includes('PATH')
  );
  console.log(envKeys.join(', '));
  
  // Start the MAIN EMAIL MONITOR
  console.log('\n📧 Starting MAIN Email Monitor (offers@searchnwa.com)...');
  
  // Check for main monitor required variables
  const mainRequiredVars = ['EMAIL_PASSWORD', 'OPENAI_API_KEY'];
  const mainMissingVars = mainRequiredVars.filter(v => !process.env[v]);
  
  if (mainMissingVars.length > 0) {
    console.error('❌ Main Monitor missing required variables:', mainMissingVars.join(', '));
    serviceStatus.mainMonitor.status = 'error - missing variables';
  } else {
    try {
      const { EmailMonitor } = require('./email-monitor.ts');
      const mainMonitor = new EmailMonitor();
      
      const email = process.env.EMAIL_USER || 'offers@searchnwa.com';
      const password = process.env.EMAIL_PASSWORD;
      
      console.log('📧 Connecting main monitor to:', email);
      
      mainMonitor.connect({
        user: email,
        password: password,
        host: 'imap.gmail.com',
        port: 993,
        tls: true
      }).then(() => {
        console.log('✅ Main email monitor running successfully!');
        console.log(`📧 Send contracts to: ${email}`);
        serviceStatus.mainMonitor.status = 'running';
        serviceStatus.mainMonitor.lastCheck = new Date().toISOString();
      }).catch(err => {
        console.error('❌ Failed to connect main monitor:', err.message);
        serviceStatus.mainMonitor.status = 'error - ' + err.message;
      });
      
    } catch (error) {
      console.error('❌ Failed to load main monitor:', error.message);
      serviceStatus.mainMonitor.status = 'error - ' + error.message;
    }
  }
  
  // Start the OFFER SHEET PROCESSOR
  console.log('\n📄 Starting Offer Sheet Processor (contractextraction@gmail.com)...');
  
  // Check for offer sheet required variables
  const offerRequiredVars = ['OFFER_SHEET_PASSWORD', 'OPENAI_API_KEY'];
  const offerMissingVars = offerRequiredVars.filter(v => !process.env[v]);
  
  if (offerMissingVars.length > 0) {
    console.error('❌ Offer Sheet missing required variables:', offerMissingVars.join(', '));
    serviceStatus.offerSheet.status = 'error - missing variables';
  } else {
    try {
      const { OfferSheetProcessor } = require('./offer-sheet-app/offer-sheet-processor.ts');
      const offerProcessor = new OfferSheetProcessor();
      
      console.log('📄 Starting offer sheet monitoring...');
      
      // The processor handles its own connection
      offerProcessor.start().then(() => {
        console.log('✅ Offer Sheet processor running successfully!');
        console.log('📧 Send offer contracts to: contractextraction@gmail.com');
        serviceStatus.offerSheet.status = 'running';
        serviceStatus.offerSheet.lastCheck = new Date().toISOString();
        
        // Check for SendGrid
        if (process.env.SENDGRID_API_KEY) {
          console.log('✉️ Using Azure SendGrid for offer sheet emails');
        } else {
          console.log('📮 Using Gmail SMTP for offer sheet emails (SendGrid not configured)');
        }
      }).catch(err => {
        console.error('❌ Failed to start offer processor:', err.message);
        serviceStatus.offerSheet.status = 'error - ' + err.message;
      });
      
    } catch (error) {
      console.error('❌ Failed to load offer processor:', error.message);
      serviceStatus.offerSheet.status = 'error - ' + error.message;
    }
  }
  
  console.log('\n🎯 Service Summary:');
  console.log('- Main Monitor:', serviceStatus.mainMonitor.status);
  console.log('- Offer Sheet:', serviceStatus.offerSheet.status);
  console.log('\n📝 Visit / endpoint for status dashboard');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down all services...');
    process.exit(0);
  });
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});