import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Update usage count and last used timestamp for a saved search
export async function POST(
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

    // Increment use count and update last used timestamp
    const { data: updatedSearch, error } = await supabase
      .from('saved_searches')
      .update({
        use_count: supabase.raw('use_count + 1'),
        last_used: new Date().toISOString(),
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
    console.error("Error updating search usage:", error);
    return NextResponse.json(
      { error: "Failed to update search usage" },
      { status: 500 }
    );
  }
}