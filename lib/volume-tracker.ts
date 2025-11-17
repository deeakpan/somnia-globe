/**
 * Volume Tracker
 * 
 * Manages real-time volume tracking for all projects
 * Subscribes to events, tracks unique wallets, and updates rankings
 * Uses JSON file storage with locking for persistence
 */

import { subscribeToProjectEvents, unsubscribeAll, EventData } from './somnia-streams';
import { getAllProjects, batchUpdateProjectVolumes, recalculateRankings, Project } from './supabase';
import { recordWalletInteraction, cleanupOldWallets } from './wallet-storage';

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

  // Run cleanup and update Supabase every 1 hour
  setInterval(async () => {
    await runCleanupAndUpdate();
  }, 60 * 60 * 1000); // 1 hour

  // Run initial cleanup after 1 minute (to let things settle)
  setTimeout(async () => {
    await runCleanupAndUpdate();
  }, 60 * 1000); // 1 minute
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
}

/**
 * Run cleanup (remove wallets older than 24h) and update Supabase
 * This runs every 1 hour
 */
async function runCleanupAndUpdate(): Promise<void> {
  try {
    console.log('\n🧹 Running cleanup and updating Supabase...');
    
    // Clean up old wallets and get updated counts
    const updates = await cleanupOldWallets();
    
    if (updates.length === 0) {
      console.log('   No projects to update');
      return;
    }

    console.log(`   Found ${updates.length} project(s) to update`);

    // Batch update Supabase with new counts
    await batchUpdateProjectVolumes(updates);

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

