import { createClient } from "@/lib/supabase/server";
import { GmailService } from "@/lib/gmail/service";
import { GmailEnhancedService } from "@/lib/gmail/enhanced-service";
import { GmailCacheService } from "@/lib/gmail/cache-service";
import { gmailErrorHandler } from "@/lib/gmail/error-handler";
import { NextRequest, NextResponse } from "next/server";

// Global cache instance (in production, you'd use Redis or similar)
const cacheService = new GmailCacheService();

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }

    const providerToken = session.provider_token;
    if (!providerToken) {
      return NextResponse.json(
        {
          error:
            "No Gmail access token found. Please re-authenticate with Google.",
        },
        { status: 403 }
      );
    }

    // Initialize services
    const gmailService = new GmailService(providerToken);
    const enhancedService = new GmailEnhancedService(providerToken);

    // Get query parameters
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "dashboard";
    const maxResults = parseInt(url.searchParams.get("maxResults") || "20");
    const days = parseInt(url.searchParams.get("days") || "30");
    const query = url.searchParams.get("query") || "in:inbox";

    switch (action) {
      case "dashboard":
        return await handleDashboard(gmailService, enhancedService, maxResults);

      case "analytics":
        return await handleAnalytics(enhancedService, days);

      case "insights":
        return await handleInsights(
          gmailService,
          enhancedService,
          query,
          maxResults
        );

      case "threads":
        return await handleThreads(enhancedService, maxResults);

      case "cache-stats":
        return await handleCacheStats();

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Enhanced API error:", error);

    if (error.message?.includes("insufficient authentication scopes")) {
      return NextResponse.json(
        {
          error:
            "Insufficient Gmail permissions. Please re-authenticate with Google.",
          needsReauth: true,
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process request", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }

    const providerToken = session.provider_token;
    if (!providerToken) {
      return NextResponse.json(
        {
          error:
            "No Gmail access token found. Please re-authenticate with Google.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, ...params } = body;

    const gmailService = new GmailService(providerToken);
    const enhancedService = new GmailEnhancedService(providerToken);

    switch (action) {
      case "analyze_batch":
        return await handleBatchAnalysis(gmailService, enhancedService, params);

      case "smart_categorize":
        return await handleSmartCategorization(
          gmailService,
          enhancedService,
          params
        );

      case "apply_filter":
        return await handleApplyFilter(gmailService, enhancedService, params);

      case "clear_cache":
        return await handleClearCache(params);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Enhanced API POST error:", error);
    return NextResponse.json(
      { error: "Failed to process request", details: error.message },
      { status: 500 }
    );
  }
}

// Handler functions
async function handleDashboard(
  gmailService: GmailService,
  enhancedService: GmailEnhancedService,
  maxResults: number
) {
  const cacheKey = GmailCacheService.generateEmailKey("dashboard", maxResults);
  let emails = cacheService.getCachedEmails(cacheKey);

  if (!emails) {
    emails = await gmailErrorHandler.executeWithRetry(
      () => gmailService.getRecentEmails(maxResults),
      "dashboard_emails"
    );
    cacheService.setCachedEmails(cacheKey, emails);
  }

  const countsKey = GmailCacheService.generateCountsKey();
  let counts = cacheService.getCachedCounts(countsKey);

  if (!counts) {
    counts = await gmailErrorHandler.executeWithRetry(
      () => gmailService.getEmailCount(),
      "email_counts"
    );
    cacheService.setCachedCounts(countsKey, counts);
  }

  // Get quick insights for recent emails
  const insights = new Map();
  for (const email of emails.slice(0, 5)) {
    const insight = await enhancedService.analyzeEmail(email);
    insights.set(email.id, insight);
  }

  return NextResponse.json({
    success: true,
    data: {
      emails,
      counts,
      insights: Object.fromEntries(insights),
      cacheStats: cacheService.getStats(),
    },
  });
}

async function handleAnalytics(
  enhancedService: GmailEnhancedService,
  days: number
) {
  const cacheKey = GmailCacheService.generateAnalyticsKey(days);
  let analytics = cacheService.getCachedAnalytics(cacheKey);

  if (!analytics) {
    analytics = await gmailErrorHandler.executeWithRetry(
      () => enhancedService.getEmailAnalytics(days),
      "email_analytics"
    );
    cacheService.setCachedAnalytics(cacheKey, analytics);
  }

  return NextResponse.json({
    success: true,
    data: analytics,
  });
}

async function handleInsights(
  gmailService: GmailService,
  enhancedService: GmailEnhancedService,
  query: string,
  maxResults: number
) {
  const emails = await gmailErrorHandler.executeWithRetry(
    () => gmailService.getEmailsByQuery(query, maxResults),
    "insights_emails"
  );

  const insights = await enhancedService.batchAnalyzeEmails(emails);

  return NextResponse.json({
    success: true,
    data: {
      emails,
      insights: Object.fromEntries(insights),
      summary: {
        totalEmails: emails.length,
        highPriority: Array.from(insights.values()).filter(
          (i) => i.priority === "high"
        ).length,
        actionRequired: Array.from(insights.values()).filter(
          (i) => i.actionRequired
        ).length,
        averageReadTime:
          Array.from(insights.values()).reduce(
            (sum, i) => sum + i.estimatedReadTime,
            0
          ) / insights.size,
      },
    },
  });
}

async function handleThreads(
  enhancedService: GmailEnhancedService,
  maxResults: number
) {
  const threads = await gmailErrorHandler.executeWithRetry(
    () => enhancedService.getEmailThreads(maxResults),
    "email_threads"
  );

  return NextResponse.json({
    success: true,
    data: threads,
  });
}

async function handleCacheStats() {
  return NextResponse.json({
    success: true,
    data: cacheService.getStats(),
  });
}

async function handleBatchAnalysis(
  gmailService: GmailService,
  enhancedService: GmailEnhancedService,
  params: any
) {
  const { query, maxResults = 50 } = params;

  const emails = await gmailErrorHandler.executeWithRetry(
    () => gmailService.getEmailsByQuery(query, maxResults),
    "batch_analysis"
  );

  const insights = await enhancedService.batchAnalyzeEmails(emails);

  return NextResponse.json({
    success: true,
    data: {
      processedCount: emails.length,
      insights: Object.fromEntries(insights),
    },
  });
}

async function handleSmartCategorization(
  gmailService: GmailService,
  enhancedService: GmailEnhancedService,
  params: any
) {
  const { query, maxResults = 100 } = params;

  const emails = await gmailErrorHandler.executeWithRetry(
    () => gmailService.getEmailsByQuery(query, maxResults),
    "smart_categorization"
  );

  const categorized = emails.map((email) => ({
    ...email,
    smartCategory: enhancedService.smartCategorizeEmail(email),
  }));

  // Group by category
  const categoryGroups = categorized.reduce((groups, email) => {
    const category = email.smartCategory.category;
    if (!groups[category]) groups[category] = [];
    groups[category].push(email);
    return groups;
  }, {} as Record<string, any[]>);

  return NextResponse.json({
    success: true,
    data: {
      totalEmails: emails.length,
      categories: categoryGroups,
      distribution: Object.entries(categoryGroups).map(
        ([category, emails]) => ({
          category,
          count: emails.length,
          percentage: (emails.length / categorized.length) * 100,
        })
      ),
    },
  });
}

async function handleApplyFilter(
  gmailService: GmailService,
  enhancedService: GmailEnhancedService,
  params: any
) {
  const { filter, emails: emailIds } = params;

  // Get full email data if only IDs provided
  let emails;
  if (emailIds && Array.isArray(emailIds)) {
    // This is a simplified version - in reality you'd fetch these emails
    emails = await Promise.all(
      emailIds.map(async (id: string) => {
        // Fetch individual email data
        return null; // Placeholder
      })
    );
  } else {
    emails = await gmailErrorHandler.executeWithRetry(
      () => gmailService.getEmailsByQuery("in:inbox", 100),
      "filter_emails"
    );
  }

  const result = await enhancedService.applySmartFilter(filter, emails);

  return NextResponse.json({
    success: true,
    data: {
      matchedCount: result.matchedEmails.length,
      results: result.results,
    },
  });
}

async function handleClearCache(params: any) {
  const { type = "all" } = params;

  switch (type) {
    case "emails":
      cacheService.invalidateEmailsCache();
      break;
    case "analytics":
      cacheService.invalidateAnalyticsCache();
      break;
    case "all":
    default:
      cacheService.invalidateAll();
      break;
  }

  return NextResponse.json({
    success: true,
    message: `Cache cleared: ${type}`,
  });
}
