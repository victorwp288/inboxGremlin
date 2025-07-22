-- Operation History Table
-- Tracks all bulk operations for undo functionality
CREATE TABLE IF NOT EXISTS operation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type VARCHAR(50) NOT NULL, -- 'archive', 'delete', 'label', 'mark_read', etc.
  affected_emails JSONB NOT NULL, -- Array of email IDs and metadata before operation
  operation_details JSONB NOT NULL, -- Details about the operation (labels added, etc.)
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  can_undo BOOLEAN DEFAULT true,
  undone_at TIMESTAMP WITH TIME ZONE NULL,
  undo_operation_id UUID NULL REFERENCES operation_history(id)
);

-- User Rules Table
-- Stores custom rules created by users
CREATE TABLE IF NOT EXISTS user_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  conditions JSONB NOT NULL, -- Rule conditions (sender, subject, etc.)
  actions JSONB NOT NULL, -- Rule actions (archive, label, etc.)
  is_active BOOLEAN DEFAULT true,
  schedule JSONB NULL, -- Scheduling configuration (cron-like)
  priority INTEGER DEFAULT 0, -- Rule execution priority
  last_executed_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rule Executions Table
-- Tracks when rules are executed and their results
CREATE TABLE IF NOT EXISTS rule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES user_rules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emails_processed INTEGER DEFAULT 0,
  emails_affected INTEGER DEFAULT 0,
  execution_details JSONB NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN DEFAULT true,
  error_message TEXT NULL
);

-- User Preferences Table
-- Stores user-specific settings and preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cleanup_strategy JSONB DEFAULT '{
    "auto_archive_days": 30,
    "auto_delete_spam": false,
    "newsletter_retention_days": 14,
    "promotional_retention_days": 7
  }'::jsonb,
  custom_categories JSONB DEFAULT '[]'::jsonb,
  notification_settings JSONB DEFAULT '{
    "email_notifications": true,
    "cleanup_summaries": true,
    "rule_execution_alerts": false
  }'::jsonb,
  advanced_features JSONB DEFAULT '{
    "enable_ai_suggestions": true,
    "auto_unsubscribe": false,
    "backup_before_cleanup": true
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unsubscribe History Table
-- Tracks unsubscribe attempts and their results
CREATE TABLE IF NOT EXISTS unsubscribe_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_id VARCHAR(255) NOT NULL, -- Gmail message ID
  sender_email VARCHAR(255) NOT NULL,
  sender_domain VARCHAR(255) NOT NULL,
  unsubscribe_url TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN NULL, -- NULL if pending, true/false when completed
  response_details JSONB NULL,
  method VARCHAR(50) DEFAULT 'link' -- 'link', 'mailto', 'list-unsubscribe'
);

-- Saved Searches Table
-- Stores user-created search queries for quick access
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  query TEXT NOT NULL, -- Gmail search query string
  conditions JSONB DEFAULT '[]'::jsonb, -- Query builder conditions
  use_count INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name) -- Each user can have uniquely named searches
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_operation_history_user_id ON operation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_history_timestamp ON operation_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_operation_history_can_undo ON operation_history(can_undo) WHERE can_undo = true;

CREATE INDEX IF NOT EXISTS idx_user_rules_user_id ON user_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rules_active ON user_rules(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_rule_executions_rule_id ON rule_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_executions_user_id ON rule_executions(user_id);

CREATE INDEX IF NOT EXISTS idx_unsubscribe_history_user_id ON unsubscribe_history(user_id);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_history_sender_domain ON unsubscribe_history(sender_domain);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_use_count ON saved_searches(use_count DESC);
CREATE INDEX IF NOT EXISTS idx_saved_searches_name ON saved_searches(user_id, name);

-- RLS Policies
ALTER TABLE operation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE unsubscribe_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Operation History Policies
CREATE POLICY "Users can view their own operation history" ON operation_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own operation history" ON operation_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own operation history" ON operation_history
  FOR UPDATE USING (auth.uid() = user_id);

-- User Rules Policies
CREATE POLICY "Users can manage their own rules" ON user_rules
  FOR ALL USING (auth.uid() = user_id);

-- Rule Executions Policies
CREATE POLICY "Users can view their own rule executions" ON rule_executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rule executions" ON rule_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Preferences Policies
CREATE POLICY "Users can manage their own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Unsubscribe History Policies
CREATE POLICY "Users can manage their own unsubscribe history" ON unsubscribe_history
  FOR ALL USING (auth.uid() = user_id);

-- Saved Searches Policies
CREATE POLICY "Users can manage their own saved searches" ON saved_searches
  FOR ALL USING (auth.uid() = user_id);