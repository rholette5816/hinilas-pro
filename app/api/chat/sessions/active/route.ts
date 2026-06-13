import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_data")
    .select("active_session_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const activeSessionId = data?.active_session_id ?? null;
  return NextResponse.json({ active_session_id: activeSessionId, activeSessionId });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;

  if (sessionId) {
    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
  }

  const { error } = await supabase
    .from("user_data")
    .upsert(
      {
        user_id: user.id,
        active_session_id: sessionId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ active_session_id: sessionId, activeSessionId: sessionId });
}
