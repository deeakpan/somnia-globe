-- User Notification Preferences Table
-- Stores user-specific notification settings per project

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- User identifier (can be email, wallet address, or UUID)
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  percentage_threshold DECIMAL(5,2) NOT NULL DEFAULT 5.00, -- Percentage change required to trigger notification (e.g., 5.00 = 5%)
  enabled BOOLEAN DEFAULT true,
  last_notified_volume INTEGER DEFAULT 0, -- Last volume when notification was sent (to calculate percentage change)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, project_id) -- One preference per user per project
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_project_id ON user_notification_preferences(project_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_enabled ON user_notification_preferences(enabled) WHERE enabled = true;

-- Updated push_subscriptions table to link to user preferences
-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'push_subscriptions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE push_subscriptions ADD COLUMN user_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
  END IF;
END $$;

-- Add updated_at trigger for user_notification_preferences
CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

