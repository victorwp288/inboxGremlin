import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SchedulerService } from '@/lib/scheduler';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const jobId = searchParams.get('jobId');

    const schedulerService = new SchedulerService();

    switch (action) {
      case 'jobs':
        const jobs = await schedulerService.getUserJobs(user.id);
        return NextResponse.json({
          success: true,
          jobs,
        });

      case 'executions':
        if (!jobId) {
          return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
        }
        const executions = await schedulerService.getJobExecutions(jobId);
        return NextResponse.json({
          success: true,
          executions,
        });

      case 'stats':
        if (!jobId) {
          return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
        }
        const stats = await schedulerService.getJobStats(jobId);
        return NextResponse.json({
          success: true,
          stats,
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in GET /api/scheduler:', error);
    return NextResponse.json(
      { error: 'Failed to process scheduler request' },
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
    const { action, jobId, jobType, jobName, scheduleExpression, jobConfig, updates } = body;

    const schedulerService = new SchedulerService();

    switch (action) {
      case 'create':
        return await handleCreateJob(
          user.id,
          jobType,
          jobName,
          scheduleExpression,
          jobConfig,
          schedulerService
        );

      case 'update':
        return await handleUpdateJob(jobId, updates, schedulerService);

      case 'delete':
        return await handleDeleteJob(jobId, schedulerService);

      case 'execute':
        return await handleExecuteJob(jobId, accessToken, schedulerService);

      case 'toggle':
        return await handleToggleJob(jobId, schedulerService);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/scheduler:', error);
    return NextResponse.json(
      { error: 'Failed to process scheduler request' },
      { status: 500 }
    );
  }
}

async function handleCreateJob(
  userId: string,
  jobType: string,
  jobName: string,
  scheduleExpression: string,
  jobConfig: any,
  schedulerService: SchedulerService
) {
  try {
    if (!jobType || !jobName || !scheduleExpression) {
      return NextResponse.json(
        { error: 'Job type, name, and schedule are required' },
        { status: 400 }
      );
    }

    if (!schedulerService.validateCronExpression(scheduleExpression)) {
      return NextResponse.json(
        { error: 'Invalid schedule expression' },
        { status: 400 }
      );
    }

    const job = await schedulerService.createScheduledJob(
      userId,
      jobType as any,
      jobName,
      scheduleExpression,
      jobConfig || {}
    );

    return NextResponse.json({
      success: true,
      job,
      message: 'Scheduled job created successfully',
    });
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Failed to create scheduled job' },
      { status: 500 }
    );
  }
}

async function handleUpdateJob(
  jobId: string,
  updates: any,
  schedulerService: SchedulerService
) {
  try {
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    if (updates.schedule_expression && !schedulerService.validateCronExpression(updates.schedule_expression)) {
      return NextResponse.json(
        { error: 'Invalid schedule expression' },
        { status: 400 }
      );
    }

    const job = await schedulerService.updateScheduledJob(jobId, updates);

    return NextResponse.json({
      success: true,
      job,
      message: 'Scheduled job updated successfully',
    });
  } catch (error) {
    console.error('Error updating job:', error);
    return NextResponse.json(
      { error: 'Failed to update scheduled job' },
      { status: 500 }
    );
  }
}

async function handleDeleteJob(
  jobId: string,
  schedulerService: SchedulerService
) {
  try {
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    await schedulerService.deleteScheduledJob(jobId);

    return NextResponse.json({
      success: true,
      message: 'Scheduled job deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting job:', error);
    return NextResponse.json(
      { error: 'Failed to delete scheduled job' },
      { status: 500 }
    );
  }
}

async function handleExecuteJob(
  jobId: string,
  accessToken: string,
  schedulerService: SchedulerService
) {
  try {
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    const result = await schedulerService.executeJobManually(jobId, accessToken);

    return NextResponse.json({
      success: true,
      result,
      message: 'Job executed successfully',
    });
  } catch (error) {
    console.error('Error executing job:', error);
    return NextResponse.json(
      { error: 'Failed to execute job' },
      { status: 500 }
    );
  }
}

async function handleToggleJob(
  jobId: string,
  schedulerService: SchedulerService
) {
  try {
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Get current job status
    const supabase = createClient();
    const { data: currentJob, error } = await supabase
      .from('scheduled_jobs')
      .select('is_active')
      .eq('id', jobId)
      .single();

    if (error) throw error;

    const job = await schedulerService.updateScheduledJob(jobId, {
      is_active: !currentJob.is_active,
    });

    return NextResponse.json({
      success: true,
      job,
      message: `Job ${job.is_active ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling job:', error);
    return NextResponse.json(
      { error: 'Failed to toggle job status' },
      { status: 500 }
    );
  }
}