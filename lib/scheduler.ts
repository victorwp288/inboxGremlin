import { createClient } from '@/lib/supabase/server';
import { RulesEngine } from '@/lib/rules-engine';
import { AnalyticsService } from '@/lib/analytics';
import { UnsubscribeDetector } from '@/lib/unsubscribe-detector';
import { GmailEnhancedService } from '@/lib/gmail/enhanced-service';
import { UserPreferencesService } from '@/lib/user-preferences';

export interface ScheduledJob {
  id: string;
  user_id: string;
  job_type: 'cleanup' | 'rule_execution' | 'analytics_collection' | 'unsubscribe_scan';
  job_name: string;
  schedule_expression: string; // Cron expression
  job_config: Record<string, any>;
  is_active: boolean;
  next_run_at?: string;
  last_run_at?: string;
  last_run_status?: 'success' | 'failed' | 'running';
  last_run_message?: string;
  created_at: string;
  updated_at: string;
}

export interface JobExecution {
  id: string;
  job_id: string;
  user_id: string;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'success' | 'failed';
  result?: Record<string, any>;
  error_message?: string;
  execution_time_ms?: number;
}

export interface JobResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
  processedCount?: number;
  errors?: string[];
}

export class SchedulerService {
  private supabase = createClient();
  private rulesEngine = new RulesEngine();
  private analyticsService = new AnalyticsService();
  private unsubscribeDetector = new UnsubscribeDetector();
  private preferencesService = new UserPreferencesService();

  /**
   * Create a new scheduled job
   */
  async createScheduledJob(
    userId: string,
    jobType: ScheduledJob['job_type'],
    jobName: string,
    scheduleExpression: string,
    jobConfig: Record<string, any>
  ): Promise<ScheduledJob> {
    try {
      const nextRunAt = this.calculateNextRun(scheduleExpression);
      
      const { data, error } = await this.supabase
        .from('scheduled_jobs')
        .insert({
          user_id: userId,
          job_type: jobType,
          job_name: jobName,
          schedule_expression: scheduleExpression,
          job_config: jobConfig,
          is_active: true,
          next_run_at: nextRunAt,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating scheduled job:', error);
      throw error;
    }
  }

  /**
   * Get all scheduled jobs for a user
   */
  async getUserJobs(userId: string): Promise<ScheduledJob[]> {
    try {
      const { data, error } = await this.supabase
        .from('scheduled_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user jobs:', error);
      throw error;
    }
  }

  /**
   * Update a scheduled job
   */
  async updateScheduledJob(
    jobId: string,
    updates: Partial<Pick<ScheduledJob, 'job_name' | 'schedule_expression' | 'job_config' | 'is_active'>>
  ): Promise<ScheduledJob> {
    try {
      const updateData: any = { ...updates };
      
      if (updates.schedule_expression) {
        updateData.next_run_at = this.calculateNextRun(updates.schedule_expression);
      }
      
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await this.supabase
        .from('scheduled_jobs')
        .update(updateData)
        .eq('id', jobId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating scheduled job:', error);
      throw error;
    }
  }

  /**
   * Delete a scheduled job
   */
  async deleteScheduledJob(jobId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('scheduled_jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting scheduled job:', error);
      throw error;
    }
  }

  /**
   * Execute a job manually
   */
  async executeJobManually(jobId: string, accessToken: string): Promise<JobResult> {
    try {
      const { data: job, error } = await this.supabase
        .from('scheduled_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      if (!job) throw new Error('Job not found');

      return await this.executeJob(job, accessToken);
    } catch (error) {
      console.error('Error executing job manually:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get jobs ready to run
   */
  async getJobsToRun(): Promise<ScheduledJob[]> {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await this.supabase
        .from('scheduled_jobs')
        .select('*')
        .eq('is_active', true)
        .lte('next_run_at', now)
        .neq('last_run_status', 'running');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching jobs to run:', error);
      return [];
    }
  }

  /**
   * Process scheduled jobs (to be called by a background worker)
   */
  async processScheduledJobs(): Promise<void> {
    try {
      const jobs = await this.getJobsToRun();
      
      for (const job of jobs) {
        try {
          // Get user's access token
          const { data: session } = await this.supabase.auth.getSession();
          const accessToken = session?.session?.provider_token;
          
          if (!accessToken) {
            console.warn(`No access token for job ${job.id}, skipping`);
            continue;
          }

          await this.executeJob(job, accessToken);
        } catch (error) {
          console.error(`Error executing job ${job.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing scheduled jobs:', error);
    }
  }

  /**
   * Get job execution history
   */
  async getJobExecutions(jobId: string, limit: number = 50): Promise<JobExecution[]> {
    try {
      const { data, error } = await this.supabase
        .from('job_executions')
        .select('*')
        .eq('job_id', jobId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching job executions:', error);
      return [];
    }
  }

  /**
   * Get execution statistics for a job
   */
  async getJobStats(jobId: string): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    lastExecution?: JobExecution;
  }> {
    try {
      const executions = await this.getJobExecutions(jobId, 100);
      
      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter(e => e.status === 'success').length;
      const failedExecutions = executions.filter(e => e.status === 'failed').length;
      
      const completedExecutions = executions.filter(e => e.execution_time_ms !== null);
      const averageExecutionTime = completedExecutions.length > 0
        ? completedExecutions.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / completedExecutions.length
        : 0;

      return {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        averageExecutionTime,
        lastExecution: executions[0],
      };
    } catch (error) {
      console.error('Error fetching job stats:', error);
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
      };
    }
  }

  /**
   * Execute a specific job
   */
  private async executeJob(job: ScheduledJob, accessToken: string): Promise<JobResult> {
    const startTime = Date.now();
    
    // Record job execution start
    const { data: execution, error: executionError } = await this.supabase
      .from('job_executions')
      .insert({
        job_id: job.id,
        user_id: job.user_id,
        started_at: new Date().toISOString(),
        status: 'running',
      })
      .select()
      .single();

    if (executionError) {
      console.error('Error creating job execution record:', executionError);
    }

    try {
      // Mark job as running
      await this.supabase
        .from('scheduled_jobs')
        .update({ last_run_status: 'running' })
        .eq('id', job.id);

      let result: JobResult;

      switch (job.job_type) {
        case 'cleanup':
          result = await this.executeCleanupJob(job, accessToken);
          break;
        case 'rule_execution':
          result = await this.executeRuleJob(job, accessToken);
          break;
        case 'analytics_collection':
          result = await this.executeAnalyticsJob(job, accessToken);
          break;
        case 'unsubscribe_scan':
          result = await this.executeUnsubscribeJob(job, accessToken);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }

      const executionTime = Date.now() - startTime;
      const nextRunAt = this.calculateNextRun(job.schedule_expression);

      // Update job status
      await this.supabase
        .from('scheduled_jobs')
        .update({
          last_run_at: new Date().toISOString(),
          last_run_status: 'success',
          last_run_message: result.message,
          next_run_at: nextRunAt,
        })
        .eq('id', job.id);

      // Update execution record
      if (execution) {
        await this.supabase
          .from('job_executions')
          .update({
            completed_at: new Date().toISOString(),
            status: 'success',
            result: result.details,
            execution_time_ms: executionTime,
          })
          .eq('id', execution.id);
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update job status
      await this.supabase
        .from('scheduled_jobs')
        .update({
          last_run_at: new Date().toISOString(),
          last_run_status: 'failed',
          last_run_message: errorMessage,
          next_run_at: this.calculateNextRun(job.schedule_expression),
        })
        .eq('id', job.id);

      // Update execution record
      if (execution) {
        await this.supabase
          .from('job_executions')
          .update({
            completed_at: new Date().toISOString(),
            status: 'failed',
            error_message: errorMessage,
            execution_time_ms: executionTime,
          })
          .eq('id', execution.id);
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Execute cleanup job
   */
  private async executeCleanupJob(job: ScheduledJob, accessToken: string): Promise<JobResult> {
    const config = job.job_config;
    const gmailService = new GmailEnhancedService(accessToken);
    const preferences = await this.preferencesService.getUserPreferences(job.user_id);
    
    let processedCount = 0;
    const errors: string[] = [];

    try {
      // Archive old emails
      if (config.auto_archive && preferences.cleanup_strategy.auto_archive_days) {
        const archiveDays = preferences.cleanup_strategy.auto_archive_days;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - archiveDays);
        
        const query = `in:inbox older_than:${archiveDays}d ${preferences.cleanup_strategy.preserve_starred ? '-is:starred' : ''}`;
        const emails = await gmailService.listEmails({ query, maxResults: 1000 });
        
        if (emails.length > 0) {
          const result = await gmailService.archiveEmailsWithHistory(emails.map(e => e.id));
          processedCount += result.processedCount;
          
          if (!result.success) {
            errors.push(`Archive operation failed: ${result.errors?.join(', ')}`);
          }
        }
      }

      // Delete very old emails
      if (config.auto_delete && preferences.cleanup_strategy.auto_delete_days) {
        const deleteDays = preferences.cleanup_strategy.auto_delete_days;
        const query = `in:trash older_than:${deleteDays}d`;
        const emails = await gmailService.listEmails({ query, maxResults: 1000 });
        
        if (emails.length > 0) {
          const result = await gmailService.deleteEmailsWithHistory(emails.map(e => e.id));
          processedCount += result.processedCount;
          
          if (!result.success) {
            errors.push(`Delete operation failed: ${result.errors?.join(', ')}`);
          }
        }
      }

      return {
        success: errors.length === 0,
        message: `Cleanup completed. Processed ${processedCount} emails.`,
        details: { processedCount, errors },
        processedCount,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        message: `Cleanup job failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Execute rule job
   */
  private async executeRuleJob(job: ScheduledJob, accessToken: string): Promise<JobResult> {
    const config = job.job_config;
    const gmailService = new GmailEnhancedService(accessToken);
    
    try {
      let processedCount = 0;
      const errors: string[] = [];

      if (config.rule_ids && Array.isArray(config.rule_ids)) {
        for (const ruleId of config.rule_ids) {
          try {
            // Get emails for rule execution
            const emails = await gmailService.listEmails({ 
              query: config.email_query || 'in:inbox', 
              maxResults: config.max_emails || 100 
            });

            const result = await this.rulesEngine.executeRuleById(ruleId, emails);
            processedCount += result.affectedEmails.length;
            
            if (!result.success) {
              errors.push(`Rule ${ruleId} failed: ${result.error}`);
            }
          } catch (error) {
            errors.push(`Rule ${ruleId} error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      return {
        success: errors.length === 0,
        message: `Rule execution completed. Processed ${processedCount} emails.`,
        details: { processedCount, errors },
        processedCount,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        message: `Rule execution job failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Execute analytics collection job
   */
  private async executeAnalyticsJob(job: ScheduledJob, accessToken: string): Promise<JobResult> {
    try {
      const stats = await this.analyticsService.collectEmailStats(job.user_id, accessToken);
      
      return {
        success: true,
        message: `Analytics collection completed. Collected stats for ${stats.total_emails} emails.`,
        details: { emailStats: stats },
        processedCount: 1,
      };
    } catch (error) {
      return {
        success: false,
        message: `Analytics collection job failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Execute unsubscribe scan job
   */
  private async executeUnsubscribeJob(job: ScheduledJob, accessToken: string): Promise<JobResult> {
    const config = job.job_config;
    const gmailService = new GmailEnhancedService(accessToken);
    
    try {
      let foundOpportunities = 0;
      const errors: string[] = [];

      const queries = config.queries || [
        'category:promotions',
        'from:noreply OR from:no-reply',
        'unsubscribe'
      ];

      for (const query of queries) {
        try {
          const emails = await gmailService.listEmails({ 
            query, 
            maxResults: config.max_emails_per_query || 50 
          });

          for (const email of emails) {
            const candidate = await this.unsubscribeDetector.detectUnsubscribeOpportunities(
              email.id,
              email.subject,
              email.from,
              email.date,
              email.snippet
            );

            if (candidate) {
              foundOpportunities++;
            }
          }
        } catch (error) {
          errors.push(`Query "${query}" failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        success: errors.length === 0,
        message: `Unsubscribe scan completed. Found ${foundOpportunities} opportunities.`,
        details: { foundOpportunities, errors },
        processedCount: foundOpportunities,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        message: `Unsubscribe scan job failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Calculate next run time based on cron expression
   * Simplified implementation - in production, use a proper cron parser
   */
  private calculateNextRun(cronExpression: string): string {
    const now = new Date();
    
    // Simple schedule parsing (extend with proper cron parser in production)
    switch (cronExpression) {
      case '@daily':
      case '0 0 * * *':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      case '@weekly':
      case '0 0 * * 0':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      case '@hourly':
      case '0 * * * *':
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      default:
        // Default to daily
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }
  }

  /**
   * Validate cron expression
   */
  validateCronExpression(expression: string): boolean {
    const validExpressions = [
      '@daily', '@weekly', '@hourly', '@monthly',
      '0 0 * * *', '0 0 * * 0', '0 * * * *', '0 0 1 * *'
    ];
    
    return validExpressions.includes(expression);
  }

  /**
   * Get human-readable schedule description
   */
  getScheduleDescription(cronExpression: string): string {
    switch (cronExpression) {
      case '@daily':
      case '0 0 * * *':
        return 'Daily at midnight';
      case '@weekly':
      case '0 0 * * 0':
        return 'Weekly on Sunday at midnight';
      case '@hourly':
      case '0 * * * *':
        return 'Every hour';
      case '@monthly':
      case '0 0 1 * *':
        return 'Monthly on the 1st at midnight';
      default:
        return 'Custom schedule';
    }
  }
}