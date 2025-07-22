import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { RulesEngine, UserRule, RuleCondition, RuleAction } from '@/lib/rules-engine';
import { GmailEnhancedService } from '@/lib/gmail/enhanced-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: rules, error } = await supabase
      .from('user_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rules:', error);
      return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
    }

    return NextResponse.json({ rules: rules || [] });
  } catch (error) {
    console.error('Error in GET /api/rules:', error);
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

    const body = await request.json();
    const { name, conditions, actions, schedule } = body;

    // Validate required fields
    if (!name || !conditions || !actions) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, conditions, actions' 
      }, { status: 400 });
    }

    // Validate conditions structure
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return NextResponse.json({ 
        error: 'Conditions must be a non-empty array' 
      }, { status: 400 });
    }

    // Validate actions structure
    if (!Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json({ 
        error: 'Actions must be a non-empty array' 
      }, { status: 400 });
    }

    // Validate condition structure
    for (const condition of conditions) {
      if (!condition.field || !condition.operator || condition.value === undefined) {
        return NextResponse.json({ 
          error: 'Each condition must have field, operator, and value' 
        }, { status: 400 });
      }
    }

    // Validate action structure
    for (const action of actions) {
      if (!action.type) {
        return NextResponse.json({ 
          error: 'Each action must have a type' 
        }, { status: 400 });
      }
    }

    const ruleData = {
      user_id: user.id,
      name,
      conditions: conditions as RuleCondition[],
      actions: actions as RuleAction[],
      is_active: true,
      schedule: schedule || null,
    };

    const { data, error } = await supabase
      .from('user_rules')
      .insert(ruleData)
      .select()
      .single();

    if (error) {
      console.error('Error creating rule:', error);
      return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
    }

    return NextResponse.json({ rule: data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/rules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, conditions, actions, schedule, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (name !== undefined) updateData.name = name;
    if (conditions !== undefined) updateData.conditions = conditions;
    if (actions !== undefined) updateData.actions = actions;
    if (schedule !== undefined) updateData.schedule = schedule;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('user_rules')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating rule:', error);
      return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ rule: data });
  } catch (error) {
    console.error('Error in PUT /api/rules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_rules')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting rule:', error);
      return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/rules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}