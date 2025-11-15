/**
 * Standalone Volume Tracker Server
 * 
 * This runs as a separate Node.js process to maintain persistent
 * WebSocket connections for real-time event tracking.
 * 
 * Run with: npm run tracker
 * Or: node --loader ts-node/esm server/tracker.ts
 */

// IMPORTANT: Load environment variables BEFORE importing any modules that use them
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

// Now import modules that depend on env vars
import { initializeVolumeTracking, stopVolumeTracking } from '../lib/volume-tracker';

console.log('🚀 Starting Volume Tracker Server...');
console.log('Press Ctrl+C to stop');

// Initialize tracking
initializeVolumeTracking()
  .then(() => {
    console.log('✅ Volume tracking server running');
    console.log('📡 Listening for events...');
    // Keep process alive - WebSocket connections will keep it running
  })
  .catch((error) => {
    console.error('❌ Failed to start tracking:', error);
    process.exit(1);
  });

// Keep the process alive indefinitely
// The WebSocket connections from Somnia SDK will keep it running
setInterval(() => {
  // Heartbeat to keep process alive (runs every 30 seconds)
}, 30000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  stopVolumeTracking();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  stopVolumeTracking();
  process.exit(0);
});

// Keep process alive
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

