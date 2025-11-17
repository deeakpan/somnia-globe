/**
 * Wallet Storage
 * 
 * Manages wallet tracking data in a JSON file with safe locking and atomic writes
 * Prevents corruption from concurrent access and crashes
 */

import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'wallet-tracking.json');
const LOCK_FILE = DATA_FILE + '.lock';

interface WalletData {
  [walletAddress: string]: string; // timestamp ISO string
}

interface ProjectData {
  wallets: WalletData;
  total_transactions: number;
  last_interaction_at: string;
}

interface TrackingData {
  [projectId: string]: ProjectData;
}

// In-memory lock (prevents concurrent access in same process)
let fileLock = false;
let lockWaiters: Array<() => void> = [];

/**
 * Wait for file lock to be released
 */
async function waitForLock(): Promise<void> {
  if (!fileLock) {
    fileLock = true;
    return;
  }

  // Wait for lock to be released
  return new Promise((resolve) => {
    lockWaiters.push(resolve);
  });
}

/**
 * Release file lock and notify waiters
 */
function releaseLock(): void {
  fileLock = false;
  if (lockWaiters.length > 0) {
    const next = lockWaiters.shift();
    if (next) {
      fileLock = true;
      next();
    }
  }
}

/**
 * Check if lock file is stale (process crashed)
 */
async function isLockStale(): Promise<boolean> {
  try {
    const stats = await fs.stat(LOCK_FILE);
    const age = Date.now() - stats.mtimeMs;
    // If lock is older than 30 seconds, consider it stale
    return age > 30000;
  } catch {
    return false; // Lock file doesn't exist
  }
}

/**
 * Acquire file lock (with stale lock detection)
 */
async function acquireLock(): Promise<void> {
  // Ensure data directory exists first
  await ensureDataDir();

  // Wait for in-memory lock
  await waitForLock();

  // Check for stale lock file
  if (existsSync(LOCK_FILE)) {
    if (await isLockStale()) {
      console.warn('⚠️  Removing stale lock file');
      try {
        await fs.unlink(LOCK_FILE);
      } catch {
        // Ignore errors
      }
    } else {
      // Lock is active, wait a bit and retry
      releaseLock();
      await new Promise(resolve => setTimeout(resolve, 100));
      return acquireLock();
    }
  }

  // Create lock file
  try {
    await fs.writeFile(LOCK_FILE, process.pid.toString(), { flag: 'wx' });
  } catch (error: any) {
    if (error.code === 'EEXIST') {
      // Lock file exists, wait and retry
      releaseLock();
      await new Promise(resolve => setTimeout(resolve, 100));
      return acquireLock();
    }
    throw error;
  }
}

/**
 * Release file lock
 */
async function releaseFileLock(): Promise<void> {
  try {
    if (existsSync(LOCK_FILE)) {
      await fs.unlink(LOCK_FILE);
    }
  } catch {
    // Ignore errors
  }
  releaseLock();
}

/**
 * Execute function with file lock
 */
async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  await acquireLock();
  try {
    return await fn();
  } finally {
    await releaseFileLock();
  }
}

/**
 * Ensure data directory exists
 */
async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory might already exist
  }
}

/**
 * Load tracking data from JSON file
 */
async function loadData(): Promise<TrackingData> {
  await ensureDataDir();
  
  try {
    const content = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty data
      return {};
    }
    throw error;
  }
}

/**
 * Save tracking data to JSON file (atomic write)
 */
async function saveData(data: TrackingData): Promise<void> {
  await ensureDataDir();
  
  const tempFile = DATA_FILE + '.tmp';
  const json = JSON.stringify(data, null, 2);
  
  // Write to temp file first
  await fs.writeFile(tempFile, json, 'utf-8');
  
  // Atomic rename (all-or-nothing)
  await fs.rename(tempFile, DATA_FILE);
}

/**
 * Get or create project data
 */
function getProjectData(data: TrackingData, projectId: string): ProjectData {
  if (!data[projectId]) {
    data[projectId] = {
      wallets: {},
      total_transactions: 0,
      last_interaction_at: new Date().toISOString(),
    };
  }
  return data[projectId];
}

/**
 * Record a wallet interaction (adds wallet if new, always increments transactions)
 */
export async function recordWalletInteraction(
  projectId: string,
  walletAddress: string
): Promise<{ isNewWallet: boolean; uniqueWallets: number; totalTransactions: number }> {
  return withLock(async () => {
    const data = await loadData();
    const project = getProjectData(data, projectId);
    const normalizedAddress = walletAddress.toLowerCase();
    const now = new Date().toISOString();

    // Check if wallet is new
    const isNewWallet = !project.wallets[normalizedAddress];

    // Add wallet with timestamp (if new) or update timestamp
    project.wallets[normalizedAddress] = now;

    // Always increment transaction count
    project.total_transactions += 1;
    project.last_interaction_at = now;

    // Save data
    await saveData(data);

    return {
      isNewWallet,
      uniqueWallets: Object.keys(project.wallets).length,
      totalTransactions: project.total_transactions,
    };
  });
}

/**
 * Clean up wallets older than 24 hours and return updated counts
 */
export async function cleanupOldWallets(): Promise<{
  updates: Array<{ projectId: string; uniqueWallets: number; totalTransactions: number; lastInteractionAt: string }>;
  totalRemoved: number;
  projectsCleaned: number;
}> {
  return withLock(async () => {
    const data = await loadData();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
    const updates: Array<{ projectId: string; uniqueWallets: number; totalTransactions: number; lastInteractionAt: string }> = [];
    let totalRemoved = 0;
    let projectsCleaned = 0;

    for (const projectId in data) {
      const project = data[projectId];
      const wallets = project.wallets;
      let removedCount = 0;
      const beforeCount = Object.keys(wallets).length;

      // Remove wallets older than 24 hours
      for (const wallet in wallets) {
        const timestamp = new Date(wallets[wallet]).getTime();
        if (timestamp < cutoff) {
          delete wallets[wallet];
          removedCount++;
        }
      }

      // Only update if we removed wallets (something was cleaned)
      if (removedCount > 0) {
        projectsCleaned++;
        totalRemoved += removedCount;
        updates.push({
          projectId,
          uniqueWallets: Object.keys(wallets).length,
          totalTransactions: project.total_transactions,
          lastInteractionAt: project.last_interaction_at,
        });
      }
    }

    // Save cleaned data (only if something was removed)
    if (totalRemoved > 0) {
      await saveData(data);
    }

    return {
      updates,
      totalRemoved,
      projectsCleaned,
    };
  });
}

/**
 * Get current stats for a project (without lock, for read-only access)
 */
export async function getProjectStats(projectId: string): Promise<{
  uniqueWallets: number;
  totalTransactions: number;
  lastInteractionAt: string | null;
} | null> {
  return withLock(async () => {
    const data = await loadData();
    const project = data[projectId];
    
    if (!project) {
      return null;
    }

    return {
      uniqueWallets: Object.keys(project.wallets).length,
      totalTransactions: project.total_transactions,
      lastInteractionAt: project.last_interaction_at || null,
    };
  });
}

