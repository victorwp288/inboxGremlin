import { createClient } from '@/lib/supabase/server';
import { GmailEnhancedService } from './gmail/enhanced-service';

export interface RuleCondition {
  field: 'from' | 'to' | 'subject' | 'body' | 'has_attachment' | 'size' | 'age_days' | 'label' | 'is_unread';
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'has' | 'not_has';
  value: string | number | boolean;
  case_sensitive?: boolean;
}

export interface RuleAction {
  type: 'archive' | 'delete' | 'label' | 'mark_read' | 'mark_unread' | 'forward' | 'star' | 'unstar';
  value?: string; // For label name, forward email, etc.
}

export interface UserRule {
  id: string;
  user_id: string;
  name: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  is_active: boolean;
  schedule?: {
    enabled: boolean;
    frequency: 'hourly' | 'daily' | 'weekly';
    time?: string; // HH:MM format
    days?: number[]; // Days of week (0-6)
  };
  created_at: string;
  updated_at: string;
}

export interface RuleExecution {
  id: string;
  rule_id: string;
  user_id: string;
  emails_processed: number;
  emails_matched: number;
  actions_performed: number;
  success: boolean;
  error_message?: string;
  execution_time_ms: number;
  executed_at: string;
}

export class RulesEngine {
  constructor(private gmailService: GmailEnhancedService) {}

  async getUserRules(userId: string): Promise<UserRule[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('user_rules')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user rules: ${error.message}`);
    }

    return data || [];
  }

  async executeRule(rule: UserRule, emails: any[]): Promise<RuleExecution> {
    const startTime = Date.now();
    let emailsMatched = 0;
    let actionsPerformed = 0;
    let success = true;
    let errorMessage: string | undefined;

    try {
      // Filter emails that match all conditions
      const matchingEmails = emails.filter(email => 
        this.evaluateConditions(email, rule.conditions)
      );
      
      emailsMatched = matchingEmails.length;

      if (matchingEmails.length > 0) {
        // Execute actions on matching emails
        for (const action of rule.actions) {
          await this.executeAction(action, matchingEmails);
          actionsPerformed++;
        }
      }

    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }

    const executionTime = Date.now() - startTime;

    // Record execution in database
    const execution: Omit<RuleExecution, 'id'> = {
      rule_id: rule.id,
      user_id: rule.user_id,
      emails_processed: emails.length,
      emails_matched: emailsMatched,
      actions_performed: actionsPerformed,
      success,
      error_message: errorMessage,
      execution_time_ms: executionTime,
      executed_at: new Date().toISOString()
    };

    const supabase = createClient();
    const { data } = await supabase
      .from('rule_executions')
      .insert(execution)
      .select()
      .single();

    return data;
  }

  private evaluateConditions(email: any, conditions: RuleCondition[]): boolean {
    return conditions.every(condition => this.evaluateCondition(email, condition));
  }

  private evaluateCondition(email: any, condition: RuleCondition): boolean {
    const { field, operator, value, case_sensitive = false } = condition;
    
    let emailValue: any;
    
    switch (field) {
      case 'from':
        emailValue = email.from || '';
        break;
      case 'to':
        emailValue = email.to || '';
        break;
      case 'subject':
        emailValue = email.subject || '';
        break;
      case 'body':
        emailValue = email.snippet || email.body || '';
        break;
      case 'has_attachment':
        return email.hasAttachment === value;
      case 'size':
        emailValue = email.sizeEstimate || 0;
        break;
      case 'age_days':
        const emailDate = new Date(email.date);
        const ageDays = (Date.now() - emailDate.getTime()) / (1000 * 60 * 60 * 24);
        emailValue = Math.floor(ageDays);
        break;
      case 'label':
        const labels = email.labelIds || [];
        return operator === 'has' ? labels.includes(value) : !labels.includes(value);
      case 'is_unread':
        return email.isUnread === value;
      default:
        return false;
    }

    // Convert to string for text operations
    if (typeof emailValue === 'string' && !case_sensitive) {
      emailValue = emailValue.toLowerCase();
    }
    
    const compareValue = typeof value === 'string' && !case_sensitive ? 
      value.toLowerCase() : value;

    switch (operator) {
      case 'contains':
        return typeof emailValue === 'string' && emailValue.includes(compareValue as string);
      case 'equals':
        return emailValue === compareValue;
      case 'starts_with':
        return typeof emailValue === 'string' && emailValue.startsWith(compareValue as string);
      case 'ends_with':
        return typeof emailValue === 'string' && emailValue.endsWith(compareValue as string);
      case 'greater_than':
        return typeof emailValue === 'number' && emailValue > (compareValue as number);
      case 'less_than':
        return typeof emailValue === 'number' && emailValue < (compareValue as number);
      default:
        return false;
    }
  }

  private async executeAction(action: RuleAction, emails: any[]): Promise<void> {
    const emailIds = emails.map(email => email.id);

    switch (action.type) {
      case 'archive':
        await this.gmailService.archiveEmailsWithHistory(emailIds);
        break;
      case 'delete':
        await this.gmailService.deleteEmailsWithHistory(emailIds);
        break;
      case 'label':
        if (action.value) {
          await this.gmailService.labelEmailsWithHistory(emailIds, [action.value]);
        }
        break;
      case 'mark_read':
        await this.gmailService.markAsReadWithHistory(emailIds);
        break;
      case 'mark_unread':
        await this.gmailService.markAsUnreadWithHistory(emailIds);
        break;
      case 'star':
        await this.gmailService.starEmailsWithHistory(emailIds);
        break;
      case 'unstar':
        await this.gmailService.unstarEmailsWithHistory(emailIds);
        break;
      case 'forward':
        // Forward action would require additional implementation
        console.log(`Forward action not yet implemented for ${emailIds.length} emails`);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  async runScheduledRules(userId: string): Promise<RuleExecution[]> {
    const rules = await this.getUserRules(userId);
    const scheduledRules = rules.filter(rule => 
      rule.schedule?.enabled && this.shouldRunRule(rule)
    );

    const results: RuleExecution[] = [];
    
    for (const rule of scheduledRules) {
      try {
        // Fetch emails for rule evaluation
        const emails = await this.gmailService.listEmails({ maxResults: 500 });
        const execution = await this.executeRule(rule, emails);
        results.push(execution);
      } catch (error) {
        console.error(`Failed to execute rule ${rule.id}:`, error);
      }
    }

    return results;
  }

  private shouldRunRule(rule: UserRule): boolean {
    if (!rule.schedule?.enabled) return false;

    const now = new Date();
    const { frequency, time, days } = rule.schedule;

    switch (frequency) {
      case 'hourly':
        return true; // Run every hour when called
      case 'daily':
        if (time) {
          const [hours, minutes] = time.split(':').map(Number);
          return now.getHours() === hours && now.getMinutes() === minutes;
        }
        return true;
      case 'weekly':
        if (days && days.length > 0) {
          const currentDay = now.getDay();
          return days.includes(currentDay);
        }
        return true;
      default:
        return false;
    }
  }
}