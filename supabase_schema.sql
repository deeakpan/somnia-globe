-- Supabase Projects Table Schema
-- This table stores dApp project registrations and their real-time volume data

CREATE TABLE IF NOT EXISTS projects (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Project identification
  project_name TEXT NOT NULL,
  contract_address TEXT NOT NULL UNIQUE, -- Ethereum address format
  category TEXT NOT NULL, -- e.g., 'defi', 'gaming', 'nft', 'social', 'infrastructure', etc.
  
  -- Smart contract data
  abi JSONB NOT NULL, -- Contract ABI stored as JSON
  event_signatures JSONB, -- Array of event signatures to monitor (extracted from ABI)
  
  -- Project metadata
  description TEXT,
  socials JSONB, -- { twitter?: string, discord?: string, website?: string, github?: string }
  
  -- Volume tracking (real-time)
  unique_wallets INTEGER DEFAULT 0, -- Count of unique wallet addresses that interacted
  wallet_addresses JSONB DEFAULT '[]'::jsonb, -- Array of unique wallet addresses (for deduplication)
  total_transactions INTEGER DEFAULT 0, -- Total transaction count
  last_interaction_at TIMESTAMPTZ, -- Last time any interaction occurred
  
  -- Ranking and country assignment
  ranking INTEGER, -- 1-194, NULL if not in top 194
  country_iso TEXT, -- ISO 3166-1 alpha-2 code (e.g., 'RU', 'CA', 'US')
  
  -- Initial registration data (from RPC, last 24 hours)
  initial_volume INTEGER DEFAULT 0, -- Volume at registration (last 24h from RPC)
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_contract_address ON projects(contract_address);
CREATE INDEX IF NOT EXISTS idx_projects_ranking ON projects(ranking) WHERE ranking IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_country_iso ON projects(country_iso) WHERE country_iso IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_unique_wallets ON projects(unique_wallets DESC);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_wallet_addresses ON projects USING GIN (wallet_addresses);

-- Index for querying top 194 projects
CREATE INDEX IF NOT EXISTS idx_projects_top_194 ON projects(unique_wallets DESC, ranking) 
  WHERE ranking IS NOT NULL AND ranking <= 194;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: RLS (Row Level Security) policies
-- Uncomment and adjust based on your security requirements

-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access
-- CREATE POLICY "Public read access" ON projects
--   FOR SELECT
--   USING (true);

-- Policy: Allow authenticated users to insert (for registration)
-- CREATE POLICY "Authenticated users can insert" ON projects
--   FOR INSERT
--   WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only service role can update (for volume/ranking updates)
-- CREATE POLICY "Service role can update" ON projects
--   FOR UPDATE
--   USING (auth.role() = 'service_role');

-- Comments for documentation
COMMENT ON TABLE projects IS 'Stores dApp project registrations with contract data and real-time volume metrics';
COMMENT ON COLUMN projects.contract_address IS 'Ethereum address of the smart contract (0x...)';
COMMENT ON COLUMN projects.abi IS 'Contract ABI as JSON array';
COMMENT ON COLUMN projects.event_signatures IS 'Array of event signatures to monitor via Somnia Data Streams';
COMMENT ON COLUMN projects.category IS 'Project category determining map color (defi, gaming, nft, etc.)';
COMMENT ON COLUMN projects.unique_wallets IS 'Count of unique wallet addresses that interacted with the contract';
COMMENT ON COLUMN projects.ranking IS 'Volume-based ranking (1-194), NULL if not in top 194';
COMMENT ON COLUMN projects.country_iso IS 'Assigned country ISO code based on ranking (biggest country = rank 1)';
COMMENT ON COLUMN projects.initial_volume IS 'Unique wallets count from last 24h at registration (from RPC)';

