import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { isOwnerUser } from "@/lib/admin";
import { checkRateLimit } from "@/lib/rate-limit";

const TRIGGER_THRESHOLD = 3;

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ shouldShow: false });

  const rl = checkRateLimit(`feedback-trigger-check:${user.id}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  // Owner accounts never get the auto-prompt
  if (isOwnerUser(user)) return NextResponse.json({ shouldShow: false });

  const admin = adminClient();

  // Skip if user has already submitted feedback
  const { data: existingFeedback } = await admin
    .from("feedbacks")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existingFeedback) return NextResponse.json({ shouldShow: false });

  // Skip if we have already shown the prompt before
  const { data: userRow } = await admin
    .from("user_data")
    .select("feedback_prompt_shown_at")
    .eq("user_id", user.id)
    .single();
  if (userRow?.feedback_prompt_shown_at) return NextResponse.json({ shouldShow: false });

  // Count paid usage events
  const { count } = await admin
    .from("credit_transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("type", "use");

  if ((count ?? 0) < TRIGGER_THRESHOLD) {
    return NextResponse.json({ shouldShow: false });
  }

  // Atomically mark prompt as shown so the next call returns false even if
  // the user closes the modal without submitting.
  const { data: flipped } = await admin
    .from("user_data")
    .update({ feedback_prompt_shown_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("feedback_prompt_shown_at", null)
    .select("user_id")
    .maybeSingle();

  if (!flipped) return NextResponse.json({ shouldShow: false });

  return NextResponse.json({ shouldShow: true });
}
