-- Analytics and metrics database schema

-- Email statistics table for tracking inbox metrics over time
CREATE TABLE email_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Basic counts
  total_emails INTEGER NOT NULL DEFAULT 0,
  unread_emails INTEGER NOT NULL DEFAULT 0,
  inbox_emails INTEGER NOT NULL DEFAULT 0,
  sent_emails INTEGER NOT NULL DEFAULT 0,
  draft_emails INTEGER NOT NULL DEFAULT 0,
  spam_emails INTEGER NOT NULL DEFAULT 0,
  
  -- Category breakdowns
  promotional_emails INTEGER NOT NULL DEFAULT 0,
  social_emails INTEGER NOT NULL DEFAULT 0,
  updates_emails INTEGER NOT NULL DEFAULT 0,
  forums_emails INTEGER NOT NULL DEFAULT 0,
  
  -- Size metrics (in bytes)
  total_size BIGINT NOT NULL DEFAULT 0,
  largest_email_size BIGINT NOT NULL DEFAULT 0,
  average_email_size BIGINT NOT NULL DEFAULT 0,
  
  -- Age metrics (in days)
  oldest_email_age INTEGER NOT NULL DEFAULT 0,
  newest_email_age INTEGER NOT NULL DEFAULT 0,
  
  -- Attachment metrics
  emails_with_attachments INTEGER NOT NULL DEFAULT 0,
  total_attachment_size BIGINT NOT NULL DEFAULT 0,
  
  -- Thread metrics
  total_threads INTEGER NOT NULL DEFAULT 0,
  longest_thread_length INTEGER NOT NULL DEFAULT 0,
  
  UNIQUE(user_id, recorded_at)
);

-- Cleanup metrics to track the effectiveness of cleaning operations
CREATE TABLE cleanup_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Operations performed
  emails_archived INTEGER NOT NULL DEFAULT 0,
  emails_deleted INTEGER NOT NULL DEFAULT 0,
  emails_labeled INTEGER NOT NULL DEFAULT 0,
  emails_marked_read INTEGER NOT NULL DEFAULT 0,
  unsubscribe_attempts INTEGER NOT NULL DEFAULT 0,
  successful_unsubscribes INTEGER NOT NULL DEFAULT 0,
  
  -- Rules executed
  rules_executed INTEGER NOT NULL DEFAULT 0,
  emails_processed_by_rules INTEGER NOT NULL DEFAULT 0,
  
  -- Space saved (in bytes)
  space_freed BIGINT NOT NULL DEFAULT 0,
  attachments_removed_size BIGINT NOT NULL DEFAULT 0,
  
  -- Time saved estimates (in minutes)
  estimated_time_saved INTEGER NOT NULL DEFAULT 0,
  
  -- User efficiency metrics
  manual_operations INTEGER NOT NULL DEFAULT 0,
  automated_operations INTEGER NOT NULL DEFAULT 0,
  
  UNIQUE(user_id, recorded_at)
);

-- Top domains and senders analytics
CREATE TABLE sender_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  domain VARCHAR NOT NULL,
  sender_email VARCHAR NOT NULL,
  
  -- Email counts
  total_emails INTEGER NOT NULL DEFAULT 0,
  unread_emails INTEGER NOT NULL DEFAULT 0,
  
  -- Size metrics
  total_size BIGINT NOT NULL DEFAULT 0,
  average_size BIGINT NOT NULL DEFAULT 0,
  
  -- Actions taken
  emails_archived INTEGER NOT NULL DEFAULT 0,
  emails_deleted INTEGER NOT NULL DEFAULT 0,
  unsubscribe_attempts INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  first_email_date TIMESTAMP WITH TIME ZONE,
  last_email_date TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, sender_email)
);

-- Email activity patterns for insights
CREATE TABLE activity_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  recorded_date DATE NOT NULL,
  
  -- Hourly activity (24 integers for each hour)
  hourly_email_count JSONB NOT NULL DEFAULT '[]',
  hourly_cleanup_count JSONB NOT NULL DEFAULT '[]',
  
  -- Daily totals
  emails_received INTEGER NOT NULL DEFAULT 0,
  cleanup_operations INTEGER NOT NULL DEFAULT 0,
  time_spent_minutes INTEGER NOT NULL DEFAULT 0,
  
  -- Peak activity
  peak_hour INTEGER, -- 0-23
  peak_email_count INTEGER NOT NULL DEFAULT 0,
  
  UNIQUE(user_id, recorded_date)
);

-- Indexes for better query performance
CREATE INDEX idx_email_stats_user_date ON email_stats(user_id, recorded_at DESC);
CREATE INDEX idx_cleanup_metrics_user_date ON cleanup_metrics(user_id, recorded_at DESC);
CREATE INDEX idx_sender_analytics_user_domain ON sender_analytics(user_id, domain);
CREATE INDEX idx_sender_analytics_total_emails ON sender_analytics(user_id, total_emails DESC);
CREATE INDEX idx_activity_patterns_user_date ON activity_patterns(user_id, recorded_date DESC);

-- RLS Policies
ALTER TABLE email_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanup_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sender_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_patterns ENABLE ROW LEVEL SECURITY;

-- Users can only access their own analytics data
CREATE POLICY "Users can access own email stats" ON email_stats
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own cleanup metrics" ON cleanup_metrics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own sender analytics" ON sender_analytics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own activity patterns" ON activity_patterns
  FOR ALL USING (auth.uid() = user_id);