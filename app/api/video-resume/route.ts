import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 10;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("user_data")
    .select("video_operation_names, video_session_ts, video_prompts, video_1_url, video_2_url, video_3_url")
    .eq("user_id", user.id)
    .single();

  // No pending operations
  if (!data?.video_operation_names || !data?.video_session_ts) {
    return NextResponse.json({ operationNames: null });
  }

  // Already completed — all 3 URLs exist, no need to resume
  if (data.video_1_url && data.video_2_url && data.video_3_url) {
    return NextResponse.json({ operationNames: null });
  }

  // Stale — older than 10 minutes, Veo operations expire
  const age = Date.now() - data.video_session_ts;
  if (age > 10 * 60 * 1000) {
    return NextResponse.json({ operationNames: null });
  }

  return NextResponse.json({
    operationNames: data.video_operation_names,
    sessionTs: data.video_session_ts,
    prompts: data.video_prompts || [],
  });
}
