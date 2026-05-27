import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`referral:${user.id}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const { data } = await supabase
    .from("user_data")
    .select("referral_code")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({ referralCode: data?.referral_code || null });
}
