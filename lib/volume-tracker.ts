/**
 * Volume Tracker
 * 
 * Manages real-time volume tracking for all projects
 * Subscribes to events, tracks unique wallets, and updates rankings
 * Uses JSON file storage with locking for persistence
 */

import { subscribeToProjectEvents, unsubscribeAll, EventData } from './somnia-streams';
import { getAllProjects, batchUpdateProjectVolumes, recalculateRankings, Project } from './supabase';
import { recordWalletInteraction, cleanupOldWallets, getAllProjectStats } from './wallet-storage';
import { initializePushNotifications, sendPushToProjectSubscribers } from './push-notifications';

// Track which projects we're already subscribed to
const subscribedProjectIds = new Set<string>();

/**
 * Subscribe to a single project's events
 */
async function subscribeToProject(project: Project): Promise<void> {
  if (subscribedProjectIds.has(project.id)) {
    return; // Already subscribed
  }

  try {
    await subscribeToProjectEvents(
      {
        id: project.id,
        contract_address: project.contract_address,
        abi: project.abi,
        event_signatures: project.event_signatures,
        unique_wallets: project.unique_wallets,
        total_transactions: project.total_transactions,
      },
      handleProjectEvent
    );
    subscribedProjectIds.add(project.id);
    console.log(`✅ Subscribed to events for project: ${project.project_name}`);
  } catch (error) {
    console.error(`❌ Failed to subscribe to project ${project.project_name} (${project.id}):`, error);
    // Don't add to subscribed set if subscription failed
  }
}

/**
 * Check for new projects and subscribe to them
 */
export async function checkForNewProjects(): Promise<void> {
  try {
    const projects = await getAllProjects();
    const newProjects = projects.filter(p => !subscribedProjectIds.has(p.id));
    
    if (newProjects.length > 0) {
      console.log(`\n🆕 Found ${newProjects.length} new project(s) to track:`);
      for (const project of newProjects) {
        await subscribeToProject(project);
      }
    }
  } catch (error) {
    console.error('Error checking for new projects:', error);
  }
}

/**
 * Initialize volume tracking for all projects
 */
export async function initializeVolumeTracking(): Promise<void> {
  console.log('Initializing volume tracking...');

  // Initialize push notifications
  initializePushNotifications();

  // Load existing unique wallets from database (if you have a wallet_tracking table)
  // For now, we'll start fresh on each restart
  
  const projects = await getAllProjects();
  
  console.log(`Found ${projects.length} project(s) to track`);

  // Subscribe to events for each project
  for (const project of projects) {
    await subscribeToProject(project);
  }

  console.log('Volume tracking initialized');
  
  // Check for new projects every 30 seconds
  setInterval(() => {
    checkForNewProjects();
  }, 30000); // Check every 30 seconds

  // Run cleanup immediately on startup (to clean overdue wallets from previous session)
  console.log('🧹 Running initial cleanup on startup...');
  await runCleanupAndUpdate();

  // Sync to Supabase every 5 minutes (for UI updates)
  setInterval(async () => {
    await syncToSupabase();
  }, 5 * 60 * 1000); // 5 minutes

  // Run cleanup and update Supabase every 1 hour
  setInterval(async () => {
    await runCleanupAndUpdate();
  }, 60 * 60 * 1000); // 1 hour
}

/**
 * Handle incoming event from a project
 * Updates JSON file only (no database calls for performance)
 */
async function handleProjectEvent(event: EventData): Promise<void> {
  const projectId = event.projectId;
  const walletAddress = event.walletAddress;

  console.log(`\n🎯 Event received!`);
  console.log(`   Project ID: ${projectId}`);
  console.log(`   Event: ${event.eventName}`);
  console.log(`   Wallet: ${walletAddress}`);
  console.log(`   Block: ${event.blockNumber}`);
  console.log(`   TX: ${event.transactionHash}`);

  // Update JSON file only (fast, no DB call)
  const { isNewWallet, uniqueWallets, totalTransactions } = await recordWalletInteraction(
    projectId,
    walletAddress
  );
  
  if (isNewWallet) {
    console.log(`✨ NEW WALLET detected for project ${projectId}: ${walletAddress}`);
    console.log(`   Unique wallets: ${uniqueWallets}, Total transactions: ${totalTransactions}`);
  } else {
    console.log(`   (Wallet already tracked)`);
    console.log(`   Unique wallets: ${uniqueWallets}, Total transactions: ${totalTransactions}`);
  }

  // Send push notifications to users monitoring this project
  // Only sends if percentage change meets their threshold
  try {
    const { sent, failed, skipped } = await sendPushToProjectSubscribers(
      projectId,
      uniqueWallets, // Use unique_wallets as the volume metric
      {
        title: 'Volume Update',
        body: `Project volume changed`,
        icon: '/favicon.ico',
        tag: `project-${projectId}-${uniqueWallets}`,
        url: `/detail/${projectId}`,
        projectId: projectId,
        eventType: event.eventName,
        transactionHash: event.transactionHash,
        requireInteraction: false,
      }
    );

    if (sent > 0) {
      console.log(`   📤 Sent ${sent} notification(s) to subscribers`);
    }
    if (skipped > 0) {
      console.log(`   ⏭️  Skipped ${skipped} user(s) (threshold not met)`);
    }
  } catch (error) {
    // Don't fail the event processing if push fails
    console.warn('Failed to send push notifications:', error);
  }
}

/**
 * Sync all project stats to Supabase (without cleanup)
 * This runs every 5 minutes for UI updates
 */
async function syncToSupabase(): Promise<void> {
  try {
    const allStats = await getAllProjectStats();
    if (allStats.length === 0) {
      return; // No projects to sync
    }

    console.log(`\n📊 Syncing ${allStats.length} project(s) to Supabase...`);
    await batchUpdateProjectVolumes(allStats);
    await recalculateRankings();
    console.log('✅ Sync complete');
  } catch (error) {
    console.error('❌ Error syncing to Supabase:', error);
  }
}

/**
 * Run cleanup (remove wallets older than 24h) and update Supabase
 * This runs every 1 hour
 */
async function runCleanupAndUpdate(): Promise<void> {
  try {
    console.log('\n🧹 Running cleanup and updating Supabase...');
    
    // Clean up old wallets (older than 24 hours) and get updated counts
    const { updates, totalRemoved, projectsCleaned } = await cleanupOldWallets();
    
    if (totalRemoved > 0) {
      console.log(`   🗑️  Removed ${totalRemoved} wallet(s) older than 24 hours from ${projectsCleaned} project(s)`);
    } else {
      console.log('   ✅ No wallets to clean (all wallets are within 24 hours)');
    }

    // Always sync all project stats to Supabase (not just cleaned ones)
    const allStats = await getAllProjectStats();
    console.log(`   📊 Syncing ${allStats.length} project(s) to Supabase...`);

    // Batch update Supabase with all current counts
    await batchUpdateProjectVolumes(allStats);

    // Recalculate rankings
    await recalculateRankings();
    
    console.log('✅ Cleanup and update complete');
  } catch (error) {
    console.error('❌ Error during cleanup and update:', error);
  }
}

/**
 * Stop all volume tracking
 */
export function stopVolumeTracking() {
  unsubscribeAll();
  subscribedProjectIds.clear();
}

