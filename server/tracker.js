/**
 * Standalone Volume Tracker Server (JavaScript version)
 * 
 * Run with: node server/tracker.js
 */

require('dotenv').config();
const { initializeVolumeTracking, stopVolumeTracking } = require('../lib/volume-tracker');

console.log('🚀 Starting Volume Tracker Server...');
console.log('Press Ctrl+C to stop');

// Initialize tracking
initializeVolumeTracking()
  .then(() => {
    console.log('✅ Volume tracking server running');
  })
  .catch((error) => {
    console.error('❌ Failed to start tracking:', error);
    process.exit(1);
  });

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

