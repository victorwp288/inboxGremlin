import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Get all saved searches for the user
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

    const { data: searches, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', user.id)
      .order('use_count', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(searches || []);
  } catch (error: any) {
    console.error("Error fetching saved searches:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved searches" },
      { status: 500 }
    );
  }
}

// Create a new saved search
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

    const body = await request.json();
    const { name, description, query, conditions } = body;

    if (!name || !query) {
      return NextResponse.json(
        { error: "Name and query are required" },
        { status: 400 }
      );
    }

    // Check if a search with this name already exists
    const { data: existing } = await supabase
      .from('saved_searches')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "A search with this name already exists" },
        { status: 409 }
      );
    }

    const { data: savedSearch, error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: user.id,
        name,
        description,
        query,
        conditions: conditions || [],
        use_count: 0,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(savedSearch);
  } catch (error: any) {
    console.error("Error creating saved search:", error);
    return NextResponse.json(
      { error: "Failed to create saved search" },
      { status: 500 }
    );
  }
}