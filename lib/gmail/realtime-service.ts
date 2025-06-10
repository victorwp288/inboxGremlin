import { EmailData } from "./service";
import { GmailCacheService } from "./cache-service";
import { gmailErrorHandler } from "./error-handler";

export interface EmailChangeEvent {
  type:
    | "new_email"
    | "email_read"
    | "email_deleted"
    | "email_archived"
    | "labels_changed";
  emailId: string;
  email?: EmailData;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface SyncProgress {
  phase:
    | "starting"
    | "fetching"
    | "processing"
    | "caching"
    | "complete"
    | "error";
  progress: number; // 0-100
  message: string;
  errors?: string[];
}

export interface NotificationRule {
  id: string;
  name: string;
  conditions: {
    senderPatterns?: string[];
    subjectKeywords?: string[];
    priority?: "high" | "medium" | "low";
    categories?: string[];
  };
  actions: {
    showNotification?: boolean;
    playSound?: boolean;
    markAsImportant?: boolean;
    forwardTo?: string;
  };
  enabled: boolean;
}

export type EmailChangeListener = (event: EmailChangeEvent) => void;
export type SyncProgressListener = (progress: SyncProgress) => void;

export class GmailRealtimeService {
  private listeners: Set<EmailChangeListener> = new Set();
  private syncListeners: Set<SyncProgressListener> = new Set();
  private isPolling = false;
  private pollingInterval = 30000; // 30 seconds
  private lastSync = 0;
  private syncTimer: NodeJS.Timeout | null = null;
  private notificationRules: NotificationRule[] = [];

  constructor(
    private gmailService: any, // Your existing GmailService
    private cacheService?: GmailCacheService
  ) {
    // Bind methods to ensure proper context
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);

    // Setup browser event listeners
    if (typeof document !== "undefined") {
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange
      );
    }
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
    }
  }

  // Event subscription methods
  addEmailChangeListener(listener: EmailChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  addSyncProgressListener(listener: SyncProgressListener): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  // Real-time monitoring
  async startRealtimeMonitoring(): Promise<void> {
    if (this.isPolling) {
      console.warn("Real-time monitoring is already active");
      return;
    }

    console.log("Starting real-time email monitoring...");
    this.isPolling = true;
    await this.performInitialSync();
    this.scheduleNextPoll();
  }

  stopRealtimeMonitoring(): void {
    console.log("Stopping real-time email monitoring...");
    this.isPolling = false;

    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // Background synchronization
  async performBackgroundSync(): Promise<void> {
    if (!this.isPolling) return;

    this.notifySyncProgress({
      phase: "starting",
      progress: 0,
      message: "Starting background sync...",
    });

    try {
      // Get recent emails to check for changes
      const recentEmails = await gmailErrorHandler.executeWithRetry(
        () => this.gmailService.getRecentEmails(50),
        "background_sync"
      );

      // Check for new emails
      const newEmails = await this.detectNewEmails(recentEmails);

      // Process new emails
      for (const email of newEmails) {
        this.notifyEmailChange({
          type: "new_email",
          emailId: email.id,
          email,
          timestamp: Date.now(),
        });

        // Check notification rules
        await this.processNotificationRules(email);
      }

      // Update cache
      if (this.cacheService) {
        const cacheKey = GmailCacheService.generateEmailKey("in:inbox", 50);
        this.cacheService.setCachedEmails(cacheKey, recentEmails);
      }

      this.lastSync = Date.now();

      this.notifySyncProgress({
        phase: "complete",
        progress: 100,
        message: `Sync complete. Found ${newEmails.length} new emails.`,
      });
    } catch (error) {
      console.error("Background sync failed:", error);
      this.notifySyncProgress({
        phase: "error",
        progress: 0,
        message: "Sync failed",
        errors: [error.message],
      });
    }
  }

  // Smart notification system
  addNotificationRule(rule: NotificationRule): void {
    this.notificationRules.push(rule);
  }

  removeNotificationRule(ruleId: string): void {
    this.notificationRules = this.notificationRules.filter(
      (rule) => rule.id !== ruleId
    );
  }

  updateNotificationRule(
    ruleId: string,
    updates: Partial<NotificationRule>
  ): void {
    const ruleIndex = this.notificationRules.findIndex(
      (rule) => rule.id === ruleId
    );
    if (ruleIndex !== -1) {
      this.notificationRules[ruleIndex] = {
        ...this.notificationRules[ruleIndex],
        ...updates,
      };
    }
  }

  getNotificationRules(): NotificationRule[] {
    return [...this.notificationRules];
  }

  // Manual sync trigger
  async triggerManualSync(): Promise<void> {
    await this.performBackgroundSync();
  }

  // Email change detection
  async detectEmailChanges(
    previousEmails: EmailData[],
    currentEmails: EmailData[]
  ): Promise<EmailChangeEvent[]> {
    const events: EmailChangeEvent[] = [];
    const previousMap = new Map(previousEmails.map((e) => [e.id, e]));
    const currentMap = new Map(currentEmails.map((e) => [e.id, e]));

    // Check for new emails
    for (const [id, email] of currentMap) {
      if (!previousMap.has(id)) {
        events.push({
          type: "new_email",
          emailId: id,
          email,
          timestamp: Date.now(),
        });
      }
    }

    // Check for status changes
    for (const [id, currentEmail] of currentMap) {
      const previousEmail = previousMap.get(id);
      if (previousEmail) {
        // Check if read status changed
        if (
          previousEmail.isRead !== currentEmail.isRead &&
          currentEmail.isRead
        ) {
          events.push({
            type: "email_read",
            emailId: id,
            email: currentEmail,
            timestamp: Date.now(),
          });
        }

        // Check if labels changed
        if (
          JSON.stringify(previousEmail.labels) !==
          JSON.stringify(currentEmail.labels)
        ) {
          events.push({
            type: "labels_changed",
            emailId: id,
            email: currentEmail,
            timestamp: Date.now(),
            metadata: {
              previousLabels: previousEmail.labels,
              currentLabels: currentEmail.labels,
            },
          });
        }
      }
    }

    // Check for deleted/archived emails
    for (const [id, email] of previousMap) {
      if (!currentMap.has(id)) {
        events.push({
          type: "email_archived",
          emailId: id,
          email,
          timestamp: Date.now(),
        });
      }
    }

    return events;
  }

  // Browser event handlers
  private handleVisibilityChange(): void {
    if (document.visibilityState === "visible" && this.isPolling) {
      // Page became visible, trigger a sync if it's been a while
      const timeSinceLastSync = Date.now() - this.lastSync;
      if (timeSinceLastSync > this.pollingInterval) {
        this.performBackgroundSync();
      }
    }
  }

  private handleOnline(): void {
    if (this.isPolling && !this.syncTimer) {
      // Reconnected, resume polling
      this.scheduleNextPoll();
    }
  }

  private handleOffline(): void {
    // Offline, pause polling
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // Private helper methods
  private async performInitialSync(): Promise<void> {
    this.notifySyncProgress({
      phase: "starting",
      progress: 0,
      message: "Performing initial sync...",
    });

    try {
      const emails = await gmailErrorHandler.executeWithRetry(
        () => this.gmailService.getRecentEmails(20),
        "initial_sync"
      );

      this.lastSync = Date.now();

      this.notifySyncProgress({
        phase: "complete",
        progress: 100,
        message: `Initial sync complete. ${emails.length} emails loaded.`,
      });
    } catch (error) {
      this.notifySyncProgress({
        phase: "error",
        progress: 0,
        message: "Initial sync failed",
        errors: [error.message],
      });
    }
  }

  private scheduleNextPoll(): void {
    if (!this.isPolling) return;

    this.syncTimer = setTimeout(() => {
      this.performBackgroundSync().then(() => {
        this.scheduleNextPoll();
      });
    }, this.pollingInterval);
  }

  private async detectNewEmails(
    currentEmails: EmailData[]
  ): Promise<EmailData[]> {
    if (!this.cacheService) {
      return currentEmails; // Without cache, assume all are new
    }

    const cacheKey = GmailCacheService.generateEmailKey("in:inbox", 50);
    const cachedEmails = this.cacheService.getCachedEmails(cacheKey);

    if (!cachedEmails) {
      return currentEmails; // No cached data, assume all are new
    }

    const cachedIds = new Set(cachedEmails.map((e) => e.id));
    return currentEmails.filter((email) => !cachedIds.has(email.id));
  }

  private async processNotificationRules(email: EmailData): Promise<void> {
    for (const rule of this.notificationRules) {
      if (!rule.enabled) continue;

      const matches = this.evaluateNotificationRule(email, rule);
      if (matches) {
        await this.executeNotificationActions(email, rule);
      }
    }
  }

  private evaluateNotificationRule(
    email: EmailData,
    rule: NotificationRule
  ): boolean {
    const { conditions } = rule;

    // Check sender patterns
    if (conditions.senderPatterns?.length) {
      const senderMatch = conditions.senderPatterns.some((pattern) =>
        email.from.toLowerCase().includes(pattern.toLowerCase())
      );
      if (!senderMatch) return false;
    }

    // Check subject keywords
    if (conditions.subjectKeywords?.length) {
      const subjectMatch = conditions.subjectKeywords.some((keyword) =>
        email.subject.toLowerCase().includes(keyword.toLowerCase())
      );
      if (!subjectMatch) return false;
    }

    return true; // All conditions passed
  }

  private async executeNotificationActions(
    email: EmailData,
    rule: NotificationRule
  ): Promise<void> {
    const { actions } = rule;

    if (actions.showNotification && "Notification" in window) {
      this.showBrowserNotification(email, rule.name);
    }

    if (actions.playSound) {
      this.playNotificationSound();
    }

    // Additional actions would be implemented here
  }

  private showBrowserNotification(email: EmailData, ruleName: string): void {
    if (Notification.permission === "granted") {
      new Notification(`New Email - ${ruleName}`, {
        body: `From: ${email.from}\nSubject: ${email.subject}`,
        icon: "/favicon.ico",
        tag: email.id,
      });
    }
  }

  private playNotificationSound(): void {
    // Simple notification sound
    const audio = new Audio(
      "data:audio/wav;base64,UklGRvIAAABXQVZFZm10IAAAAABAAAAAIAAAQBAAAA=="
    );
    audio
      .play()
      .catch((e) => console.warn("Could not play notification sound:", e));
  }

  private notifyEmailChange(event: EmailChangeEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in email change listener:", error);
      }
    });
  }

  private notifySyncProgress(progress: SyncProgress): void {
    this.syncListeners.forEach((listener) => {
      try {
        listener(progress);
      } catch (error) {
        console.error("Error in sync progress listener:", error);
      }
    });
  }

  // Cleanup
  destroy(): void {
    this.stopRealtimeMonitoring();

    if (typeof document !== "undefined") {
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange
      );
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }

    this.listeners.clear();
    this.syncListeners.clear();
  }
}
