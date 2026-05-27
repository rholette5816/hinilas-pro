import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(`credits-check:${user.id}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const { data } = await supabase
    .from("user_data")
    .select("plan, credits_remaining, credits_total, credits_reset_at, subscription_status")
    .eq("user_id", user.id)
    .single();

  if (!data) {
    return NextResponse.json({ error: "User data not found" }, { status: 404 });
  }

  return NextResponse.json({
    plan: data.plan,
    credits: data.credits_remaining,
    creditsTotal: data.credits_total,
    creditsResetAt: data.credits_reset_at,
    subscriptionStatus: data.subscription_status,
    canGenerate: data.credits_remaining > 0,
  });
}
