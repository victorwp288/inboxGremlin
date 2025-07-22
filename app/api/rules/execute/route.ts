import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { RulesEngine } from '@/lib/rules-engine';
import { GmailEnhancedService } from '@/lib/gmail/enhanced-service';

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
    const { ruleId, maxEmails = 100 } = body;

    if (!ruleId) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    // Get the rule
    const { data: rule, error: ruleError } = await supabase
      .from('user_rules')
      .select('*')
      .eq('id', ruleId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (ruleError || !rule) {
      return NextResponse.json({ error: 'Rule not found or inactive' }, { status: 404 });
    }

    // Initialize services
    const gmailService = new GmailEnhancedService(accessToken);
    const rulesEngine = new RulesEngine(gmailService);

    try {
      // Fetch emails for rule evaluation
      const emails = await gmailService.listEmails({ maxResults: maxEmails });
      
      // Execute the rule
      const execution = await rulesEngine.executeRule(rule, emails);

      return NextResponse.json({ 
        execution,
        summary: {
          ruleName: rule.name,
          emailsProcessed: execution.emails_processed,
          emailsMatched: execution.emails_matched,
          actionsPerformed: execution.actions_performed,
          success: execution.success,
          executionTime: execution.execution_time_ms,
        }
      });
    } catch (error) {
      console.error('Error executing rule:', error);
      return NextResponse.json({ 
        error: `Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in POST /api/rules/execute:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Test rule without actually executing actions
export async function PUT(request: NextRequest) {
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
    const { conditions, maxEmails = 50 } = body;

    if (!conditions || !Array.isArray(conditions)) {
      return NextResponse.json({ error: 'Conditions array is required' }, { status: 400 });
    }

    // Initialize Gmail service
    const gmailService = new GmailEnhancedService(accessToken);
    const rulesEngine = new RulesEngine(gmailService);

    try {
      // Fetch emails for testing
      const emails = await gmailService.listEmails({ maxResults: maxEmails });
      
      // Create a temporary rule for testing
      const testRule = {
        id: 'test',
        user_id: user.id,
        name: 'Test Rule',
        conditions,
        actions: [], // No actions for testing
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Test the conditions against emails
      const matchingEmails = emails.filter(email => 
        (rulesEngine as any).evaluateConditions(email, conditions)
      );

      return NextResponse.json({
        totalEmails: emails.length,
        matchingEmails: matchingEmails.length,
        matchingEmailsPreview: matchingEmails.slice(0, 10).map(email => ({
          id: email.id,
          subject: email.subject,
          from: email.from,
          date: email.date,
          snippet: email.snippet,
        })),
      });
    } catch (error) {
      console.error('Error testing rule:', error);
      return NextResponse.json({ 
        error: `Rule test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in PUT /api/rules/execute:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}