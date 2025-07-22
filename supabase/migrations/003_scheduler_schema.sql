-- Scheduler and automation database schema

-- Scheduled jobs table
CREATE TABLE scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  job_type VARCHAR NOT NULL CHECK (job_type IN ('cleanup', 'rule_execution', 'analytics_collection', 'unsubscribe_scan')),
  job_name VARCHAR NOT NULL,
  schedule_expression VARCHAR NOT NULL, -- Cron expression
  job_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Execution tracking
  next_run_at TIMESTAMP WITH TIME ZONE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  last_run_status VARCHAR CHECK (last_run_status IN ('success', 'failed', 'running')),
  last_run_message TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job execution history table
CREATE TABLE job_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Execution details
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  
  -- Results and errors
  result JSONB,
  error_message TEXT,
  execution_time_ms INTEGER,
  
  -- Additional metadata
  triggered_by VARCHAR DEFAULT 'scheduler' CHECK (triggered_by IN ('scheduler', 'manual', 'api'))
);

-- Background task queue (for future implementation)
CREATE TABLE task_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type VARCHAR NOT NULL,
  task_data JSONB NOT NULL DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 0,
  
  -- Processing status
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  
  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Results
  result JSONB,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User automation settings (extends user_preferences)
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS automation_settings JSONB DEFAULT '{}';

-- Indexes for better performance
CREATE INDEX idx_scheduled_jobs_user_id ON scheduled_jobs(user_id);
CREATE INDEX idx_scheduled_jobs_next_run ON scheduled_jobs(next_run_at) WHERE is_active = true;
CREATE INDEX idx_scheduled_jobs_type ON scheduled_jobs(job_type);

CREATE INDEX idx_job_executions_job_id ON job_executions(job_id);
CREATE INDEX idx_job_executions_user_id ON job_executions(user_id);
CREATE INDEX idx_job_executions_started_at ON job_executions(started_at DESC);
CREATE INDEX idx_job_executions_status ON job_executions(status);

CREATE INDEX idx_task_queue_status ON task_queue(status);
CREATE INDEX idx_task_queue_scheduled_for ON task_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_task_queue_priority ON task_queue(priority DESC);

-- RLS Policies
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_queue ENABLE ROW LEVEL SECURITY;

-- Users can only access their own scheduled jobs
CREATE POLICY "Users can access own scheduled jobs" ON scheduled_jobs
  FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own job executions
CREATE POLICY "Users can access own job executions" ON job_executions
  FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own tasks
CREATE POLICY "Users can access own tasks" ON task_queue
  FOR ALL USING (
    task_data->>'user_id' = auth.uid()::text OR
    task_data->>'userId' = auth.uid()::text
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_scheduled_jobs_updated_at 
  BEFORE UPDATE ON scheduled_jobs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_queue_updated_at 
  BEFORE UPDATE ON task_queue 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old job executions (retain last 100 per job)
CREATE OR REPLACE FUNCTION cleanup_old_job_executions()
RETURNS void AS $$
BEGIN
  DELETE FROM job_executions
  WHERE id IN (
    SELECT id FROM (
      SELECT id, 
             ROW_NUMBER() OVER (PARTITION BY job_id ORDER BY started_at DESC) as rn
      FROM job_executions
    ) ranked
    WHERE rn > 100
  );
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old completed tasks
CREATE OR REPLACE FUNCTION cleanup_old_tasks()
RETURNS void AS $$
BEGIN
  DELETE FROM task_queue 
  WHERE status IN ('completed', 'failed') 
    AND completed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;