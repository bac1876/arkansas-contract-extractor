#!/usr/bin/env node

/**
 * Railway startup script
 * Starts health check server immediately, then loads the main application
 */

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

// Start listening immediately
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Health check server running on port ${PORT}`);
  console.log('📍 Endpoints available: /, /health, /api/health');
  
  // Now start the main email monitor after health server is running
  console.log('🔄 Loading email monitor application...');
  
  // Load TypeScript support
  require('ts-node/register');
  
  // Start the email monitor
  try {
    require('./email-monitor.ts');
    console.log('✅ Email monitor loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load email monitor:', error);
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