#!/usr/bin/env node

/**
 * Railway startup script
 * Starts health check server immediately, then loads the main application
 */

// Load environment variables FIRST
require('dotenv').config();

console.log('🚀 Starting Railway deployment...');

// Start health check server IMMEDIATELY
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Simple health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    uptime: process.uptime() 
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    uptime: process.uptime() 
  });
});

app.get('/', (req, res) => {
  res.status(200).send('Arkansas Contract Email Monitor v3.5');
});

// Test Google Drive upload endpoint
app.get('/test-drive', async (req, res) => {
  console.log('🧪 Test Drive endpoint hit!');
  try {
    require('ts-node/register');
    const testScript = require('./test-railway-drive-upload.ts');
    res.status(200).json({ 
      status: 'test initiated',
      message: 'Check Railway logs for results' 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
});

// Test extraction endpoint
app.get('/test-extraction', async (req, res) => {
  console.log('🧪 Test Extraction endpoint hit!');
  try {
    require('ts-node/register');
    const testScript = require('./test-railway-extraction.ts');
    res.status(200).json({ 
      status: 'extraction test initiated',
      message: 'Check Railway logs for results' 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
});

// Simple test endpoint
app.get('/test-simple', async (req, res) => {
  console.log('🧪 Simple Test endpoint hit!');
  try {
    require('ts-node/register');
    require('./test-railway-simple.ts');
    res.status(200).json({ 
      status: 'simple test completed',
      message: 'Check Railway logs for results' 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
});

// ImageMagick test endpoint
app.get('/test-imagemagick', async (req, res) => {
  console.log('🧪 ImageMagick Test endpoint hit!');
  try {
    require('ts-node/register');
    require('./test-imagemagick.ts');
    res.status(200).json({ 
      status: 'imagemagick test initiated',
      message: 'Check Railway logs for results' 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
});

// Start listening immediately
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Health check server running on port ${PORT}`);
  console.log('📍 Endpoints available: /, /health, /api/health');
  
  // Now start the main email monitor after health server is running
  console.log('🔄 Loading email monitor application...');
  
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
  
  // Check for required environment variables (backward compatible with old names)
  const requiredVars = ['OPENAI_API_KEY'];
  const hasPassword = process.env.EMAIL_PASSWORD || process.env.OFFER_SHEET_PASSWORD;
  const missingVars = requiredVars.filter(v => !process.env[v]);

  if (!hasPassword) {
    missingVars.push('EMAIL_PASSWORD (or OFFER_SHEET_PASSWORD)');
  }

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.log('⚠️ Email monitor cannot start without these variables');
    console.log('⚠️ Health check server still running for Railway');
    console.log('💡 Make sure these are set in Railway Variables tab');
    return; // Don't try to start email monitor
  }
  
  // Start the email monitor
  try {
    const { EmailMonitor } = require('./email-monitor.ts');
    const monitor = new EmailMonitor();

    // Backward compatible: support both old and new environment variable names
    const email = process.env.EMAIL_USER || process.env.OFFER_SHEET_EMAIL || 'offers@searchnwa.com';
    const password = process.env.EMAIL_PASSWORD || process.env.OFFER_SHEET_PASSWORD;
    
    console.log('📧 Connecting to email:', email);
    
    monitor.connect({
      user: email,
      password: password,
      host: 'imap.gmail.com',
      port: 993,
      tls: true
    }).then(() => {
      console.log('✅ Email monitor is running successfully!');
      console.log(`📧 Send contracts to: ${email}`);
    }).catch(err => {
      console.error('❌ Failed to connect email monitor:', err.message);
      console.log('⚠️ Health check server still running despite error');
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down email monitor...');
      monitor.disconnect();
    });
    
    console.log('✅ Email monitor loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load email monitor:', error.message);
    console.error('Stack trace:', error.stack);
    // Keep health check running even if email monitor fails
    console.log('⚠️ Health check server still running despite error');
  }
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});