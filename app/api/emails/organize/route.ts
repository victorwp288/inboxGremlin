import { createClient } from "@/lib/supabase/server";
import { GmailService } from "@/lib/gmail/service";
import { GmailEnhancedService } from "@/lib/gmail/enhanced-service";
import { NextRequest, NextResponse } from "next/server";

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
    const enhancedGmailService = new GmailEnhancedService(providerToken);

    // Parse request body
    const body = await request.json();
    const { action, emailIds, labelIds, query, maxResults = 100, withHistory = false } = body;

    let result;

    switch (action) {
      case "archive":
        if (!emailIds || !Array.isArray(emailIds)) {
          return NextResponse.json(
            { error: "emailIds array is required for archive action" },
            { status: 400 }
          );
        }
        result = withHistory 
          ? await enhancedGmailService.archiveEmailsWithHistory(emailIds)
          : await gmailService.archiveEmails(emailIds);
        break;

      case "delete":
        if (!emailIds || !Array.isArray(emailIds)) {
          return NextResponse.json(
            { error: "emailIds array is required for delete action" },
            { status: 400 }
          );
        }
        result = withHistory
          ? await enhancedGmailService.deleteEmailsWithHistory(emailIds)
          : await gmailService.deleteEmails(emailIds);
        break;

      case "label":
        if (
          !emailIds ||
          !Array.isArray(emailIds) ||
          !labelIds ||
          !Array.isArray(labelIds)
        ) {
          return NextResponse.json(
            {
              error:
                "emailIds and labelIds arrays are required for label action",
            },
            { status: 400 }
          );
        }
        result = withHistory
          ? await enhancedGmailService.labelEmailsWithHistory(emailIds, labelIds)
          : await gmailService.labelEmails(emailIds, labelIds);
        break;

      case "markAsRead":
        if (!emailIds || !Array.isArray(emailIds)) {
          return NextResponse.json(
            { error: "emailIds array is required for markAsRead action" },
            { status: 400 }
          );
        }
        result = withHistory
          ? await enhancedGmailService.markAsReadWithHistory(emailIds)
          : await gmailService.markAsRead(emailIds);
        break;

      case "getByQuery":
        if (!query) {
          return NextResponse.json(
            { error: "query is required for getByQuery action" },
            { status: 400 }
          );
        }
        const emails = await gmailService.getEmailsByQuery(query, maxResults);
        return NextResponse.json({
          success: true,
          emails,
          count: emails.length,
        });

      case "categorize":
        if (!query) {
          return NextResponse.json(
            { error: "query is required for categorize action" },
            { status: 400 }
          );
        }
        const emailsToCategories = await gmailService.getEmailsByQuery(
          query,
          maxResults
        );
        const categorizedEmails = emailsToCategories.map((email) => ({
          ...email,
          category: gmailService.categorizeEmail(email),
        }));

        return NextResponse.json({
          success: true,
          emails: categorizedEmails,
          count: categorizedEmails.length,
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result.success,
      processedCount: result.processedCount,
      errors: result.errors,
      operationId: result.operationId,
      canUndo: result.canUndo,
    });
  } catch (error: any) {
    console.error("Error organizing emails:", error);

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
        error: "Failed to organize emails",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
