import { createClient } from "@/lib/supabase/client";
import { GmailService } from "@/lib/gmail/service";

export interface OperationHistoryEntry {
  id: string;
  user_id: string;
  operation_type: 'archive' | 'delete' | 'label' | 'mark_read' | 'unsubscribe';
  affected_emails: {
    id: string;
    subject: string;
    from: string;
    originalLabels: string[];
    snippet: string;
  }[];
  operation_details: {
    addedLabels?: string[];
    removedLabels?: string[];
    targetLabel?: string;
    query?: string;
  };
  timestamp: string;
  can_undo: boolean;
  undone_at: string | null;
  undo_operation_id: string | null;
}

export interface UndoableOperation {
  operation_type: OperationHistoryEntry['operation_type'];
  affected_emails: OperationHistoryEntry['affected_emails'];
  operation_details: OperationHistoryEntry['operation_details'];
}

export class OperationHistoryService {
  private supabase = createClient();

  /**
   * Record a new operation in history for potential undo
   */
  async recordOperation(operation: UndoableOperation): Promise<string | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('operation_history')
        .insert({
          user_id: user.id,
          operation_type: operation.operation_type,
          affected_emails: operation.affected_emails,
          operation_details: operation.operation_details,
          can_undo: this.isUndoable(operation.operation_type),
        })
        .select('id')
        .single();

      if (error) throw error;
      
      // Clean up old entries (keep only last 50 per user)
      await this.cleanupOldEntries();
      
      return data.id;
    } catch (error) {
      console.error('Error recording operation:', error);
      return null;
    }
  }

  /**
   * Get recent operations that can be undone
   */
  async getUndoableOperations(limit: number = 10): Promise<OperationHistoryEntry[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await this.supabase
        .from('operation_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('can_undo', true)
        .is('undone_at', null)
        .gte('timestamp', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()) // Last 48 hours
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching undoable operations:', error);
      return [];
    }
  }

  /**
   * Undo a specific operation
   */
  async undoOperation(operationId: string, gmailService: GmailService): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get the operation details
      const { data: operation, error: fetchError } = await this.supabase
        .from('operation_history')
        .select('*')
        .eq('id', operationId)
        .eq('user_id', user.id)
        .eq('can_undo', true)
        .is('undone_at', null)
        .single();

      if (fetchError || !operation) {
        throw new Error('Operation not found or cannot be undone');
      }

      // Check if operation is still within undo window (48 hours)
      const operationTime = new Date(operation.timestamp);
      const now = new Date();
      const hoursDiff = (now.getTime() - operationTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 48) {
        throw new Error('Operation is too old to undo (48 hour limit)');
      }

      // Perform the undo operation
      const undoSuccess = await this.performUndo(operation, gmailService);
      
      if (undoSuccess) {
        // Record the undo operation
        const undoOperationId = await this.recordOperation({
          operation_type: this.getUndoOperationType(operation.operation_type),
          affected_emails: operation.affected_emails,
          operation_details: {
            ...operation.operation_details,
            undoing_operation_id: operationId,
          },
        });

        // Mark original operation as undone
        const { error: updateError } = await this.supabase
          .from('operation_history')
          .update({
            undone_at: new Date().toISOString(),
            undo_operation_id: undoOperationId,
          })
          .eq('id', operationId);

        if (updateError) throw updateError;
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error undoing operation:', error);
      return false;
    }
  }

  /**
   * Get operation history for display
   */
  async getOperationHistory(limit: number = 50): Promise<OperationHistoryEntry[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await this.supabase
        .from('operation_history')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching operation history:', error);
      return [];
    }
  }

  /**
   * Perform the actual undo operation
   */
  private async performUndo(operation: OperationHistoryEntry, gmailService: GmailService): Promise<boolean> {
    try {
      const emailIds = operation.affected_emails.map(email => email.id);

      switch (operation.operation_type) {
        case 'archive':
          // Restore emails to inbox
          return await this.restoreToInbox(emailIds, gmailService);

        case 'delete':
          // Restore from trash (if still in trash)
          return await this.restoreFromTrash(emailIds, gmailService);

        case 'label':
          // Remove added labels and restore original labels
          return await this.undoLabelOperation(operation, gmailService);

        case 'mark_read':
          // Mark emails as unread
          return await this.markAsUnread(emailIds, gmailService);

        default:
          console.warn(`Undo not implemented for operation type: ${operation.operation_type}`);
          return false;
      }
    } catch (error) {
      console.error('Error performing undo:', error);
      return false;
    }
  }

  private async restoreToInbox(emailIds: string[], gmailService: GmailService): Promise<boolean> {
    try {
      const result = await gmailService.labelEmails(emailIds, ['INBOX']);
      return result.success;
    } catch (error) {
      console.error('Error restoring to inbox:', error);
      return false;
    }
  }

  private async restoreFromTrash(emailIds: string[], gmailService: GmailService): Promise<boolean> {
    // Note: Gmail API doesn't support untrashing emails directly
    // This would require more complex implementation
    console.warn('Restore from trash not yet implemented');
    return false;
  }

  private async undoLabelOperation(operation: OperationHistoryEntry, gmailService: GmailService): Promise<boolean> {
    try {
      const emailIds = operation.affected_emails.map(email => email.id);
      const { addedLabels = [], removedLabels = [] } = operation.operation_details;

      // Remove labels that were added
      if (addedLabels.length > 0) {
        await gmailService.labelEmails(emailIds, [], addedLabels);
      }

      // Restore labels that were removed
      if (removedLabels.length > 0) {
        await gmailService.labelEmails(emailIds, removedLabels);
      }

      return true;
    } catch (error) {
      console.error('Error undoing label operation:', error);
      return false;
    }
  }

  private async markAsUnread(emailIds: string[], gmailService: GmailService): Promise<boolean> {
    try {
      const result = await gmailService.labelEmails(emailIds, ['UNREAD']);
      return result.success;
    } catch (error) {
      console.error('Error marking as unread:', error);
      return false;
    }
  }

  private isUndoable(operationType: string): boolean {
    const undoableOperations = ['archive', 'label', 'mark_read'];
    return undoableOperations.includes(operationType);
  }

  private getUndoOperationType(originalType: OperationHistoryEntry['operation_type']): OperationHistoryEntry['operation_type'] {
    const undoMap: Record<string, OperationHistoryEntry['operation_type']> = {
      'archive': 'label', // Restore to inbox
      'label': 'label', // Modify labels
      'mark_read': 'label', // Mark as unread
    };
    return undoMap[originalType] || originalType;
  }

  private async cleanupOldEntries(): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return;

      // Keep only the most recent 50 entries per user
      const { data: oldEntries } = await this.supabase
        .from('operation_history')
        .select('id')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .range(50, 1000); // Get entries beyond the first 50

      if (oldEntries && oldEntries.length > 0) {
        const idsToDelete = oldEntries.map(entry => entry.id);
        await this.supabase
          .from('operation_history')
          .delete()
          .in('id', idsToDelete);
      }
    } catch (error) {
      console.error('Error cleaning up old entries:', error);
    }
  }
}