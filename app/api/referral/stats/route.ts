import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`referral-stats:${user.id}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  // Get all referral transactions for this user
  const { data: transactions } = await supabase
    .from("credit_transactions")
    .select("amount, description, created_at")
    .eq("user_id", user.id)
    .eq("type", "referral")
    .order("created_at", { ascending: false });

  if (!transactions) return NextResponse.json({ total: 0, credits: 0, history: [] });

  // Count signup referrals
  const signups = transactions.filter(t => t.description.includes("signup")).length;
  const totalCredits = transactions.reduce((sum, t) => sum + t.amount, 0);

  return NextResponse.json({
    total: signups,
    credits: totalCredits,
    history: transactions,
  });
}
