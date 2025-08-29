import * as fs from 'fs';
import * as path from 'path';

/**
 * Get Google service account credentials from environment or file
 */
export function getGoogleCredentials() {
  // Check for service account key in environment variable (as JSON string)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      // Parse the JSON string from environment
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      
      // Write to temporary file for Google Auth library
      const tempPath = path.join(process.cwd(), 'temp-service-account.json');
      fs.writeFileSync(tempPath, JSON.stringify(credentials, null, 2));
      
      console.log('✅ Using Google credentials from environment variable');
      return tempPath;
    } catch (error) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', error);
    }
  }
  
  // Check for base64 encoded service account key
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64) {
    try {
      // Decode base64
      const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString('utf-8');
      const credentials = JSON.parse(decoded);
      
      // Write to temporary file
      const tempPath = path.join(process.cwd(), 'temp-service-account.json');
      fs.writeFileSync(tempPath, JSON.stringify(credentials, null, 2));
      
      console.log('✅ Using Google credentials from base64 environment variable');
      return tempPath;
    } catch (error) {
      console.error('Failed to decode GOOGLE_SERVICE_ACCOUNT_KEY_BASE64:', error);
    }
  }
  
  // Fall back to local file
  const localPath = 'service-account-key.json';
  if (fs.existsSync(localPath)) {
    console.log('✅ Using Google credentials from local file');
    return localPath;
  }
  
  console.error('❌ No Google service account credentials found!');
  console.error('Please set one of:');
  console.error('  - GOOGLE_SERVICE_ACCOUNT_KEY (JSON string)');
  console.error('  - GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 (base64 encoded)');
  console.error('  - service-account-key.json (local file)');
  
  return null;
}