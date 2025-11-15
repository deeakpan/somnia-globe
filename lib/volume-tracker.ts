/**
 * Volume Tracker
 * 
 * Manages real-time volume tracking for all projects
 * Subscribes to events, tracks unique wallets, and updates rankings
 */

import { subscribeToProjectEvents, unsubscribeAll, EventData } from './somnia-streams';
import { getAllProjects, updateProjectVolume, recalculateRankings, Project } from './supabase';

// Track unique wallets per project (in-memory cache)
// In production, you'd want to persist this in a database table
const uniqueWalletsCache = new Map<string, Set<string>>();

/**
 * Initialize volume tracking for all projects
 */
export async function initializeVolumeTracking(): Promise<void> {
  console.log('Initializing volume tracking...');

  // Load existing unique wallets from database (if you have a wallet_tracking table)
  // For now, we'll start fresh on each restart
  
  const projects = await getAllProjects();
  
  console.log(`Found ${projects.length} projects to track`);

  // Subscribe to events for each project
  for (const project of projects) {
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
      console.log(`Subscribed to events for project: ${project.project_name}`);
    } catch (error) {
      console.error(`Failed to subscribe to project ${project.id}:`, error);
    }
  }

  console.log('Volume tracking initialized');
}

/**
 * Handle incoming event from a project
 */
async function handleProjectEvent(event: EventData): Promise<void> {
  const projectId = event.projectId;
  const walletAddress = event.walletAddress;

  // Update volume in database (uses JSONB array)
  const wasNewWallet = await updateProjectVolume(projectId, walletAddress);
  
  if (wasNewWallet) {
    // Update cache
    if (!uniqueWalletsCache.has(projectId)) {
      uniqueWalletsCache.set(projectId, new Set());
    }
    uniqueWalletsCache.get(projectId)!.add(walletAddress);
    
    // Recalculate rankings periodically (debounce this in production)
    await debouncedRecalculateRankings();
    
    console.log(`New wallet detected for project ${projectId}: ${walletAddress}`);
  }
}

// Debounce ranking recalculation to avoid too many DB updates
let recalculationTimeout: NodeJS.Timeout | null = null;
const RECALCULATION_DELAY = 5000; // 5 seconds

async function debouncedRecalculateRankings() {
  if (recalculationTimeout) {
    clearTimeout(recalculationTimeout);
  }

  recalculationTimeout = setTimeout(async () => {
    try {
      await recalculateRankings();
      console.log('Rankings recalculated');
    } catch (error) {
      console.error('Error recalculating rankings:', error);
    }
  }, RECALCULATION_DELAY);
}

/**
 * Stop all volume tracking
 */
export function stopVolumeTracking() {
  unsubscribeAll();
  uniqueWalletsCache.clear();
  if (recalculationTimeout) {
    clearTimeout(recalculationTimeout);
  }
}

/**
 * Get current unique wallet count for a project (from cache)
 */
export function getCachedUniqueWalletCount(projectId: string): number {
  return uniqueWalletsCache.get(projectId)?.size || 0;
}

