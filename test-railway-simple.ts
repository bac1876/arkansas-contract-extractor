/**
 * Simple test to check Railway environment
 */

console.log('🚀 RAILWAY SIMPLE TEST STARTING');
console.log('================================\n');

console.log('1. Environment Variables:');
console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ SET' : '❌ NOT SET'}`);
console.log(`   GOOGLE_SHARED_DRIVE_ID: ${process.env.GOOGLE_SHARED_DRIVE_ID ? '✅ SET' : '❌ NOT SET'}`);
console.log(`   EMAIL_USER: ${process.env.EMAIL_USER || 'NOT SET'}`);

console.log('\n2. System Info:');
console.log(`   Platform: ${process.platform}`);
console.log(`   Node version: ${process.version}`);
console.log(`   Current directory: ${process.cwd()}`);

console.log('\n3. Testing OpenAI API:');
if (process.env.OPENAI_API_KEY) {
  console.log('   ✅ OpenAI API key is configured');
  console.log(`   Key starts with: ${process.env.OPENAI_API_KEY.substring(0, 10)}...`);
} else {
  console.log('   ❌ OpenAI API key is MISSING - THIS IS THE PROBLEM!');
}

console.log('\n4. Testing ImageMagick:');
const { execSync } = require('child_process');
try {
  const result = execSync('convert -version', { encoding: 'utf8' });
  console.log('   ✅ ImageMagick found');
  console.log(`   ${result.split('\n')[0]}`);
} catch (error: any) {
  console.log('   ❌ ImageMagick NOT FOUND - THIS IS A PROBLEM!');
  console.log(`   Error: ${error.message}`);
}

console.log('\n🏁 RAILWAY SIMPLE TEST COMPLETE');
console.log('================================');