import { GmailService, EmailData, BulkOperationResult } from "./service";
import { OperationHistoryService, UndoableOperation } from "../operation-history";
import { google } from "googleapis";

export interface EnhancedBulkOperationResult extends BulkOperationResult {
  operationId: string | null;
  canUndo: boolean;
}

export class GmailEnhancedService extends GmailService {
  private operationHistory: OperationHistoryService;
  private gmail: any;

  constructor(accessToken: string) {
    super(accessToken);
    this.operationHistory = new OperationHistoryService();
    
    // Initialize Gmail API client
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.gmail = google.gmail({ version: "v1", auth });
  }

  /**
   * Delete emails with operation history tracking
   */
  async deleteEmailsWithHistory(emailIds: string[]): Promise<EnhancedBulkOperationResult> {
    try {
      const emailDetails = await this.getEmailDetailsByIds(emailIds);
      const result = await this.deleteEmails(emailIds);
      
      if (result.success && result.processedCount > 0) {
        const operationId = await this.operationHistory.recordOperation({
          operation_type: 'delete',
          affected_emails: emailDetails.map(email => ({
            id: email.id,
            subject: email.subject,
            from: email.from,
            originalLabels: email.labels,
            snippet: email.snippet,
          })),
          operation_details: {
            permanentDelete: true,
          },
        });

        return {
          ...result,
          operationId,
          canUndo: false, // Delete operations cannot be undone
          affectedEmails: emailDetails,
        };
      }

      return {
        ...result,
        operationId: null,
        canUndo: false,
        affectedEmails: emailDetails,
      };
    } catch (error) {
      console.error('Error in deleteEmailsWithHistory:', error);
      return {
        success: false,
        processedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        operationId: null,
        canUndo: false,
        affectedEmails: [],
      };
    }
  }

  /**
   * Label emails with operation history tracking
   */
  async labelEmailsWithHistory(emailIds: string[], labelIds: string[]): Promise<EnhancedBulkOperationResult> {
    try {
      const emailDetails = await this.getEmailDetailsByIds(emailIds);
      const result = await this.labelEmails(emailIds, labelIds);
      
      if (result.success && result.processedCount > 0) {
        const operationId = await this.operationHistory.recordOperation({
          operation_type: 'label',
          affected_emails: emailDetails.map(email => ({
            id: email.id,
            subject: email.subject,
            from: email.from,
            originalLabels: email.labels,
            snippet: email.snippet,
          })),
          operation_details: {
            addedLabels: labelIds,
          },
        });

        return {
          ...result,
          operationId,
          canUndo: true,
          affectedEmails: emailDetails,
        };
      }

      return {
        ...result,
        operationId: null,
        canUndo: false,
        affectedEmails: emailDetails,
      };
    } catch (error) {
      console.error('Error in labelEmailsWithHistory:', error);
      return {
        success: false,
        processedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        operationId: null,
        canUndo: false,
        affectedEmails: [],
      };
    }
  }

  /**
   * Mark emails as read with operation history tracking
   */
  async markAsReadWithHistory(emailIds: string[]): Promise<EnhancedBulkOperationResult> {
    try {
      const emailDetails = await this.getEmailDetailsByIds(emailIds);
      const result = await this.markAsRead(emailIds);
      
      if (result.success && result.processedCount > 0) {
        const operationId = await this.operationHistory.recordOperation({
          operation_type: 'mark_read',
          affected_emails: emailDetails.map(email => ({
            id: email.id,
            subject: email.subject,
            from: email.from,
            originalLabels: email.labels,
            snippet: email.snippet,
          })),
          operation_details: {
            removedLabels: ['UNREAD'],
          },
        });

        return {
          ...result,
          operationId,
          canUndo: true,
          affectedEmails: emailDetails,
        };
      }

      return {
        ...result,
        operationId: null,
        canUndo: false,
        affectedEmails: emailDetails,
      };
    } catch (error) {
      console.error('Error in markAsReadWithHistory:', error);
      return {
        success: false,
        processedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        operationId: null,
        canUndo: false,
        affectedEmails: [],
      };
    }
  }

  /**
   * Mark emails as unread with operation history tracking
   */
  async markAsUnreadWithHistory(emailIds: string[]): Promise<EnhancedBulkOperationResult> {
    try {
      const emailDetails = await this.getEmailDetailsByIds(emailIds);
      const result = await this.markAsUnread(emailIds);
      
      if (result.success && result.processedCount > 0) {
        const operationId = await this.operationHistory.recordOperation({
          operation_type: 'mark_unread',
          affected_emails: emailDetails.map(email => ({
            id: email.id,
            subject: email.subject,
            from: email.from,
            originalLabels: email.labels,
            snippet: email.snippet,
          })),
          operation_details: {
            addedLabels: ['UNREAD'],
          },
        });

        return {
          ...result,
          operationId,
          canUndo: true,
          affectedEmails: emailDetails,
        };
      }

      return {
        ...result,
        operationId: null,
        canUndo: false,
        affectedEmails: emailDetails,
      };
    } catch (error) {
      console.error('Error in markAsUnreadWithHistory:', error);
      return {
        success: false,
        processedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        operationId: null,
        canUndo: false,
        affectedEmails: [],
      };
    }
  }

  /**
   * Star emails with operation history tracking
   */
  async starEmailsWithHistory(emailIds: string[]): Promise<EnhancedBulkOperationResult> {
    try {
      const emailDetails = await this.getEmailDetailsByIds(emailIds);
      const result = await this.starEmails(emailIds);
      
      if (result.success && result.processedCount > 0) {
        const operationId = await this.operationHistory.recordOperation({
          operation_type: 'star',
          affected_emails: emailDetails.map(email => ({
            id: email.id,
            subject: email.subject,
            from: email.from,
            originalLabels: email.labels,
            snippet: email.snippet,
          })),
          operation_details: {
            addedLabels: ['STARRED'],
          },
        });

        return {
          ...result,
          operationId,
          canUndo: true,
          affectedEmails: emailDetails,
        };
      }

      return {
        ...result,
        operationId: null,
        canUndo: false,
        affectedEmails: emailDetails,
      };
    } catch (error) {
      console.error('Error in starEmailsWithHistory:', error);
      return {
        success: false,
        processedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        operationId: null,
        canUndo: false,
        affectedEmails: [],
      };
    }
  }

  /**
   * Unstar emails with operation history tracking
   */
  async unstarEmailsWithHistory(emailIds: string[]): Promise<EnhancedBulkOperationResult> {
    try {
      const emailDetails = await this.getEmailDetailsByIds(emailIds);
      const result = await this.unstarEmails(emailIds);
      
      if (result.success && result.processedCount > 0) {
        const operationId = await this.operationHistory.recordOperation({
          operation_type: 'unstar',
          affected_emails: emailDetails.map(email => ({
            id: email.id,
            subject: email.subject,
            from: email.from,
            originalLabels: email.labels,
            snippet: email.snippet,
          })),
          operation_details: {
            removedLabels: ['STARRED'],
          },
        });

        return {
          ...result,
          operationId,
          canUndo: true,
          affectedEmails: emailDetails,
        };
      }

      return {
        ...result,
        operationId: null,
        canUndo: false,
        affectedEmails: emailDetails,
      };
    } catch (error) {
      console.error('Error in unstarEmailsWithHistory:', error);
      return {
        success: false,
        processedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        operationId: null,
        canUndo: false,
        affectedEmails: [],
      };
    }
  }

  /**
   * Archive emails with operation history tracking
   */
  async archiveEmailsWithHistory(emailIds: string[]): Promise<EnhancedBulkOperationResult> {
    try {
      // First, get email details for history
      const emailDetails = await this.getEmailDetailsByIds(emailIds);
      
      // Perform the operation
      const result = await this.archiveEmails(emailIds);
      
      if (result.success && result.processedCount > 0) {
        // Record in operation history
        const operationId = await this.operationHistory.recordOperation({
          operation_type: 'archive',
          affected_emails: emailDetails.map(email => ({
            id: email.id,
            subject: email.subject,
            from: email.from,
            originalLabels: email.labels,
            snippet: email.snippet,
          })),
          operation_details: {
            removedLabels: ['INBOX'],
          },
        });

        return {
          ...result,
          operationId,
          canUndo: true,
          affectedEmails: emailDetails,
        };
      }

      return {
        ...result,
        operationId: null,
        canUndo: false,
        affectedEmails: emailDetails,
      };
    } catch (error) {
      console.error('Error in archiveEmailsWithHistory:', error);
      return {
        success: false,
        processedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        operationId: null,
        canUndo: false,
        affectedEmails: [],
      };
    }
  }

  /**
   * List emails with query and options
   */
  async listEmails(options: { maxResults?: number; query?: string } = {}): Promise<EmailData[]> {
    const { maxResults = 100, query = 'in:inbox' } = options;
    return this.getEmailsByQuery(query, maxResults);
  }

  /**
   * Undo a previous operation
   */
  async undoOperation(operationId: string): Promise<boolean> {
    try {
      return await this.operationHistory.undoOperation(operationId);
    } catch (error) {
      console.error('Error undoing operation:', error);
      return false;
    }
  }

  /**
   * Get email details by IDs for operation history
   */
  private async getEmailDetailsByIds(emailIds: string[]): Promise<EmailData[]> {
    try {
      const emails: EmailData[] = [];
      
      // Process in batches to avoid rate limits
      const batchSize = 20;
      for (let i = 0; i < emailIds.length; i += batchSize) {
        const batch = emailIds.slice(i, i + batchSize);
        const batchPromises = batch.map(async (emailId) => {
          try {
            const messageDetail = await this.gmail.users.messages.get({
              userId: "me",
              id: emailId,
              format: "metadata",
              metadataHeaders: ["Subject", "From", "Date"],
            });

            const data = messageDetail.data;
            const headers = data.payload?.headers || [];

            const getHeader = (name: string) =>
              headers.find(
                (header) => header.name?.toLowerCase() === name.toLowerCase()
              )?.value || "";

            const subject = getHeader("Subject");
            const from = getHeader("From");
            const date = getHeader("Date");
            const isRead = !data.labelIds?.includes("UNREAD");

            return {
              id: data.id!,
              subject: subject || "No Subject",
              from: this.extractEmailAddress(from),
              date: this.formatDate(date),
              snippet: data.snippet || "",
              isRead,
              labels: data.labelIds || [],
            };
          } catch (error) {
            console.error(`Error fetching email ${emailId}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        emails.push(...batchResults.filter((email): email is EmailData => email !== null));
      }

      return emails;
    } catch (error) {
      console.error('Error getting email details:', error);
      return [];
    }
  }

  // Helper methods
  private extractEmailAddress(fromHeader: string): string {
    const emailMatch = fromHeader.match(/<([^>]+)>/);
    if (emailMatch) {
      return emailMatch[1];
    }
    const directEmailMatch = fromHeader.match(/([^\s]+@[^\s]+)/);
    if (directEmailMatch) {
      return directEmailMatch[1];
    }
    return fromHeader;
  }

  private formatDate(dateString: string): string {
    if (!dateString) return "Unknown";

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        return "Today";
      } else if (diffDays === 2) {
        return "Yesterday";
      } else if (diffDays <= 7) {
        return `${diffDays - 1} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return dateString;
    }
  }
}