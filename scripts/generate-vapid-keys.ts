/**
 * Generate VAPID keys for Web Push Notifications
 * 
 * Run with: npm run generate:vapid-keys
 * or: tsx scripts/generate-vapid-keys.ts
 * 
 * This will generate a public and private key pair that you need to add to your .env file
 */

import * as webpush from 'web-push';

console.log('🔑 Generating VAPID keys for Web Push Notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID keys generated!\n');
console.log('Add these to your .env file:\n');
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('\n⚠️  Keep the private key SECRET! Never commit it to git.\n');
console.log('📝 Also set your contact email (optional but recommended):');
console.log('VAPID_EMAIL=mailto:your-email@example.com\n');

