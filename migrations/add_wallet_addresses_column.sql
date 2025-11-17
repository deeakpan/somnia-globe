-- Migration: Add wallet_addresses column to projects table
-- This column stores an array of unique wallet addresses that have interacted with each project

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS wallet_addresses JSONB DEFAULT '[]'::jsonb;

-- Add index for JSONB queries (optional, but can help with performance)
CREATE INDEX IF NOT EXISTS idx_projects_wallet_addresses ON projects USING GIN (wallet_addresses);

-- Comment for documentation
COMMENT ON COLUMN projects.wallet_addresses IS 'Array of unique wallet addresses that have interacted with this project (stored as JSONB)';

