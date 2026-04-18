import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { derivePlanFromCredits, isOwnerUser } from "@/lib/admin";

type UserDataRow = {
  user_id: string;
  username?: string | null;
  credits_remaining?: number | null;
  credits_total?: number | null;
  updated_at?: string | null;
};

type CreditTransactionRow = {
  user_id: string;
  type: string;
  amount: number;
  description?: string | null;
  created_at?: string | null;
};

type TokenLogRow = {
  user_id: string | null;
  module: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  created_at: string | null;
};

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getTodayKeyInManila() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function getDateKeyInManila(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(value));
}

function getLast14Days(): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(d);
  });
}

function getShortLabel(dateKey: string): string {
  const d = new Date(dateKey + "T00:00:00");
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

async function listAllAuthUsers() {
  const admin = adminClient();
  const users: Array<{ id: string; email?: string; user_metadata?: { full_name?: string } }> = [];
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const batch = data.users ?? [];
    users.push(...batch);
    if (batch.length < 1000) break;
    page += 1;
  }
  return users;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = adminClient();

  const [
    { data: userDataRows, error: userDataError },
    { data: transactionRows, error: transactionError },
    { data: tokenRows },
    authUsers,
  ] = await Promise.all([
    admin.from("user_data").select("user_id, username, credits_remaining, credits_total, updated_at").order("updated_at", { ascending: false }),
    admin.from("credit_transactions").select("user_id, type, amount, description, created_at").order("created_at", { ascending: false }),
    admin.from("token_logs").select("user_id, module, prompt_tokens, completion_tokens, total_tokens, created_at"),
    listAllAuthUsers(),
  ]);

  if (userDataError) return NextResponse.json({ error: userDataError.message }, { status: 500 });
  if (transactionError) return NextResponse.json({ error: transactionError.message }, { status: 500 });

  const users = (userDataRows || []) as UserDataRow[];
  const transactions = (transactionRows || []) as CreditTransactionRow[];
  const tokens = (tokenRows || []) as TokenLogRow[];

  const authUserMap = new Map(
    authUsers.map(u => [u.id, { email: u.email || "", fullName: u.user_metadata?.full_name || "" }])
  );

  const todayKey = getTodayKeyInManila();
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const thisWeekStart = now - 7 * 24 * 60 * 60 * 1000;
  const lastWeekStart = now - 14 * 24 * 60 * 60 * 1000;

  let newToday = 0, new7d = 0, new30d = 0, thisWeekSignups = 0, lastWeekSignups = 0;
  const planBreakdown = { Lite: 0, Flex: 0, Max: 0 };

  const userTable = users.map(row => {
    const signupDate = row.updated_at || null;
    const creditsRemaining = row.credits_remaining ?? 0;
    const plan = derivePlanFromCredits(creditsRemaining);
    const authUser = authUserMap.get(row.user_id);
    const username = row.username || authUser?.fullName || authUser?.email?.split("@")[0] || "User";

    if (signupDate) {
      const t = new Date(signupDate).getTime();
      if (getDateKeyInManila(signupDate) === todayKey) newToday++;
      if (t >= sevenDaysAgo) new7d++;
      if (t >= thirtyDaysAgo) new30d++;
      if (t >= thisWeekStart) thisWeekSignups++;
      if (t >= lastWeekStart && t < thisWeekStart) lastWeekSignups++;
    }

    planBreakdown[plan]++;

    return { userId: row.user_id, username, email: authUser?.email || "", plan, creditsRemaining, signupDate };
  });

  // --- Credit metrics ---
  const totalCreditsIssued = transactions.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
  const totalCreditsConsumed = Math.abs(transactions.filter(tx => tx.amount < 0).reduce((s, tx) => s + tx.amount, 0));
  const topupEvents = transactions.filter(tx => tx.type === "topup");
  const topupCreditsIssued = topupEvents.reduce((s, tx) => s + Math.max(tx.amount, 0), 0);

  // --- Department funnel: count usage transactions per module ---
  const DEPT_KEYS: Record<string, string[]> = {
    research: ["research generation"],
    angles: ["angles generation"],
    copy: ["copy generation"],
    creative: ["image generation"],
    analyze: ["basic analysis", "advanced analysis"],
  };
  const moduleUsageCount: Record<string, number> = { research: 0, angles: 0, copy: 0, creative: 0, analyze: 0 };
  const moduleUniqueUsers: Record<string, Set<string>> = {
    research: new Set(), angles: new Set(), copy: new Set(), creative: new Set(), analyze: new Set(),
  };

  for (const tx of transactions) {
    if (tx.amount >= 0) continue;
    const desc = (tx.description || "").toLowerCase();
    for (const [mod, keywords] of Object.entries(DEPT_KEYS)) {
      if (keywords.some(k => desc.includes(k))) {
        moduleUsageCount[mod]++;
        moduleUniqueUsers[mod].add(tx.user_id);
      }
    }
  }

  const departmentFunnel = Object.entries(moduleUsageCount).map(([module, count]) => ({
    module,
    count,
    uniqueUsers: moduleUniqueUsers[module].size,
  }));

  // --- Return users (active on 2+ different days) ---
  const userDayMap = new Map<string, Set<string>>();
  for (const tx of transactions) {
    if (!tx.created_at || tx.amount >= 0) continue;
    const day = getDateKeyInManila(tx.created_at);
    if (!userDayMap.has(tx.user_id)) userDayMap.set(tx.user_id, new Set());
    userDayMap.get(tx.user_id)!.add(day);
  }
  const returnUsers = [...userDayMap.values()].filter(days => days.size >= 2).length;

  // --- Users at zero credits (churn risk) ---
  const usersAtZero = users.filter(u => (u.credits_remaining ?? 0) === 0).length;

  // --- Top 10 power users by credit consumption ---
  const userConsumption = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.amount >= 0) continue;
    userConsumption.set(tx.user_id, (userConsumption.get(tx.user_id) || 0) + Math.abs(tx.amount));
  }
  const topUsers = [...userConsumption.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([userId, consumed]) => {
      const u = userTable.find(r => r.userId === userId);
      return { userId, username: u?.username || "User", email: u?.email || "", consumed, creditsRemaining: u?.creditsRemaining ?? 0, plan: u?.plan || "Lite" };
    });

  // --- Signups per day (last 14 days) ---
  const last14Days = getLast14Days();
  const signupsByDay: Record<string, number> = {};
  for (const day of last14Days) signupsByDay[day] = 0;
  for (const u of users) {
    if (u.updated_at) {
      const day = getDateKeyInManila(u.updated_at);
      if (day in signupsByDay) signupsByDay[day]++;
    }
  }
  const signupTrend = last14Days.map(day => ({ day, label: getShortLabel(day), count: signupsByDay[day] }));

  // --- Token metrics ---
  const tokensByModule: Record<string, { prompt: number; completion: number; total: number; calls: number }> = {
    research: { prompt: 0, completion: 0, total: 0, calls: 0 },
    angles: { prompt: 0, completion: 0, total: 0, calls: 0 },
    copy: { prompt: 0, completion: 0, total: 0, calls: 0 },
    analyze: { prompt: 0, completion: 0, total: 0, calls: 0 },
    creative: { prompt: 0, completion: 0, total: 0, calls: 0 },
  };
  let grandTotalTokens = 0;

  for (const t of tokens) {
    const mod = t.module;
    if (mod in tokensByModule) {
      tokensByModule[mod].prompt += t.prompt_tokens;
      tokensByModule[mod].completion += t.completion_tokens;
      tokensByModule[mod].total += t.total_tokens;
      tokensByModule[mod].calls++;
    }
    grandTotalTokens += t.total_tokens;
  }

  // Gemini 2.5 Flash pricing (USD): $0.15/1M input, $0.60/1M output
  const estCostUSD =
    (tokens.reduce((s, t) => s + t.prompt_tokens, 0) / 1_000_000) * 0.15 +
    (tokens.reduce((s, t) => s + t.completion_tokens, 0) / 1_000_000) * 0.60;

  // --- Video unlocks ---
  const videoUnlocks = { campaign: 0, adset: 0, ads: 0, analyze_basic: 0, analyze_advanced: 0 };
  for (const tx of transactions) {
    const description = (tx.description || "").toLowerCase();
    const isVideoUnlock = description.includes("tutorial video unlock") || description.includes("video reward") || description.includes("setup video reward");
    if (!isVideoUnlock) continue;
    if (description.includes("analyze basic")) videoUnlocks.analyze_basic++;
    else if (description.includes("analyze advanced")) videoUnlocks.analyze_advanced++;
    else if (description.includes("ad set")) videoUnlocks.adset++;
    else if (description.includes("campaign")) videoUnlocks.campaign++;
    else if (description.includes("ads")) videoUnlocks.ads++;
  }

  // --- Recent activity ---
  const recentActivity = transactions.slice(0, 20).map(tx => {
    const authUser = authUserMap.get(tx.user_id);
    const matchingUser = userTable.find(r => r.userId === tx.user_id);
    const username = matchingUser?.username || authUser?.fullName || authUser?.email?.split("@")[0] || "User";
    return { userId: tx.user_id, username, type: tx.type, amount: tx.amount, description: tx.description || "", createdAt: tx.created_at || null };
  });

  return NextResponse.json({
    userStats: { totalSignups: users.length, newToday, new7d, new30d, planBreakdown, thisWeekSignups, lastWeekSignups, returnUsers, usersAtZero },
    creditActivity: { totalCreditsIssued, totalCreditsConsumed, topupEventCount: topupEvents.length, topupCreditsIssued },
    tokenStats: { byModule: tokensByModule, grandTotalTokens, estCostUSD },
    departmentFunnel,
    signupTrend,
    topUsers,
    videoUnlocks,
    users: userTable,
    recentActivity,
    fetchedAt: new Date().toISOString(),
  });
}
