import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Update a saved search
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { name, description, query, conditions } = body;

    // Verify the search belongs to the user
    const { data: existing, error: fetchError } = await supabase
      .from('saved_searches')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Search not found" },
        { status: 404 }
      );
    }

    const { data: updatedSearch, error } = await supabase
      .from('saved_searches')
      .update({
        name,
        description,
        query,
        conditions: conditions || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(updatedSearch);
  } catch (error: any) {
    console.error("Error updating saved search:", error);
    return NextResponse.json(
      { error: "Failed to update saved search" },
      { status: 500 }
    );
  }
}

// Delete a saved search
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Verify the search belongs to the user and delete it
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting saved search:", error);
    return NextResponse.json(
      { error: "Failed to delete saved search" },
      { status: 500 }
    );
  }
}