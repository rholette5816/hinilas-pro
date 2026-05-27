import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getBadge(count: number): string {
  if (count >= 25) return "Hilas Dominator";
  if (count >= 10) return "Ad Machine";
  if (count >= 5) return "Consistent Operator";
  if (count >= 1) return "Starter Launcher";
  return "";
}

export async function GET(req: NextRequest) {
  const ip = getRequestIp(req);
  const rl = checkRateLimit(`launch-leaderboard:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const { searchParams } = req.nextUrl;
  const period = searchParams.get("period") || "alltime"; // alltime | month

  const admin = adminClient();

  let query = admin
    .from("campaign_launches")
    .select("user_id, username, created_at")
    .eq("status", "approved");

  if (period === "month") {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    query = query.gte("created_at", start.toISOString());
  }

  const { data: launches } = await query;
  if (!launches || launches.length === 0) {
    return NextResponse.json({ leaderboard: [] });
  }

  // Aggregate by user
  const counts: Record<string, { username: string; count: number }> = {};
  for (const l of launches) {
    if (!counts[l.user_id]) counts[l.user_id] = { username: l.username || "User", count: 0 };
    counts[l.user_id].count++;
  }

  // Get avatar_urls
  const userIds = Object.keys(counts);
  const { data: profiles } = await admin
    .from("user_data")
    .select("user_id, avatar_url, username")
    .in("user_id", userIds);

  const profileMap: Record<string, { avatar_url: string | null; username: string }> = {};
  for (const p of profiles || []) {
    profileMap[p.user_id] = { avatar_url: p.avatar_url, username: p.username };
  }

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([user_id, { count }], i) => ({
      rank: i + 1,
      username: profileMap[user_id]?.username || counts[user_id].username,
      avatar_url: profileMap[user_id]?.avatar_url || null,
      launches: count,
      badge: getBadge(count),
    }));

  return NextResponse.json({ leaderboard: sorted });
}
