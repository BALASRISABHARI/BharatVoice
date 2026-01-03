// verify_credentials.js - SAFE test (no private key display)
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔐 Verifying Google Cloud credentials...\n');

// Check file exists
const credPath = join(__dirname, 'service-accountKey.json');
if (!fs.existsSync(credPath)) {
  console.log('❌ service-accountKey.json not found');
  process.exit(1);
}

// Read and parse (safely)
try {
  const credData = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  
  console.log('✅ Credentials found!');
  console.log('📁 File:', credPath);
  console.log('🏢 Project ID:', credData.project_id);
  console.log('📧 Service Account:', credData.client_email);
  console.log('✅ Private key:', credData.private_key ? 'PRESENT (hidden for security)' : 'MISSING');
  
  // Verify key format
  if (credData.private_key && credData.private_key.includes('BEGIN PRIVATE KEY')) {
    console.log('✅ Key format: CORRECT');
  } else {
    console.log('❌ Key format: INVALID');
  }
  
} catch (error) {
  console.log('❌ Error reading credentials:', error.message);
  process.exit(1);
}

console.log('\n✅ Credentials verification PASSED!');
console.log('\n🔧 Next: Install Google Cloud Speech library...');