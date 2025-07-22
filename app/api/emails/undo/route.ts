import { createClient } from "@/lib/supabase/server";
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

    // Parse request body
    const body = await request.json();
    const { operationId } = body;

    if (!operationId) {
      return NextResponse.json(
        { error: "operationId is required" },
        { status: 400 }
      );
    }

    // Initialize enhanced Gmail service
    const enhancedGmailService = new GmailEnhancedService(providerToken);

    // Perform the undo operation
    const success = await enhancedGmailService.undoOperation(operationId);

    return NextResponse.json({
      success,
      message: success ? "Operation undone successfully" : "Failed to undo operation",
    });

  } catch (error: any) {
    console.error("Error undoing operation:", error);

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
        error: "Failed to undo operation",
        details: error.message,
      },
      { status: 500 }
    );
  }
}