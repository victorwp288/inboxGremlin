import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AnalyticsService } from '@/lib/analytics';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const analyticsService = new AnalyticsService();
    const summary = await analyticsService.getAnalyticsSummary(user.id, days);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Error in GET /api/analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
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
    const { action } = body;

    const analyticsService = new AnalyticsService();

    switch (action) {
      case 'refresh_stats':
        return await handleRefreshStats(user.id, accessToken, analyticsService);

      case 'record_cleanup':
        const { metrics } = body;
        if (!metrics) {
          return NextResponse.json({ error: 'Metrics data required' }, { status: 400 });
        }
        
        await analyticsService.recordCleanupMetrics(user.id, metrics);
        return NextResponse.json({ success: true });

      case 'update_sender':
        const { senderData } = body;
        if (!senderData) {
          return NextResponse.json({ error: 'Sender data required' }, { status: 400 });
        }
        
        await analyticsService.updateSenderAnalytics(user.id, senderData);
        return NextResponse.json({ success: true });

      case 'record_activity':
        const { pattern } = body;
        if (!pattern) {
          return NextResponse.json({ error: 'Activity pattern required' }, { status: 400 });
        }
        
        await analyticsService.recordActivityPattern(user.id, pattern);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/analytics:', error);
    return NextResponse.json(
      { error: 'Failed to process analytics request' },
      { status: 500 }
    );
  }
}

async function handleRefreshStats(
  userId: string, 
  accessToken: string, 
  analyticsService: AnalyticsService
) {
  try {
    // Collect fresh email statistics from Gmail
    const emailStats = await analyticsService.collectEmailStats(userId, accessToken);
    
    // Record current timestamp for activity tracking
    const now = new Date();
    const currentHour = now.getHours();
    const today = now.toISOString().split('T')[0];
    
    // Initialize hourly arrays (24 hours)
    const hourlyEmailCount = new Array(24).fill(0);
    const hourlyCleanupCount = new Array(24).fill(0);
    
    // Set current hour data (simplified - in production, you'd track this more accurately)
    hourlyEmailCount[currentHour] = Math.floor(Math.random() * 10); // Placeholder
    hourlyCleanupCount[currentHour] = Math.floor(Math.random() * 5); // Placeholder

    await analyticsService.recordActivityPattern(userId, {
      hourly_email_count: hourlyEmailCount,
      hourly_cleanup_count: hourlyCleanupCount,
      emails_received: hourlyEmailCount[currentHour],
      cleanup_operations: hourlyCleanupCount[currentHour],
      time_spent_minutes: Math.floor(Math.random() * 30), // Placeholder
      peak_hour: currentHour,
      peak_email_count: Math.max(...hourlyEmailCount),
    });

    return NextResponse.json({
      success: true,
      message: 'Statistics refreshed successfully',
      stats: emailStats,
    });
  } catch (error) {
    console.error('Error refreshing stats:', error);
    return NextResponse.json(
      { error: 'Failed to refresh statistics' },
      { status: 500 }
    );
  }
}