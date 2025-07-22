import { google } from "googleapis";

export interface EmailData {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  isRead: boolean;
  labels: string[];
}

export interface EmailCategory {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  senderPatterns: string[];
  color: string;
}

export interface BulkOperationResult {
  success: boolean;
  processedCount: number;
  errors: string[];
  operationId?: string; // For undo functionality
  affectedEmails?: EmailData[]; // For operation history
}

export class GmailService {
  private gmail;

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    this.gmail = google.gmail({ version: "v1", auth });
  }

  async getRecentEmails(maxResults: number = 5): Promise<EmailData[]> {
    try {
      // First, get the list of messages
      const messagesResponse = await this.gmail.users.messages.list({
        userId: "me",
        maxResults,
        q: "in:inbox", // Only get emails from inbox
      });

      const messages = messagesResponse.data.messages || [];

      if (messages.length === 0) {
        return [];
      }

      // Get details for each message
      const emailPromises = messages.map(async (message) => {
        const messageDetail = await this.gmail.users.messages.get({
          userId: "me",
          id: message.id!,
          format: "full",
        });

        const data = messageDetail.data;
        const headers = data.payload?.headers || [];

        // Extract header information
        const getHeader = (name: string) =>
          headers.find(
            (header) => header.name?.toLowerCase() === name.toLowerCase()
          )?.value || "";

        const subject = getHeader("Subject");
        const from = getHeader("From");
        const date = getHeader("Date");

        // Check if email is read (doesn't have UNREAD label)
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
      });

      const emails = await Promise.all(emailPromises);
      return emails;
    } catch (error) {
      console.error("Error fetching emails:", error);
      throw new Error("Failed to fetch emails from Gmail");
    }
  }

  async getEmailCount(): Promise<{ total: number; unread: number }> {
    try {
      // Use the newer Gmail API methods as recommended in the docs
      // Get specific label information for INBOX (contains both total and unread counts)
      const inboxLabel = await this.gmail.users.labels.get({
        userId: "me",
        id: "INBOX",
      });

      // Extract message counts from the label details
      const totalInbox = inboxLabel.data.messagesTotal || 0;
      const totalUnread = inboxLabel.data.messagesUnread || 0;

      console.log("Label counts:", {
        inbox: totalInbox,
        unread: totalUnread,
        inboxData: inboxLabel.data,
      });

      return {
        total: totalInbox,
        unread: totalUnread,
      };
    } catch (error) {
      console.error("Error fetching email counts with labels.get:", error);

      // Fallback to the Profile API method
      try {
        console.log("Trying profile API fallback...");
        const profile = await this.gmail.users.getProfile({
          userId: "me",
        });

        console.log("Profile data:", profile.data);

        // Profile gives us total messages and threads, but not inbox-specific counts
        // So we'll combine it with a quick inbox query
        const [inboxResponse, unreadResponse] = await Promise.all([
          this.gmail.users.messages.list({
            userId: "me",
            q: "in:inbox",
            maxResults: 1,
          }),
          this.gmail.users.messages.list({
            userId: "me",
            q: "in:inbox is:unread",
            maxResults: 1,
          }),
        ]);

        return {
          total: inboxResponse.data.resultSizeEstimate || 0,
          unread: unreadResponse.data.resultSizeEstimate || 0,
        };
      } catch (fallbackError) {
        console.error("Profile API fallback also failed:", fallbackError);
        return { total: 0, unread: 0 };
      }
    }
  }

  // NEW: Email Organization Methods

  /**
   * Get emails matching specific criteria for bulk operations
   */
  async getEmailsByQuery(
    query: string,
    maxResults: number = 100
  ): Promise<EmailData[]> {
    try {
      const messagesResponse = await this.gmail.users.messages.list({
        userId: "me",
        maxResults,
        q: query,
      });

      const messages = messagesResponse.data.messages || [];

      if (messages.length === 0) {
        return [];
      }

      // Get details for each message (in batches to avoid rate limits)
      const batchSize = 20;
      const emails: EmailData[] = [];

      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const batchPromises = batch.map(async (message) => {
          const messageDetail = await this.gmail.users.messages.get({
            userId: "me",
            id: message.id!,
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
        });

        const batchEmails = await Promise.all(batchPromises);
        emails.push(...batchEmails);
      }

      return emails;
    } catch (error) {
      console.error("Error fetching emails by query:", error);
      throw new Error("Failed to fetch emails by query");
    }
  }

  /**
   * Archive emails by their IDs
   */
  async archiveEmails(emailIds: string[]): Promise<BulkOperationResult> {
    const errors: string[] = [];
    let processedCount = 0;

    try {
      for (const emailId of emailIds) {
        try {
          await this.gmail.users.messages.modify({
            userId: "me",
            id: emailId,
            requestBody: {
              removeLabelIds: ["INBOX"],
            },
          });
          processedCount++;
        } catch (error: any) {
          errors.push(`Failed to archive email ${emailId}: ${error.message}`);
        }
      }

      return {
        success: errors.length === 0,
        processedCount,
        errors,
      };
    } catch (error: any) {
      return {
        success: false,
        processedCount,
        errors: [`Bulk archive operation failed: ${error.message}`],
      };
    }
  }

  /**
   * Delete emails by their IDs
   */
  async deleteEmails(emailIds: string[]): Promise<BulkOperationResult> {
    const errors: string[] = [];
    let processedCount = 0;

    try {
      for (const emailId of emailIds) {
        try {
          await this.gmail.users.messages.trash({
            userId: "me",
            id: emailId,
          });
          processedCount++;
        } catch (error: any) {
          errors.push(`Failed to delete email ${emailId}: ${error.message}`);
        }
      }

      return {
        success: errors.length === 0,
        processedCount,
        errors,
      };
    } catch (error: any) {
      return {
        success: false,
        processedCount,
        errors: [`Bulk delete operation failed: ${error.message}`],
      };
    }
  }

  /**
   * Add labels to emails
   */
  async labelEmails(
    emailIds: string[],
    labelIds: string[]
  ): Promise<BulkOperationResult> {
    const errors: string[] = [];
    let processedCount = 0;

    try {
      for (const emailId of emailIds) {
        try {
          await this.gmail.users.messages.modify({
            userId: "me",
            id: emailId,
            requestBody: {
              addLabelIds: labelIds,
            },
          });
          processedCount++;
        } catch (error: any) {
          errors.push(`Failed to label email ${emailId}: ${error.message}`);
        }
      }

      return {
        success: errors.length === 0,
        processedCount,
        errors,
      };
    } catch (error: any) {
      return {
        success: false,
        processedCount,
        errors: [`Bulk label operation failed: ${error.message}`],
      };
    }
  }

  /**
   * Mark emails as read
   */
  async markAsRead(emailIds: string[]): Promise<BulkOperationResult> {
    const errors: string[] = [];
    let processedCount = 0;

    try {
      for (const emailId of emailIds) {
        try {
          await this.gmail.users.messages.modify({
            userId: "me",
            id: emailId,
            requestBody: {
              removeLabelIds: ["UNREAD"],
            },
          });
          processedCount++;
        } catch (error: any) {
          errors.push(
            `Failed to mark email as read ${emailId}: ${error.message}`
          );
        }
      }

      return {
        success: errors.length === 0,
        processedCount,
        errors,
      };
    } catch (error: any) {
      return {
        success: false,
        processedCount,
        errors: [`Bulk mark as read operation failed: ${error.message}`],
      };
    }
  }

  /**
   * Mark emails as unread
   */
  async markAsUnread(emailIds: string[]): Promise<BulkOperationResult> {
    const errors: string[] = [];
    let processedCount = 0;

    try {
      for (const emailId of emailIds) {
        try {
          await this.gmail.users.messages.modify({
            userId: "me",
            id: emailId,
            requestBody: {
              addLabelIds: ["UNREAD"],
            },
          });
          processedCount++;
        } catch (error: any) {
          errors.push(
            `Failed to mark email as unread ${emailId}: ${error.message}`
          );
        }
      }

      return {
        success: errors.length === 0,
        processedCount,
        errors,
      };
    } catch (error: any) {
      return {
        success: false,
        processedCount,
        errors: [`Bulk mark as unread operation failed: ${error.message}`],
      };
    }
  }

  /**
   * Star emails
   */
  async starEmails(emailIds: string[]): Promise<BulkOperationResult> {
    const errors: string[] = [];
    let processedCount = 0;

    try {
      for (const emailId of emailIds) {
        try {
          await this.gmail.users.messages.modify({
            userId: "me",
            id: emailId,
            requestBody: {
              addLabelIds: ["STARRED"],
            },
          });
          processedCount++;
        } catch (error: any) {
          errors.push(
            `Failed to star email ${emailId}: ${error.message}`
          );
        }
      }

      return {
        success: errors.length === 0,
        processedCount,
        errors,
      };
    } catch (error: any) {
      return {
        success: false,
        processedCount,
        errors: [`Bulk star operation failed: ${error.message}`],
      };
    }
  }

  /**
   * Unstar emails
   */
  async unstarEmails(emailIds: string[]): Promise<BulkOperationResult> {
    const errors: string[] = [];
    let processedCount = 0;

    try {
      for (const emailId of emailIds) {
        try {
          await this.gmail.users.messages.modify({
            userId: "me",
            id: emailId,
            requestBody: {
              removeLabelIds: ["STARRED"],
            },
          });
          processedCount++;
        } catch (error: any) {
          errors.push(
            `Failed to unstar email ${emailId}: ${error.message}`
          );
        }
      }

      return {
        success: errors.length === 0,
        processedCount,
        errors,
      };
    } catch (error: any) {
      return {
        success: false,
        processedCount,
        errors: [`Bulk unstar operation failed: ${error.message}`],
      };
    }
  }

  /**
   * Get all available labels
   */
  async getLabels(): Promise<any[]> {
    try {
      const response = await this.gmail.users.labels.list({
        userId: "me",
      });
      return response.data.labels || [];
    } catch (error) {
      console.error("Error fetching labels:", error);
      throw new Error("Failed to fetch labels");
    }
  }

  /**
   * Create a new label
   */
  async createLabel(name: string, color?: string): Promise<any> {
    try {
      const response = await this.gmail.users.labels.create({
        userId: "me",
        requestBody: {
          name,
          labelListVisibility: "labelShow",
          messageListVisibility: "show",
          color: color
            ? {
                backgroundColor: color,
                textColor: "#ffffff",
              }
            : undefined,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error creating label:", error);
      throw new Error("Failed to create label");
    }
  }

  /**
   * Categorize email based on content and sender
   */
  categorizeEmail(email: EmailData): string {
    const subject = email.subject.toLowerCase();
    const from = email.from.toLowerCase();
    const snippet = email.snippet.toLowerCase();

    // Newsletter patterns
    if (
      from.includes("newsletter") ||
      from.includes("noreply") ||
      from.includes("no-reply") ||
      subject.includes("newsletter") ||
      subject.includes("unsubscribe") ||
      snippet.includes("unsubscribe")
    ) {
      return "newsletter";
    }

    // Promotional patterns
    if (
      subject.includes("sale") ||
      subject.includes("deal") ||
      subject.includes("offer") ||
      subject.includes("discount") ||
      subject.includes("% off") ||
      snippet.includes("shop now") ||
      snippet.includes("limited time")
    ) {
      return "promotional";
    }

    // Social media notifications
    if (
      from.includes("facebook") ||
      from.includes("twitter") ||
      from.includes("linkedin") ||
      from.includes("instagram") ||
      from.includes("notification") ||
      subject.includes("notification")
    ) {
      return "social";
    }

    // Financial/Banking
    if (
      from.includes("bank") ||
      from.includes("paypal") ||
      from.includes("stripe") ||
      subject.includes("invoice") ||
      subject.includes("payment") ||
      subject.includes("receipt")
    ) {
      return "financial";
    }

    // Work/Business (common business domains)
    if (
      from.includes("@company.com") ||
      from.includes("@corp.com") ||
      subject.includes("meeting") ||
      subject.includes("project") ||
      subject.includes("deadline")
    ) {
      return "work";
    }

    return "personal";
  }

  private extractEmailAddress(fromHeader: string): string {
    // Extract email from "Name <email@domain.com>" format
    const emailMatch = fromHeader.match(/<([^>]+)>/);
    if (emailMatch) {
      return emailMatch[1];
    }

    // If no angle brackets, try to extract just the email
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
