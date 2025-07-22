import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UnsubscribeDetector } from '@/lib/unsubscribe-detector';
import { GmailEnhancedService } from '@/lib/gmail/enhanced-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const detector = new UnsubscribeDetector();

    switch (action) {
      case 'history':
        const domain = searchParams.get('domain');
        const history = await detector.getUnsubscribeHistory(user.id, domain || undefined);
        return NextResponse.json({ history });

      case 'stats':
        const stats = await detector.getUnsubscribeStats(user.id);
        return NextResponse.json({ stats });

      case 'scan':
        return await scanForUnsubscribeOpportunities(user.id);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in GET /api/unsubscribe:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's Gmail access token
    const { data: session } = await supabase.auth.getSession();
    const accessToken = session?.session?.provider_token;

    if (!accessToken) {
      return NextResponse.json({ 
        error: 'Gmail access token not found. Please re-authenticate.' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { action, emailId, unsubscribeUrl, method = 'link' } = body;

    const detector = new UnsubscribeDetector();

    switch (action) {
      case 'unsubscribe':
        return await performUnsubscribe(
          user.id,
          emailId,
          unsubscribeUrl,
          method,
          detector,
          accessToken
        );

      case 'confirm':
        const { historyId } = body;
        if (!historyId) {
          return NextResponse.json({ error: 'History ID required' }, { status: 400 });
        }
        
        const confirmed = await detector.confirmUnsubscribe(historyId);
        return NextResponse.json({ success: confirmed });

      case 'bulk_unsubscribe':
        const { candidates } = body;
        if (!Array.isArray(candidates)) {
          return NextResponse.json({ error: 'Candidates array required' }, { status: 400 });
        }

        return await performBulkUnsubscribe(user.id, candidates, detector, accessToken);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/unsubscribe:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function scanForUnsubscribeOpportunities(userId: string) {
  try {
    const supabase = createClient();
    
    // Get the user's Gmail access token
    const { data: session } = await supabase.auth.getSession();
    const accessToken = session?.session?.provider_token;

    if (!accessToken) {
      return NextResponse.json({ 
        error: 'Gmail access token not found. Please re-authenticate.' 
      }, { status: 401 });
    }

    const gmailService = new GmailEnhancedService(accessToken);
    const detector = new UnsubscribeDetector();

    // Search for promotional and newsletter emails
    const queries = [
      'category:promotions',
      'from:noreply OR from:no-reply OR from:newsletter',
      'unsubscribe',
      'category:social'
    ];

    const allCandidates = [];
    const maxEmailsPerQuery = 50;

    for (const query of queries) {
      try {
        const emails = await gmailService.listEmails({ 
          maxResults: maxEmailsPerQuery, 
          query 
        });

        for (const email of emails) {
          const candidate = await detector.detectUnsubscribeOpportunities(
            email.id,
            email.subject,
            email.from,
            email.date,
            email.snippet
          );

          if (candidate) {
            allCandidates.push(candidate);
          }
        }
      } catch (queryError) {
        console.error(`Error processing query "${query}":`, queryError);
        // Continue with other queries
      }
    }

    // Remove duplicates and sort by confidence
    const uniqueCandidates = allCandidates
      .filter((candidate, index, self) => 
        index === self.findIndex(c => c.emailId === candidate.emailId)
      )
      .sort((a, b) => {
        const confidenceOrder = { high: 3, medium: 2, low: 1 };
        return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
      });

    return NextResponse.json({ 
      candidates: uniqueCandidates,
      totalFound: uniqueCandidates.length,
      scanSummary: {
        highConfidence: uniqueCandidates.filter(c => c.confidence === 'high').length,
        mediumConfidence: uniqueCandidates.filter(c => c.confidence === 'medium').length,
        lowConfidence: uniqueCandidates.filter(c => c.confidence === 'low').length,
      }
    });
  } catch (error) {
    console.error('Error scanning for unsubscribe opportunities:', error);
    return NextResponse.json({ 
      error: 'Failed to scan for unsubscribe opportunities' 
    }, { status: 500 });
  }
}

async function performUnsubscribe(
  userId: string,
  emailId: string,
  unsubscribeUrl: string,
  method: string,
  detector: UnsubscribeDetector,
  accessToken: string
) {
  try {
    const gmailService = new GmailEnhancedService(accessToken);
    
    // Get email details for sender information
    const emails = await gmailService.listEmails({ maxResults: 1, query: `rfc822msgid:${emailId}` });
    if (emails.length === 0) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    const email = emails[0];
    let success = false;
    let errorMessage: string | undefined;
    let historyId: string | null = null;

    try {
      if (method === 'mailto') {
        // For mailto links, we can't automatically send emails
        // Record as attempted but not successful
        success = false;
        errorMessage = 'Mailto unsubscribe requires manual action';
      } else if (method === 'link') {
        // For HTTP links, we would need to make a safe request
        // For security, we'll mark as attempted and let user confirm
        success = false;
        errorMessage = 'HTTP unsubscribe requires user confirmation';
      } else {
        errorMessage = 'Unknown unsubscribe method';
      }

      // Record the unsubscribe attempt
      historyId = await detector.recordUnsubscribeAttempt(
        userId,
        emailId,
        email.from,
        method,
        success,
        errorMessage
      );

      return NextResponse.json({
        success: true,
        attempted: true,
        requiresConfirmation: true,
        historyId,
        unsubscribeUrl,
        method,
        message: 'Unsubscribe link prepared. Please click the link to complete unsubscription.',
      });

    } catch (unsubscribeError) {
      errorMessage = `Unsubscribe failed: ${unsubscribeError instanceof Error ? unsubscribeError.message : 'Unknown error'}`;
      
      historyId = await detector.recordUnsubscribeAttempt(
        userId,
        emailId,
        email.from,
        method,
        false,
        errorMessage
      );

      return NextResponse.json({
        success: false,
        error: errorMessage,
        historyId,
      });
    }
  } catch (error) {
    console.error('Error performing unsubscribe:', error);
    return NextResponse.json({ 
      error: 'Failed to process unsubscribe request' 
    }, { status: 500 });
  }
}

async function performBulkUnsubscribe(
  userId: string,
  candidates: any[],
  detector: UnsubscribeDetector,
  accessToken: string
) {
  const results = [];
  
  for (const candidate of candidates) {
    try {
      // Use the first available unsubscribe link
      const unsubscribeLink = candidate.unsubscribeLinks[0];
      if (!unsubscribeLink) {
        results.push({
          emailId: candidate.emailId,
          success: false,
          error: 'No unsubscribe link found',
        });
        continue;
      }

      const result = await performUnsubscribe(
        userId,
        candidate.emailId,
        unsubscribeLink.url,
        unsubscribeLink.type,
        detector,
        accessToken
      );

      const resultData = await result.json();
      results.push({
        emailId: candidate.emailId,
        success: resultData.success,
        error: resultData.error,
        historyId: resultData.historyId,
      });
    } catch (error) {
      results.push({
        emailId: candidate.emailId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  
  return NextResponse.json({
    results,
    summary: {
      total: results.length,
      successful: successCount,
      failed: results.length - successCount,
    },
  });
}