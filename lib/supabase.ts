/**
 * Supabase Client and Database Operations
 * 
 * Handles all database operations for projects, volume tracking, and rankings
 */

import { createClient } from '@supabase/supabase-js';
import { getCountryForRanking } from './countries';

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  // Re-read env vars in case they were loaded after module initialization
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  // Check if we have actual values (not empty strings)
  const hasUrl = url && url.trim().length > 0 && url.includes('supabase.co');
  const hasKey = key && key.trim().length > 0 && key.length > 20; // Anon keys are usually long
  
  return hasUrl && hasKey;
}

// Lazy initialization - create client only when first accessed
// This ensures env vars are loaded (via dotenv) before client creation
let _supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient(): ReturnType<typeof createClient> {
  if (!_supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    _supabaseClient = createClient(
      url || 'https://placeholder.supabase.co',
      key || 'placeholder-key'
    );
  }
  return _supabaseClient;
}

// Export client with lazy initialization
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
}) as ReturnType<typeof createClient>;

export interface Project {
  id: string;
  project_name: string;
  contract_address: string;
  category: string;
  abi: any;
  event_signatures?: string[];
  description?: string;
  socials?: {
    twitter?: string;
    discord?: string;
    website?: string;
    github?: string;
  };
  unique_wallets: number;
  wallet_addresses?: string[] | null;
  total_transactions: number;
  last_interaction_at?: string;
  ranking?: number;
  country_iso?: string;
  initial_volume: number;
  registered_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all projects from database
 */
export async function getAllProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured()) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL || 'NOT SET';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET';
    throw new Error(`Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_PROJECT_URL) and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file. Current: URL=${url}, KEY=${key}`);
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('unique_wallets', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single project by contract address
 */
export async function getProjectByContractAddress(
  contractAddress: string
): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('contract_address', contractAddress.toLowerCase())
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching project:', error);
    throw error;
  }

  return data;
}

/**
 * Update project volume (unique wallets and transactions)
 * This is called when a new event is detected
 */
export async function updateProjectVolume(
  projectId: string,
  walletAddress: string
): Promise<boolean> {
  const normalizedAddress = walletAddress.toLowerCase();
  
  // Fetch current wallet_addresses JSONB array
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('wallet_addresses')
    .eq('id', projectId)
    .single();

  if (fetchError) {
    console.error('Error fetching project:', fetchError);
    throw fetchError;
  }

  // Check and update in JavaScript
  const wallets = (project.wallet_addresses as string[]) || [];
  const isNewWallet = !wallets.includes(normalizedAddress);

  if (isNewWallet) {
    wallets.push(normalizedAddress);
  }

  // Update JSONB column directly
  const { error: updateError } = await supabase
    .from('projects')
    .update({
      wallet_addresses: wallets,
      unique_wallets: wallets.length,
      total_transactions: supabase.raw('total_transactions + 1'),
      last_interaction_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (updateError) {
    console.error('Error updating project volume:', updateError);
    throw updateError;
  }

  return isNewWallet;
}

/**
 * Recalculate rankings and assign countries to top 194 projects
 * This should be called periodically or after volume updates
 */
export async function recalculateRankings(): Promise<void> {
  // Get all projects sorted by unique_wallets
  const projects = await getAllProjects();

  // Sort by volume (unique_wallets) descending
  const sortedProjects = projects.sort((a, b) => b.unique_wallets - a.unique_wallets);

  // Update rankings and country assignments
  const updates = sortedProjects.map((project, index) => {
    const ranking = index + 1;
    const country = ranking <= 194 ? getCountryForRanking(ranking) : null;

    return supabase
      .from('projects')
      .update({
        ranking: ranking <= 194 ? ranking : null,
        country_iso: country?.iso || null,
      })
      .eq('id', project.id);
  });

  await Promise.all(updates);
}

/**
 * Register a new project
 */
export async function registerProject(
  projectData: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'unique_wallets' | 'total_transactions' | 'ranking' | 'country_iso' | 'initial_volume' | 'registered_at'>
): Promise<Project> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_PROJECT_URL) and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file');
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      ...projectData,
      contract_address: projectData.contract_address.toLowerCase(),
      unique_wallets: 0,
      total_transactions: 0,
      initial_volume: 0, // Will be set from RPC data
      registered_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error registering project:', error);
    throw error;
  }

  return data;
}

/**
 * Get top 194 projects (for map display)
 */
export async function getTop194Projects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .not('ranking', 'is', null)
    .order('ranking', { ascending: true })
    .limit(194);

  if (error) {
    console.error('Error fetching top 194 projects:', error);
    throw error;
  }

  return data || [];
}

