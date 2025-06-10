import { EmailData, EmailAnalytics } from "./enhanced-service";

export interface CacheConfig {
  emailTTL: number; // seconds
  analyticsTTL: number; // seconds
  maxCacheSize: number; // number of items
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export class GmailCacheService {
  private emailCache = new Map<string, CacheEntry<EmailData[]>>();
  private analyticsCache = new Map<string, CacheEntry<EmailAnalytics>>();
  private countsCache = new Map<
    string,
    CacheEntry<{ total: number; unread: number }>
  >();
  private labelsCache = new Map<string, CacheEntry<any[]>>();

  private stats = {
    hits: 0,
    misses: 0,
  };

  private config: CacheConfig = {
    emailTTL: 300, // 5 minutes
    analyticsTTL: 3600, // 1 hour
    maxCacheSize: 1000,
  };

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Setup periodic cleanup
    setInterval(() => this.cleanup(), 60000); // Clean up every minute
  }

  // Email caching methods
  getCachedEmails(key: string): EmailData[] | null {
    const entry = this.emailCache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.emailCache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  setCachedEmails(key: string, emails: EmailData[]): void {
    this.ensureCacheSize(this.emailCache);
    this.emailCache.set(key, {
      data: emails,
      timestamp: Date.now(),
      ttl: this.config.emailTTL * 1000,
    });
  }

  // Analytics caching methods
  getCachedAnalytics(key: string): EmailAnalytics | null {
    const entry = this.analyticsCache.get(key);
    if (!entry || this.isExpired(entry)) {
      this.stats.misses++;
      if (entry) this.analyticsCache.delete(key);
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  setCachedAnalytics(key: string, analytics: EmailAnalytics): void {
    this.ensureCacheSize(this.analyticsCache);
    this.analyticsCache.set(key, {
      data: analytics,
      timestamp: Date.now(),
      ttl: this.config.analyticsTTL * 1000,
    });
  }

  // Email counts caching
  getCachedCounts(key: string): { total: number; unread: number } | null {
    const entry = this.countsCache.get(key);
    if (!entry || this.isExpired(entry)) {
      this.stats.misses++;
      if (entry) this.countsCache.delete(key);
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  setCachedCounts(
    key: string,
    counts: { total: number; unread: number }
  ): void {
    this.ensureCacheSize(this.countsCache);
    this.countsCache.set(key, {
      data: counts,
      timestamp: Date.now(),
      ttl: this.config.emailTTL * 1000,
    });
  }

  // Labels caching
  getCachedLabels(key: string): any[] | null {
    const entry = this.labelsCache.get(key);
    if (!entry || this.isExpired(entry)) {
      this.stats.misses++;
      if (entry) this.labelsCache.delete(key);
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  setCachedLabels(key: string, labels: any[]): void {
    this.ensureCacheSize(this.labelsCache);
    this.labelsCache.set(key, {
      data: labels,
      timestamp: Date.now(),
      ttl: this.config.analyticsTTL * 1000, // Labels don't change often
    });
  }

  // Cache management
  invalidateEmailsCache(): void {
    this.emailCache.clear();
  }

  invalidateAnalyticsCache(): void {
    this.analyticsCache.clear();
  }

  invalidateAll(): void {
    this.emailCache.clear();
    this.analyticsCache.clear();
    this.countsCache.clear();
    this.labelsCache.clear();
  }

  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size:
        this.emailCache.size +
        this.analyticsCache.size +
        this.countsCache.size +
        this.labelsCache.size,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
    };
  }

  // Cache key generators
  static generateEmailKey(query: string, maxResults: number): string {
    return `emails:${query}:${maxResults}`;
  }

  static generateAnalyticsKey(days: number): string {
    return `analytics:${days}`;
  }

  static generateCountsKey(): string {
    return "counts:current";
  }

  static generateLabelsKey(): string {
    return "labels:all";
  }

  // Private helper methods
  private isExpired<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private ensureCacheSize<T>(cache: Map<string, CacheEntry<T>>): void {
    if (cache.size >= this.config.maxCacheSize) {
      // Remove oldest entries (simple LRU)
      const sortedEntries = Array.from(cache.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp
      );

      const toRemove = Math.floor(this.config.maxCacheSize * 0.1); // Remove 10%
      for (let i = 0; i < toRemove; i++) {
        cache.delete(sortedEntries[i][0]);
      }
    }
  }

  private cleanup(): void {
    // Remove expired entries
    [
      this.emailCache,
      this.analyticsCache,
      this.countsCache,
      this.labelsCache,
    ].forEach((cache) => {
      for (const [key, entry] of cache.entries()) {
        if (this.isExpired(entry)) {
          cache.delete(key);
        }
      }
    });
  }
}
