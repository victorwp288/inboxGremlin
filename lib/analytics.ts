import { createClient } from '@/lib/supabase/server';
import { GmailEnhancedService } from '@/lib/gmail/enhanced-service';

export interface EmailStats {
  total_emails: number;
  unread_emails: number;
  inbox_emails: number;
  sent_emails: number;
  draft_emails: number;
  spam_emails: number;
  promotional_emails: number;
  social_emails: number;
  updates_emails: number;
  forums_emails: number;
  total_size: number;
  largest_email_size: number;
  average_email_size: number;
  oldest_email_age: number;
  newest_email_age: number;
  emails_with_attachments: number;
  total_attachment_size: number;
  total_threads: number;
  longest_thread_length: number;
}

export interface CleanupMetrics {
  emails_archived: number;
  emails_deleted: number;
  emails_labeled: number;
  emails_marked_read: number;
  unsubscribe_attempts: number;
  successful_unsubscribes: number;
  rules_executed: number;
  emails_processed_by_rules: number;
  space_freed: number;
  attachments_removed_size: number;
  estimated_time_saved: number;
  manual_operations: number;
  automated_operations: number;
}

export interface SenderAnalytics {
  domain: string;
  sender_email: string;
  total_emails: number;
  unread_emails: number;
  total_size: number;
  average_size: number;
  emails_archived: number;
  emails_deleted: number;
  unsubscribe_attempts: number;
  first_email_date?: string;
  last_email_date?: string;
}

export interface ActivityPattern {
  recorded_date: string;
  hourly_email_count: number[];
  hourly_cleanup_count: number[];
  emails_received: number;
  cleanup_operations: number;
  time_spent_minutes: number;
  peak_hour?: number;
  peak_email_count: number;
}

export interface AnalyticsSummary {
  totalEmails: number;
  totalSize: string;
  spaceSaved: string;
  timeSaved: number;
  unsubscribeSuccessRate: number;
  automationEfficiency: number;
  topSenders: SenderAnalytics[];
  categoryDistribution: Record<string, number>;
  weeklyTrend: Array<{ date: string; emails: number; cleanup: number }>;
  monthlyStats: EmailStats[];
}

export class AnalyticsService {
  private supabase = createClient();

  /**
   * Collect current email statistics from Gmail
   */
  async collectEmailStats(userId: string, accessToken: string): Promise<EmailStats> {
    const gmailService = new GmailEnhancedService(accessToken);
    
    try {
      // Get basic email counts by category
      const [
        inboxEmails,
        sentEmails,
        draftEmails,
        spamEmails,
        promotionalEmails,
        socialEmails,
        updatesEmails,
        forumsEmails,
        unreadEmails,
        allEmails
      ] = await Promise.all([
        gmailService.listEmails({ query: 'in:inbox', maxResults: 1000 }),
        gmailService.listEmails({ query: 'in:sent', maxResults: 1000 }),
        gmailService.listEmails({ query: 'in:drafts', maxResults: 1000 }),
        gmailService.listEmails({ query: 'in:spam', maxResults: 1000 }),
        gmailService.listEmails({ query: 'category:promotions', maxResults: 1000 }),
        gmailService.listEmails({ query: 'category:social', maxResults: 1000 }),
        gmailService.listEmails({ query: 'category:updates', maxResults: 1000 }),
        gmailService.listEmails({ query: 'category:forums', maxResults: 1000 }),
        gmailService.listEmails({ query: 'is:unread', maxResults: 1000 }),
        gmailService.listEmails({ query: 'in:all', maxResults: 1000 })
      ]);

      // Calculate size and age metrics
      const sizeCalculations = this.calculateSizeMetrics(allEmails);
      const ageCalculations = this.calculateAgeMetrics(allEmails);
      const attachmentCalculations = this.calculateAttachmentMetrics(allEmails);

      const stats: EmailStats = {
        total_emails: allEmails.length,
        unread_emails: unreadEmails.length,
        inbox_emails: inboxEmails.length,
        sent_emails: sentEmails.length,
        draft_emails: draftEmails.length,
        spam_emails: spamEmails.length,
        promotional_emails: promotionalEmails.length,
        social_emails: socialEmails.length,
        updates_emails: updatesEmails.length,
        forums_emails: forumsEmails.length,
        ...sizeCalculations,
        ...ageCalculations,
        ...attachmentCalculations,
        total_threads: 0, // TODO: Implement thread counting
        longest_thread_length: 0, // TODO: Implement thread analysis
      };

      // Store in database
      await this.storeEmailStats(userId, stats);
      
      return stats;
    } catch (error) {
      console.error('Error collecting email stats:', error);
      throw error;
    }
  }

  /**
   * Record cleanup metrics
   */
  async recordCleanupMetrics(userId: string, metrics: Partial<CleanupMetrics>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('cleanup_metrics')
        .insert({
          user_id: userId,
          ...metrics,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error recording cleanup metrics:', error);
      throw error;
    }
  }

  /**
   * Update sender analytics
   */
  async updateSenderAnalytics(userId: string, senderData: Omit<SenderAnalytics, 'domain'>): Promise<void> {
    try {
      const domain = senderData.sender_email.split('@')[1] || 'unknown';
      
      const { error } = await this.supabase
        .from('sender_analytics')
        .upsert({
          user_id: userId,
          domain,
          ...senderData,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,sender_email'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating sender analytics:', error);
      throw error;
    }
  }

  /**
   * Record daily activity pattern
   */
  async recordActivityPattern(userId: string, pattern: Omit<ActivityPattern, 'recorded_date'>): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await this.supabase
        .from('activity_patterns')
        .upsert({
          user_id: userId,
          recorded_date: today,
          ...pattern,
        }, {
          onConflict: 'user_id,recorded_date'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error recording activity pattern:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive analytics summary
   */
  async getAnalyticsSummary(userId: string, days: number = 30): Promise<AnalyticsSummary> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [
        emailStats,
        cleanupMetrics,
        senderAnalytics,
        activityPatterns
      ] = await Promise.all([
        this.getEmailStatsHistory(userId, days),
        this.getCleanupMetricsHistory(userId, days),
        this.getTopSenders(userId, 10),
        this.getActivityPatterns(userId, days)
      ]);

      // Calculate summary metrics
      const latestStats = emailStats[0] || {} as EmailStats;
      const totalCleanup = cleanupMetrics.reduce((sum, metric) => ({
        emails_archived: sum.emails_archived + metric.emails_archived,
        emails_deleted: sum.emails_deleted + metric.emails_deleted,
        space_freed: sum.space_freed + metric.space_freed,
        estimated_time_saved: sum.estimated_time_saved + metric.estimated_time_saved,
        unsubscribe_attempts: sum.unsubscribe_attempts + metric.unsubscribe_attempts,
        successful_unsubscribes: sum.successful_unsubscribes + metric.successful_unsubscribes,
        manual_operations: sum.manual_operations + metric.manual_operations,
        automated_operations: sum.automated_operations + metric.automated_operations,
      }), {
        emails_archived: 0,
        emails_deleted: 0,
        space_freed: 0,
        estimated_time_saved: 0,
        unsubscribe_attempts: 0,
        successful_unsubscribes: 0,
        manual_operations: 0,
        automated_operations: 0,
      });

      const unsubscribeSuccessRate = totalCleanup.unsubscribe_attempts > 0
        ? (totalCleanup.successful_unsubscribes / totalCleanup.unsubscribe_attempts) * 100
        : 0;

      const automationEfficiency = (totalCleanup.manual_operations + totalCleanup.automated_operations) > 0
        ? (totalCleanup.automated_operations / (totalCleanup.manual_operations + totalCleanup.automated_operations)) * 100
        : 0;

      const categoryDistribution = {
        promotional: latestStats.promotional_emails || 0,
        social: latestStats.social_emails || 0,
        updates: latestStats.updates_emails || 0,
        forums: latestStats.forums_emails || 0,
        other: Math.max(0, (latestStats.total_emails || 0) - 
          (latestStats.promotional_emails || 0) - 
          (latestStats.social_emails || 0) - 
          (latestStats.updates_emails || 0) - 
          (latestStats.forums_emails || 0))
      };

      const weeklyTrend = this.calculateWeeklyTrend(emailStats, cleanupMetrics);

      return {
        totalEmails: latestStats.total_emails || 0,
        totalSize: this.formatBytes(latestStats.total_size || 0),
        spaceSaved: this.formatBytes(totalCleanup.space_freed),
        timeSaved: totalCleanup.estimated_time_saved,
        unsubscribeSuccessRate,
        automationEfficiency,
        topSenders: senderAnalytics,
        categoryDistribution,
        weeklyTrend,
        monthlyStats: emailStats.slice(0, 12), // Last 12 data points
      };
    } catch (error) {
      console.error('Error getting analytics summary:', error);
      throw error;
    }
  }

  /**
   * Get email statistics history
   */
  private async getEmailStatsHistory(userId: string, days: number): Promise<EmailStats[]> {
    const { data, error } = await this.supabase
      .from('email_stats')
      .select('*')
      .eq('user_id', userId)
      .gte('recorded_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get cleanup metrics history
   */
  private async getCleanupMetricsHistory(userId: string, days: number): Promise<CleanupMetrics[]> {
    const { data, error } = await this.supabase
      .from('cleanup_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('recorded_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get top senders
   */
  private async getTopSenders(userId: string, limit: number): Promise<SenderAnalytics[]> {
    const { data, error } = await this.supabase
      .from('sender_analytics')
      .select('*')
      .eq('user_id', userId)
      .order('total_emails', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get activity patterns
   */
  private async getActivityPatterns(userId: string, days: number): Promise<ActivityPattern[]> {
    const { data, error } = await this.supabase
      .from('activity_patterns')
      .select('*')
      .eq('user_id', userId)
      .gte('recorded_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('recorded_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Store email statistics
   */
  private async storeEmailStats(userId: string, stats: EmailStats): Promise<void> {
    const { error } = await this.supabase
      .from('email_stats')
      .insert({
        user_id: userId,
        ...stats,
      });

    if (error) throw error;
  }

  /**
   * Calculate size metrics from emails
   */
  private calculateSizeMetrics(emails: any[]): Pick<EmailStats, 'total_size' | 'largest_email_size' | 'average_email_size'> {
    if (emails.length === 0) {
      return { total_size: 0, largest_email_size: 0, average_email_size: 0 };
    }

    const sizes = emails.map(email => email.sizeEstimate || 0);
    const totalSize = sizes.reduce((sum, size) => sum + size, 0);
    const largestSize = Math.max(...sizes);
    const averageSize = Math.round(totalSize / emails.length);

    return {
      total_size: totalSize,
      largest_email_size: largestSize,
      average_email_size: averageSize,
    };
  }

  /**
   * Calculate age metrics from emails
   */
  private calculateAgeMetrics(emails: any[]): Pick<EmailStats, 'oldest_email_age' | 'newest_email_age'> {
    if (emails.length === 0) {
      return { oldest_email_age: 0, newest_email_age: 0 };
    }

    const now = new Date();
    const ages = emails
      .map(email => {
        const emailDate = new Date(email.date);
        return Math.floor((now.getTime() - emailDate.getTime()) / (1000 * 60 * 60 * 24));
      })
      .filter(age => !isNaN(age));

    if (ages.length === 0) {
      return { oldest_email_age: 0, newest_email_age: 0 };
    }

    return {
      oldest_email_age: Math.max(...ages),
      newest_email_age: Math.min(...ages),
    };
  }

  /**
   * Calculate attachment metrics from emails
   */
  private calculateAttachmentMetrics(emails: any[]): Pick<EmailStats, 'emails_with_attachments' | 'total_attachment_size'> {
    const emailsWithAttachments = emails.filter(email => 
      email.labels?.includes('has:attachment') || 
      email.snippet?.includes('attachment')
    );

    // Rough estimate: emails with attachments are typically 2-5x larger
    const estimatedAttachmentSize = emailsWithAttachments.reduce((sum, email) => {
      const baseSize = email.sizeEstimate || 0;
      const estimatedAttachmentSize = Math.max(0, baseSize - 5000); // Subtract base email size
      return sum + estimatedAttachmentSize;
    }, 0);

    return {
      emails_with_attachments: emailsWithAttachments.length,
      total_attachment_size: estimatedAttachmentSize,
    };
  }

  /**
   * Calculate weekly trend data
   */
  private calculateWeeklyTrend(
    emailStats: EmailStats[], 
    cleanupMetrics: CleanupMetrics[]
  ): Array<{ date: string; emails: number; cleanup: number }> {
    const trend = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Find stats for this date (simplified - would need better date matching in production)
      const dayStats = emailStats.find(stat => 
        stat.recorded_at && stat.recorded_at.startsWith(dateStr)
      );
      const dayCleanup = cleanupMetrics.filter(metric => 
        metric.recorded_at && metric.recorded_at.startsWith(dateStr)
      );
      
      trend.push({
        date: dateStr,
        emails: dayStats?.total_emails || 0,
        cleanup: dayCleanup.reduce((sum, metric) => 
          sum + metric.emails_archived + metric.emails_deleted, 0
        ),
      });
    }
    
    return trend;
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}