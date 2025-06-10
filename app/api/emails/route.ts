import { createClient } from "@/lib/supabase/server";
import { GmailService } from "@/lib/gmail/service";
import { NextRequest, NextResponse } from "next/server";

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

    // Get the session to access the provider token
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }

    // Check if we have a Google provider token
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

    // Initialize Gmail service with the access token
    const gmailService = new GmailService(providerToken);

    // Get query parameters
    const url = new URL(request.url);
    const maxResults = parseInt(url.searchParams.get("maxResults") || "5");

    // Fetch emails and counts
    const [emails, counts] = await Promise.all([
      gmailService.getRecentEmails(maxResults),
      gmailService.getEmailCount(),
    ]);

    return NextResponse.json({
      emails,
      counts,
      success: true,
    });
  } catch (error: any) {
    console.error("Error fetching emails:", error);

    // Handle specific Gmail API errors
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
      {
        error: "Failed to fetch emails",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
