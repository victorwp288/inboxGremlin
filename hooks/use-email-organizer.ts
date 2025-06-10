"use client";

import { useState } from "react";
import { BulkOperationResult } from "@/lib/gmail/service";

interface OrganizeAction {
  action:
    | "archive"
    | "delete"
    | "label"
    | "markAsRead"
    | "getByQuery"
    | "categorize";
  emailIds?: string[];
  labelIds?: string[];
  query?: string;
  maxResults?: number;
}

interface UseEmailOrganizerResult {
  loading: boolean;
  error: string | null;
  lastResult: any;
  organizeEmails: (actionParams: OrganizeAction) => Promise<any>;
  archiveOldEmails: (days: number) => Promise<any>;
  categorizeInbox: () => Promise<any>;
  bulkCleanup: () => Promise<any>;
}

export function useEmailOrganizer(): UseEmailOrganizerResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  const organizeEmails = async (actionParams: OrganizeAction) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/emails/organize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(actionParams),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to organize emails");
      }

      setLastResult(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      console.error("Error organizing emails:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const archiveOldEmails = async (days: number = 30) => {
    const olderThanDate = new Date();
    olderThanDate.setDate(olderThanDate.getDate() - days);
    const dateStr = olderThanDate.toISOString().split("T")[0]; // YYYY-MM-DD format

    // First get emails older than specified days
    const emailsResponse = await organizeEmails({
      action: "getByQuery",
      query: `in:inbox older_than:${days}d`,
      maxResults: 500,
    });

    if (emailsResponse.emails && emailsResponse.emails.length > 0) {
      // Archive them
      const archiveResult = await organizeEmails({
        action: "archive",
        emailIds: emailsResponse.emails.map((email: any) => email.id),
      });

      return {
        ...archiveResult,
        foundEmails: emailsResponse.emails.length,
        query: `older_than:${days}d`,
      };
    }

    return {
      success: true,
      processedCount: 0,
      foundEmails: 0,
      message: `No emails older than ${days} days found`,
    };
  };

  const categorizeInbox = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all inbox emails for categorization
      const result = await organizeEmails({
        action: "categorize",
        query: "in:inbox",
        maxResults: 200,
      });

      // Group emails by category
      const categorizedResults = result.emails.reduce(
        (acc: any, email: any) => {
          const category = email.category;
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(email);
          return acc;
        },
        {}
      );

      return {
        success: true,
        totalEmails: result.emails.length,
        categories: categorizedResults,
        categoryStats: Object.keys(categorizedResults).map((category) => ({
          category,
          count: categorizedResults[category].length,
          percentage: Math.round(
            (categorizedResults[category].length / result.emails.length) * 100
          ),
        })),
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const bulkCleanup = async () => {
    try {
      setLoading(true);
      setError(null);

      const results = {
        newsletter: { success: false, processedCount: 0 },
        promotional: { success: false, processedCount: 0 },
        oldEmails: { success: false, processedCount: 0 },
        social: { success: false, processedCount: 0 },
        totalProcessed: 0,
      };

      // 1. Archive old promotional emails (older than 7 days)
      try {
        const promoEmailsResponse = await organizeEmails({
          action: "getByQuery",
          query:
            'in:inbox (sale OR deal OR offer OR discount OR "% off" OR "shop now") older_than:7d',
          maxResults: 200,
        });

        if (promoEmailsResponse.emails?.length > 0) {
          const promoResult = await organizeEmails({
            action: "archive",
            emailIds: promoEmailsResponse.emails.map((email: any) => email.id),
          });
          results.promotional = promoResult;
          results.totalProcessed += promoResult.processedCount;
        }
      } catch (err) {
        console.error("Error cleaning promotional emails:", err);
      }

      // 2. Archive old newsletter emails (older than 14 days)
      try {
        const newsletterEmailsResponse = await organizeEmails({
          action: "getByQuery",
          query:
            'in:inbox (newsletter OR unsubscribe OR "no-reply" OR noreply) older_than:14d',
          maxResults: 200,
        });

        if (newsletterEmailsResponse.emails?.length > 0) {
          const newsletterResult = await organizeEmails({
            action: "archive",
            emailIds: newsletterEmailsResponse.emails.map(
              (email: any) => email.id
            ),
          });
          results.newsletter = newsletterResult;
          results.totalProcessed += newsletterResult.processedCount;
        }
      } catch (err) {
        console.error("Error cleaning newsletter emails:", err);
      }

      // 3. Archive social media notifications (older than 3 days)
      try {
        const socialEmailsResponse = await organizeEmails({
          action: "getByQuery",
          query:
            "in:inbox (facebook OR twitter OR linkedin OR instagram OR notification) older_than:3d",
          maxResults: 200,
        });

        if (socialEmailsResponse.emails?.length > 0) {
          const socialResult = await organizeEmails({
            action: "archive",
            emailIds: socialEmailsResponse.emails.map((email: any) => email.id),
          });
          results.social = socialResult;
          results.totalProcessed += socialResult.processedCount;
        }
      } catch (err) {
        console.error("Error cleaning social emails:", err);
      }

      // 4. Archive very old emails (older than 90 days)
      try {
        const oldEmailsResult = await archiveOldEmails(90);
        results.oldEmails = oldEmailsResult;
        results.totalProcessed += oldEmailsResult.processedCount;
      } catch (err) {
        console.error("Error archiving old emails:", err);
      }

      const finalResult = {
        success: results.totalProcessed > 0,
        results,
        summary: `Processed ${results.totalProcessed} emails total`,
      };

      setLastResult(finalResult);
      return finalResult;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    lastResult,
    organizeEmails,
    archiveOldEmails,
    categorizeInbox,
    bulkCleanup,
  };
}
