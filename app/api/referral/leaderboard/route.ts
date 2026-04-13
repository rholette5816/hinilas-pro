import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
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

  // Fetch usernames
  const userIds = top5.map(u => u.user_id);
  const { data: users } = await supabase
    .from("user_data")
    .select("user_id, username")
    .in("user_id", userIds);

  const usernameMap: Record<string, string> = {};
  for (const u of users || []) {
    usernameMap[u.user_id] = u.username || "User";
  }

  const leaderboard = top5.map((u, i) => ({
    rank: i + 1,
    username: usernameMap[u.user_id] || "User",
    credits: u.credits,
  }));

  return NextResponse.json({ leaderboard });
}