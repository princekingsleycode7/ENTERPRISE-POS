// functions/scripts/setAdminClaim.mjs
import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the project root
const projectRoot = path.join(__dirname, '..');

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  const keyPath = path.join(projectRoot, '../serviceAccountKey.json');
  const keyData = fs.readFileSync(keyPath, 'utf-8');
  serviceAccount = JSON.parse(keyData);
  console.log('✅ Found serviceAccountKey.json');
} catch (error) {
  console.error('❌ Error: serviceAccountKey.json not found');
  console.error('Download from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();

async function setAdminClaim(uid) {
  try {
    console.log(`\n⏳ Setting platform_admin role for UID: ${uid}...`);
    
    await auth.setCustomUserClaims(uid, { role: 'platform_admin' });
    
    const user = await auth.getUser(uid);
    
    console.log(`\n✅✅✅ SUCCESS! Custom claim set ✅✅✅`);
    console.log(`
UID: ${uid}
Email: ${user.email || 'No email'}
Display Name: ${user.displayName || 'Not set'}
Custom Claims: { "role": "platform_admin" }

📱 User can now log in at: /admin/login
    `);
    
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    process.exit(1);
  }
}

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node setAdminClaim.mjs <user-uid>');
  process.exit(1);
}

setAdminClaim(uid);
