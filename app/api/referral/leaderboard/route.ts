import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: Request) {
  const ip = getRequestIp(req);
  const rl = checkRateLimit(`referral-leaderboard:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const supabase = adminClient();

  // Sum referral credits earned per user, join with username
  const { data } = await supabase
    .from("credit_transactions")
    .select("user_id, amount")
    .eq("type", "referral")
    .gt("amount", 0);

  if (!data || data.length === 0) return NextResponse.json({ leaderboard: [] });

  // Aggregate totals per user
  const totals: Record<string, number> = {};
  for (const row of data) {
    totals[row.user_id] = (totals[row.user_id] || 0) + row.amount;
  }

  // Get top 5 user IDs
  const top5 = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([user_id, credits]) => ({ user_id, credits }));

  // Fetch usernames + avatars
  const userIds = top5.map(u => u.user_id);
  const { data: users } = await supabase
    .from("user_data")
    .select("user_id, username, avatar_url")
    .in("user_id", userIds);

  const userMap: Record<string, { username: string; avatar_url: string | null }> = {};
  for (const u of users || []) {
    userMap[u.user_id] = { username: u.username || "User", avatar_url: u.avatar_url || null };
  }

  const leaderboard = top5.map((u, i) => ({
    rank: i + 1,
    username: userMap[u.user_id]?.username || "User",
    avatar_url: userMap[u.user_id]?.avatar_url || null,
    credits: u.credits,
  }));

  return NextResponse.json({ leaderboard });
}
