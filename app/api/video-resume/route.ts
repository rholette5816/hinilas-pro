import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 10;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ pending: [] });

  const { data } = await supabase
    .from("user_data")
    .select("video_operation_names, video_session_ts, video_prompts, video_1_url, video_2_url, video_3_url")
    .eq("user_id", user.id)
    .single();

  if (!data?.video_operation_names || !Array.isArray(data.video_operation_names)) {
    return NextResponse.json({ pending: [] });
  }

  const operationNames: (string | null)[] = data.video_operation_names;
  const sessionTs: number[] = Array.isArray(data.video_session_ts) ? data.video_session_ts : [0, 0, 0];
  const existingUrls = [data.video_1_url, data.video_2_url, data.video_3_url];
  const now = Date.now();

  // Find clips that have a pending operation, no completed URL, and are less than 10 minutes old
  const pending = operationNames
    .map((name, i) => {
      if (!name) return null;
      if (existingUrls[i]) return null; // already done
      const age = now - (sessionTs[i] || 0);
      if (age > 10 * 60 * 1000) return null; // stale
      return { clipIndex: i, operationName: name, sessionTs: sessionTs[i] };
    })
    .filter(Boolean);

  if (pending.length === 0) return NextResponse.json({ pending: [] });

  return NextResponse.json({
    pending,
    prompts: data.video_prompts || [],
  });
}
