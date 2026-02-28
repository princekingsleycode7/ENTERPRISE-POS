// scripts/setAdminClaim.js
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  const keyPath = path.join(__dirname, '../serviceAccountKey.json');
  const keyData = readFileSync(keyPath, 'utf-8');
  serviceAccount = JSON.parse(keyData);
} catch (error) {
  console.error('❌ Error: serviceAccountKey.json not found in project root');
  console.error('Please download it from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();

/**
 * Set platform_admin custom claim on a user by UID
 * Usage: node setAdminClaim.js <user-uid>
 */
async function setAdminClaim(uid) {
  try {
    console.log(`Setting platform_admin role for UID: ${uid}...`);
    
    // Set custom claims
    await auth.setCustomUserClaims(uid, { role: 'platform_admin' });
    
    // Get user info to verify
    const user = await auth.getUser(uid);
    
    console.log(`✅ SUCCESS! Set platform_admin role`);
    console.log(`   UID: ${uid}`);
    console.log(`   Email: ${user.email || 'No email'}`);
    console.log(`   Display Name: ${user.displayName || 'Not set'}`);
    console.log(`   Custom Claims: { role: 'platform_admin' }`);
    console.log(`\n   User can now log in at: /admin/login`);
    
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error setting custom claims:`, error.message);
    process.exit(1);
  }
}

// Get UID from command line argument
const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node setAdminClaim.js <user-uid>');
  console.error('Example: node setAdminClaim.js YGYtUIM0tiYvpJVW9OAVaDqlo732');
  process.exit(1);
}

setAdminClaim(uid);
