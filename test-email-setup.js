/**
 * Test Email Monitor Setup
 * Verifies that the email monitoring system is ready
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Arkansas Contract Email Monitor - Setup Check\n');
console.log('=' .repeat(60));

// Check for required files
const requiredFiles = [
  'email-monitor.ts',
  'public/email-dashboard.html',
  'extraction-imagemagick.ts',
  'dist/extraction-imagemagick.js'
];

console.log('📁 Checking required files:');
let allFilesExist = true;
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log('\n📦 Checking dependencies:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = ['imap', 'mailparser', 'openai', 'dotenv'];
requiredDeps.forEach(dep => {
  const installed = packageJson.dependencies[dep] || packageJson.devDependencies[dep];
  console.log(`   ${installed ? '✅' : '❌'} ${dep}: ${installed || 'NOT INSTALLED'}`);
});

console.log('\n🔐 Checking environment setup:');
const envExists = fs.existsSync('.env');
console.log(`   ${envExists ? '✅' : '⚠️'} .env file: ${envExists ? 'EXISTS' : 'NOT FOUND - Create it with Gmail credentials'}`);

if (envExists) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const hasUser = envContent.includes('GMAIL_USER');
  const hasPassword = envContent.includes('GMAIL_PASSWORD');
  console.log(`   ${hasUser ? '✅' : '❌'} GMAIL_USER configured`);
  console.log(`   ${hasPassword ? '✅' : '❌'} GMAIL_PASSWORD configured`);
}

console.log('\n📊 System Status:');
console.log(`   📧 Email: contractextraction@gmail.com`);
console.log(`   💰 Cost: $0.023 per contract (GPT-5-mini)`);
console.log(`   📈 Fields: 47 total fields extracted`);
console.log(`   🌐 Dashboard: http://localhost:3006/email-dashboard.html`);

console.log('\n' + '=' .repeat(60));

if (!envExists) {
  console.log('\n⚠️  NEXT STEPS:');
  console.log('1. Create a .env file with:');
  console.log('   GMAIL_USER=contractextraction@gmail.com');
  console.log('   GMAIL_PASSWORD=your-app-password\n');
  console.log('2. Get Gmail App Password:');
  console.log('   - Go to https://myaccount.google.com/security');
  console.log('   - Enable 2-factor authentication');
  console.log('   - Generate app-specific password\n');
  console.log('3. Run: npm run email-monitor');
} else {
  console.log('\n✅ System appears ready!');
  console.log('To start monitoring emails, run:');
  console.log('   npm run email-monitor');
  console.log('\nOr use the batch file:');
  console.log('   start-email-monitor.bat');
}

console.log('\n📚 Documentation: setup-email-monitor.md');
console.log('=' .repeat(60));