// Minimal health check server for Railway
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Health endpoints
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.get('/', (req, res) => res.status(200).send('OK'));

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Health server on port ${PORT}`);
});

// Then start the main application
setTimeout(() => {
  console.log('Starting email monitor...');
  require('./email-monitor.ts');
}, 1000);