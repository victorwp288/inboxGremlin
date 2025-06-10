import { google } from "googleapis";
import { EmailData, EmailCategory, BulkOperationResult } from "./service";

export interface EmailInsight {
  sentiment: "positive" | "negative" | "neutral";
  priority: "high" | "medium" | "low";
  actionRequired: boolean;
  suggestedActions: string[];
  keyTopics: string[];
  estimatedReadTime: number;
}

export interface EmailAnalytics {
  topSenders: Array<{ email: string; count: number; lastSeen: string }>;
  categoryDistribution: Record<string, number>;
  volumeTrends: Array<{ date: string; count: number }>;
  responseTimeStats: {
    average: number;
    median: number;
    fastest: number;
    slowest: number;
  };
  unreadTrends: Array<{ date: string; count: number }>;
}

export interface SmartFilter {
  id: string;
  name: string;
  description: string;
  conditions: FilterCondition[];
  actions: FilterAction[];
  enabled: boolean;
  createdAt: string;
  lastApplied: string;
  emailsProcessed: number;
}

export interface FilterCondition {
  field: "from" | "subject" | "body" | "hasAttachment" | "isUnread" | "date";
  operator:
    | "contains"
    | "equals"
    | "startsWith"
    | "endsWith"
    | "regex"
    | "before"
    | "after";
  value: string;
  caseSensitive?: boolean;
}

export interface FilterAction {
  type: "archive" | "delete" | "label" | "markAsRead" | "star" | "forward";
  value?: string; // labelId for label action, email for forward action
}

export interface EmailThread {
  id: string;
  subject: string;
  participants: string[];
  messageCount: number;
  lastMessageDate: string;
  isRead: boolean;
  hasAttachments: boolean;
  labels: string[];
  snippet: string;
}

export interface BatchProgressCallback {
  (processed: number, total: number, currentItem?: string): void;
}

export class EnhancedGmailService {
  private gmail;
  private readonly BATCH_SIZE = 100;
  private readonly RATE_LIMIT_DELAY = 100; // ms between requests

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.gmail = google.gmail({ version: "v1", auth });
  }

  // AI-POWERED EMAIL ANALYSIS

  /**
   * Analyze email content for insights using AI patterns
   */
  async analyzeEmail(email: EmailData): Promise<EmailInsight> {
    const content = `${email.subject} ${email.snippet}`.toLowerCase();
    const from = email.from.toLowerCase();

    // Sentiment analysis using keyword patterns
    const sentiment = this.detectSentiment(content);

    // Priority detection
    const priority = this.detectPriority(email);

    // Action detection
    const actionRequired = this.detectActionRequired(content);

    // Suggested actions
    const suggestedActions = this.generateSuggestedActions(email);

    // Topic extraction
    const keyTopics = this.extractKeyTopics(content);

    // Reading time estimation (average 200 WPM)
    const wordCount = content.split(/\s+/).length;
    const estimatedReadTime = Math.max(1, Math.ceil(wordCount / 200));

    return {
      sentiment,
      priority,
      actionRequired,
      suggestedActions,
      keyTopics,
      estimatedReadTime,
    };
  }

  /**
   * Batch analyze multiple emails with progress callback
   */
  async batchAnalyzeEmails(
    emails: EmailData[],
    progressCallback?: BatchProgressCallback
  ): Promise<Map<string, EmailInsight>> {
    const results = new Map<string, EmailInsight>();

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      try {
        const insight = await this.analyzeEmail(email);
        results.set(email.id, insight);

        if (progressCallback) {
          progressCallback(i + 1, emails.length, email.subject);
        }

        // Rate limiting
        if (i < emails.length - 1) {
          await this.delay(this.RATE_LIMIT_DELAY);
        }
      } catch (error) {
        console.error(`Failed to analyze email ${email.id}:`, error);
      }
    }

    return results;
  }

  // ADVANCED EMAIL ORGANIZATION

  /**
   * Smart categorization with machine learning patterns
   */
  smartCategorizeEmail(email: EmailData): {
    category: string;
    confidence: number;
    subcategory?: string;
  } {
    const patterns = {
      newsletter: {
        keywords: ["newsletter", "unsubscribe", "marketing", "campaign"],
        senderPatterns: ["noreply", "no-reply", "newsletter", "marketing"],
        confidence: 0.9,
      },
      promotional: {
        keywords: [
          "sale",
          "deal",
          "offer",
          "discount",
          "% off",
          "limited time",
          "shop now",
        ],
        senderPatterns: ["store", "shop", "retail", "sales"],
        confidence: 0.85,
      },
      financial: {
        keywords: [
          "invoice",
          "payment",
          "receipt",
          "bank",
          "transaction",
          "bill",
        ],
        senderPatterns: ["bank", "paypal", "stripe", "billing"],
        confidence: 0.95,
      },
      work: {
        keywords: ["meeting", "project", "deadline", "urgent", "asap", "task"],
        senderPatterns: ["@company.com", "@corp.com", "@organization.org"],
        confidence: 0.8,
      },
      social: {
        keywords: ["notification", "tagged", "commented", "liked", "shared"],
        senderPatterns: [
          "facebook",
          "twitter",
          "linkedin",
          "instagram",
          "social",
        ],
        confidence: 0.9,
      },
    };

    const content = `${email.subject} ${email.snippet}`.toLowerCase();
    const from = email.from.toLowerCase();

    let bestMatch = { category: "personal", confidence: 0.3 };

    for (const [category, pattern] of Object.entries(patterns)) {
      let score = 0;
      let matches = 0;

      // Check keywords
      for (const keyword of pattern.keywords) {
        if (content.includes(keyword)) {
          score += 0.2;
          matches++;
        }
      }

      // Check sender patterns
      for (const senderPattern of pattern.senderPatterns) {
        if (from.includes(senderPattern)) {
          score += 0.4;
          matches++;
        }
      }

      // Calculate confidence
      const confidence = Math.min(
        pattern.confidence,
        score *
          (matches / (pattern.keywords.length + pattern.senderPatterns.length))
      );

      if (confidence > bestMatch.confidence) {
        bestMatch = { category, confidence };
      }
    }

    return bestMatch;
  }

  /**
   * Get email threads with enhanced metadata
   */
  async getEmailThreads(maxResults: number = 20): Promise<EmailThread[]> {
    try {
      const threadsResponse = await this.gmail.users.threads.list({
        userId: "me",
        maxResults,
        q: "in:inbox",
      });

      const threads = threadsResponse.data.threads || [];
      const threadDetails: EmailThread[] = [];

      for (const thread of threads) {
        try {
          const threadDetail = await this.gmail.users.threads.get({
            userId: "me",
            id: thread.id!,
            format: "metadata",
            metadataHeaders: ["Subject", "From", "Date"],
          });

          const messages = threadDetail.data.messages || [];
          const firstMessage = messages[0];
          const lastMessage = messages[messages.length - 1];

          if (!firstMessage) continue;

          const headers = firstMessage.payload?.headers || [];
          const getHeader = (name: string) =>
            headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
              ?.value || "";

          const participants = new Set<string>();
          messages.forEach((msg) => {
            const msgHeaders = msg.payload?.headers || [];
            const from = msgHeaders.find(
              (h) => h.name?.toLowerCase() === "from"
            )?.value;
            if (from) {
              participants.add(this.extractEmailAddress(from));
            }
          });

          const hasAttachments = messages.some((msg) =>
            msg.payload?.parts?.some(
              (part) => part.filename && part.filename.length > 0
            )
          );

          threadDetails.push({
            id: thread.id!,
            subject: getHeader("Subject") || "No Subject",
            participants: Array.from(participants),
            messageCount: messages.length,
            lastMessageDate: this.formatDate(getHeader("Date")),
            isRead: !lastMessage.labelIds?.includes("UNREAD"),
            hasAttachments,
            labels: lastMessage.labelIds || [],
            snippet: threadDetail.data.snippet || "",
          });

          await this.delay(this.RATE_LIMIT_DELAY);
        } catch (error) {
          console.error(`Error processing thread ${thread.id}:`, error);
        }
      }

      return threadDetails;
    } catch (error) {
      console.error("Error fetching email threads:", error);
      throw new Error("Failed to fetch email threads");
    }
  }

  // SMART FILTERS AND AUTOMATION

  /**
   * Apply smart filters to emails
   */
  async applySmartFilter(
    filter: SmartFilter,
    emails: EmailData[]
  ): Promise<{
    matchedEmails: EmailData[];
    results: BulkOperationResult[];
  }> {
    const matchedEmails = emails.filter((email) =>
      this.evaluateFilterConditions(email, filter.conditions)
    );
    const results: BulkOperationResult[] = [];

    for (const action of filter.actions) {
      const emailIds = matchedEmails.map((e) => e.id);
      let result: BulkOperationResult;

      switch (action.type) {
        case "archive":
          result = await this.archiveEmails(emailIds);
          break;
        case "delete":
          result = await this.deleteEmails(emailIds);
          break;
        case "label":
          if (action.value) {
            result = await this.labelEmails(emailIds, [action.value]);
          } else {
            result = {
              success: false,
              processedCount: 0,
              errors: ["No label specified"],
            };
          }
          break;
        case "markAsRead":
          result = await this.markAsRead(emailIds);
          break;
        default:
          result = {
            success: false,
            processedCount: 0,
            errors: [`Unknown action: ${action.type}`],
          };
      }

      results.push(result);
    }

    return { matchedEmails, results };
  }

  /**
   * Get comprehensive email analytics
   */
  async getEmailAnalytics(days: number = 30): Promise<EmailAnalytics> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const query = `after:${Math.floor(cutoffDate.getTime() / 1000)}`;
    const emails = await this.getEmailsByQuery(query, 1000);

    // Top senders analysis
    const senderMap = new Map<string, { count: number; lastSeen: string }>();
    emails.forEach((email) => {
      const existing = senderMap.get(email.from) || {
        count: 0,
        lastSeen: email.date,
      };
      senderMap.set(email.from, {
        count: existing.count + 1,
        lastSeen:
          new Date(email.date) > new Date(existing.lastSeen)
            ? email.date
            : existing.lastSeen,
      });
    });

    const topSenders = Array.from(senderMap.entries())
      .map(([email, data]) => ({ email, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Category distribution
    const categoryMap = new Map<string, number>();
    emails.forEach((email) => {
      const { category } = this.smartCategorizeEmail(email);
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    const categoryDistribution = Object.fromEntries(categoryMap);

    // Volume trends (daily)
    const volumeMap = new Map<string, number>();
    emails.forEach((email) => {
      const date = new Date(email.date).toISOString().split("T")[0];
      volumeMap.set(date, (volumeMap.get(date) || 0) + 1);
    });

    const volumeTrends = Array.from(volumeMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Mock response time stats (would need thread analysis for real data)
    const responseTimeStats = {
      average: 4.2,
      median: 2.1,
      fastest: 0.5,
      slowest: 24.5,
    };

    // Unread trends (mock data - would need historical queries)
    const unreadTrends = volumeTrends.map((trend) => ({
      date: trend.date,
      count: Math.floor(trend.count * 0.3), // Assume 30% unread rate
    }));

    return {
      topSenders,
      categoryDistribution,
      volumeTrends,
      responseTimeStats,
      unreadTrends,
    };
  }

  // HELPER METHODS

  private detectSentiment(
    content: string
  ): "positive" | "negative" | "neutral" {
    const positiveWords = [
      "great",
      "excellent",
      "amazing",
      "wonderful",
      "fantastic",
      "love",
      "perfect",
      "awesome",
    ];
    const negativeWords = [
      "terrible",
      "awful",
      "hate",
      "worst",
      "horrible",
      "disappointed",
      "frustrated",
      "angry",
    ];

    const positiveScore = positiveWords.filter((word) =>
      content.includes(word)
    ).length;
    const negativeScore = negativeWords.filter((word) =>
      content.includes(word)
    ).length;

    if (positiveScore > negativeScore) return "positive";
    if (negativeScore > positiveScore) return "negative";
    return "neutral";
  }

  private detectPriority(email: EmailData): "high" | "medium" | "low" {
    const subject = email.subject.toLowerCase();
    const snippet = email.snippet.toLowerCase();
    const content = `${subject} ${snippet}`;

    const highPriorityWords = [
      "urgent",
      "asap",
      "important",
      "critical",
      "emergency",
      "deadline",
    ];
    const mediumPriorityWords = [
      "meeting",
      "schedule",
      "reminder",
      "follow up",
      "action required",
    ];

    if (highPriorityWords.some((word) => content.includes(word))) return "high";
    if (mediumPriorityWords.some((word) => content.includes(word)))
      return "medium";
    return "low";
  }

  private detectActionRequired(content: string): boolean {
    const actionWords = [
      "please",
      "could you",
      "can you",
      "need",
      "required",
      "rsvp",
      "confirm",
      "respond",
    ];
    return actionWords.some((word) => content.includes(word));
  }

  private generateSuggestedActions(email: EmailData): string[] {
    const actions: string[] = [];
    const content = `${email.subject} ${email.snippet}`.toLowerCase();

    if (content.includes("meeting") || content.includes("calendar")) {
      actions.push("Add to calendar");
    }
    if (content.includes("attachment") || content.includes("document")) {
      actions.push("Download attachments");
    }
    if (content.includes("rsvp") || content.includes("confirm")) {
      actions.push("Send response");
    }
    if (content.includes("invoice") || content.includes("payment")) {
      actions.push("Process payment");
    }
    if (!email.isRead) {
      actions.push("Mark as read");
    }

    return actions;
  }

  private extractKeyTopics(content: string): string[] {
    const topics: string[] = [];
    const words = content.split(/\s+/);

    // Simple topic extraction based on word frequency and common patterns
    const topicPatterns = {
      Meeting: ["meeting", "call", "zoom", "conference"],
      Project: ["project", "task", "deliverable", "milestone"],
      Finance: ["payment", "invoice", "budget", "cost"],
      Travel: ["flight", "hotel", "travel", "trip"],
      Marketing: ["campaign", "launch", "promotion", "advertising"],
    };

    for (const [topic, keywords] of Object.entries(topicPatterns)) {
      if (keywords.some((keyword) => content.includes(keyword))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  private evaluateFilterConditions(
    email: EmailData,
    conditions: FilterCondition[]
  ): boolean {
    return conditions.every((condition) => {
      const fieldValue = this.getFieldValue(email, condition.field);
      return this.evaluateCondition(fieldValue, condition);
    });
  }

  private getFieldValue(
    email: EmailData,
    field: FilterCondition["field"]
  ): string {
    switch (field) {
      case "from":
        return email.from;
      case "subject":
        return email.subject;
      case "body":
        return email.snippet;
      case "hasAttachment":
        return "false"; // Would need full message for this
      case "isUnread":
        return (!email.isRead).toString();
      case "date":
        return email.date;
      default:
        return "";
    }
  }

  private evaluateCondition(
    value: string,
    condition: FilterCondition
  ): boolean {
    const compareValue = condition.caseSensitive ? value : value.toLowerCase();
    const conditionValue = condition.caseSensitive
      ? condition.value
      : condition.value.toLowerCase();

    switch (condition.operator) {
      case "contains":
        return compareValue.includes(conditionValue);
      case "equals":
        return compareValue === conditionValue;
      case "startsWith":
        return compareValue.startsWith(conditionValue);
      case "endsWith":
        return compareValue.endsWith(conditionValue);
      case "regex":
        return new RegExp(condition.value).test(value);
      default:
        return false;
    }
  }

  private extractEmailAddress(fromHeader: string): string {
    const emailMatch = fromHeader.match(/<([^>]+)>/);
    return emailMatch ? emailMatch[1] : fromHeader;
  }

  private formatDate(dateString: string): string {
    if (!dateString) return "Unknown";
    return new Date(dateString).toISOString();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Delegate to existing service methods
  async getEmailsByQuery(
    query: string,
    maxResults: number = 100
  ): Promise<EmailData[]> {
    // Implementation would use the existing getEmailsByQuery method
    throw new Error("Method should delegate to existing GmailService");
  }

  async archiveEmails(emailIds: string[]): Promise<BulkOperationResult> {
    // Implementation would use the existing archiveEmails method
    throw new Error("Method should delegate to existing GmailService");
  }

  async deleteEmails(emailIds: string[]): Promise<BulkOperationResult> {
    // Implementation would use the existing deleteEmails method
    throw new Error("Method should delegate to existing GmailService");
  }

  async labelEmails(
    emailIds: string[],
    labelIds: string[]
  ): Promise<BulkOperationResult> {
    // Implementation would use the existing labelEmails method
    throw new Error("Method should delegate to existing GmailService");
  }

  async markAsRead(emailIds: string[]): Promise<BulkOperationResult> {
    // Implementation would use the existing markAsRead method
    throw new Error("Method should delegate to existing GmailService");
  }
}
