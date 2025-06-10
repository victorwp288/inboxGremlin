"use client";

import { useState, useEffect } from "react";
import { EmailData } from "@/lib/gmail/service";

interface GmailData {
  emails: EmailData[];
  counts: {
    total: number;
    unread: number;
  };
}

interface UseGmailResult {
  data: GmailData | null;
  loading: boolean;
  error: string | null;
  needsReauth: boolean;
  refetch: () => Promise<void>;
}

export function useGmail(maxResults: number = 5): UseGmailResult {
  const [data, setData] = useState<GmailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      setNeedsReauth(false);

      const response = await fetch(`/api/emails?maxResults=${maxResults}`);
      const result = await response.json();

      if (!response.ok) {
        if (result.needsReauth) {
          setNeedsReauth(true);
        }
        throw new Error(result.error || "Failed to fetch emails");
      }

      setData({
        emails: result.emails,
        counts: result.counts,
      });
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching Gmail data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [maxResults]);

  return {
    data,
    loading,
    error,
    needsReauth,
    refetch: fetchEmails,
  };
}
