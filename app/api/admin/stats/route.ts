import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { deriveTier, isOwnerUser, type Tier } from "@/lib/admin";

type SetupPayload = {
  businessName?: string;
  product?: string;
  targetAudience?: string;
  uniqueSellingOffer?: string;
  industry?: string;
};

type UserDataRow = {
  user_id: string;
  username?: string | null;
  credits_remaining?: number | null;
  credits_total?: number | null;
  locked_tier?: string | null;
  tier_expires_at?: string | null;
  updated_at?: string | null;
  setup?: SetupPayload | null;
  research_output?: string | null;
  angles_output?: string | null;
  selected_angle?: string | null;
  copy_output?: string | null;
  main_image_url?: string | null;
  variation_1_url?: string | null;
  variation_2_url?: string | null;
  video_1_url?: string | null;
  video_2_url?: string | null;
  video_3_url?: string | null;
  launches_approved?: number | null;
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

type TopUpRequestRow = {
  user_id?: string | null;
  user_email?: string | null;
  package?: string | null;
  amount_paid?: number | string | null;
  credits_requested?: number | string | null;
  status?: string | null;
  created_at?: string | null;
  approved_at?: string | null;
};

type FeedbackRow = {
  user_id?: string | null;
  user_email?: string | null;
  rating?: number | null;
  category?: string | null;
  message?: string | null;
  created_at?: string | null;
};

type CampaignLaunchRow = {
  user_id?: string | null;
  status?: string | null;
  credits_awarded?: number | string | null;
  created_at?: string | null;
};

type ConsultationRow = {
  user_id?: string | null;
  user_email?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type EmailLogRow = {
  user_id?: string | null;
  email_type?: string | null;
  created_at?: string | null;
};

type FeedbackPromptRow = {
  user_id?: string | null;
  feedback_prompt_shown_at?: string | null;
};

type AuthUserRow = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  user_metadata?: {
    full_name?: string | null;
    name?: string | null;
  } | null;
};

type WindowKey = "today" | "sevenDays" | "thirtyDays" | "allTime";

const WINDOW_KEYS: WindowKey[] = ["today", "sevenDays", "thirtyDays", "allTime"];
const STATS_CACHE_MS = 60_000;
const AUTH_PAGE_SIZE = 1000;

let statsCache: { createdAt: number; payload: Record<string, unknown> } | null = null;

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function asNumber(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  return Number.isFinite(n) ? Number(n) : 0;
}

function getTodayKeyInManila() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getDateKeyInManila(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function getLast14Days(): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  });
}

function getShortLabel(dateKey: string): string {
  const d = new Date(dateKey + "T00:00:00");
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function inWindow(dateValue: string | null | undefined, window: WindowKey, now: number, todayKey: string) {
  if (window === "allTime") return true;
  if (!dateValue) return false;
  const t = new Date(dateValue).getTime();
  if (Number.isNaN(t)) return false;
  if (window === "today") return getDateKeyInManila(dateValue) === todayKey;
  if (window === "sevenDays") return t >= now - 7 * 24 * 60 * 60 * 1000;
  return t >= now - 30 * 24 * 60 * 60 * 1000;
}

function pctNumber(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

function hasSetup(row: UserDataRow) {
  const setup = row.setup;
  return Boolean(setup?.businessName && setup?.product && setup?.targetAudience);
}

function hasAnyImage(row: UserDataRow) {
  return Boolean(row.main_image_url || row.variation_1_url || row.variation_2_url);
}

function hasAnyVideo(row: UserDataRow) {
  return Boolean(row.video_1_url || row.video_2_url || row.video_3_url);
}

function moduleFromDescription(description: string) {
  const desc = description.toLowerCase();
  if (desc.includes("research generation")) return "research";
  if (desc.includes("angles generation")) return "angles";
  if (desc.includes("copy generation")) return "copy";
  if (desc.includes("image generation")) return "creative";
  if (desc.includes("basic analysis") || desc.includes("advanced analysis")) return "analyze";
  if (desc.includes("video clip")) return "video";
  if (desc.includes("live consultation")) return "consultation";
  return "other";
}

async function safeRows<T>(
  label: string,
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  warnings: string[]
): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    warnings.push(`${label}: ${error.message}`);
    return [];
  }
  return data || [];
}

async function fetchAllAuthUsers(admin: ReturnType<typeof adminClient>) {
  const users: AuthUserRow[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: AUTH_PAGE_SIZE,
    });

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const pageUsers = (data.users || []) as AuthUserRow[];
    users.push(...pageUsers);

    if (pageUsers.length < AUTH_PAGE_SIZE) break;
    page += 1;
  }

  return users;
}

function uniqueUsers(rows: Array<{ user_id?: string | null }>) {
  return new Set(rows.map(row => row.user_id).filter(Boolean) as string[]).size;
}

function buildConversionStep(key: string, label: string, count: number, previous: number, total: number) {
  return {
    key,
    label,
    count,
    rateFromPrevious: previous > 0 ? pctNumber(count, previous) : null,
    rateFromSignup: total > 0 ? pctNumber(count, total) : null,
  };
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (statsCache && Date.now() - statsCache.createdAt < STATS_CACHE_MS) {
    return NextResponse.json({
      ...statsCache.payload,
      cache: { hit: true, ageSeconds: Math.round((Date.now() - statsCache.createdAt) / 1000) },
    });
  }

  const admin = adminClient();
  const warnings: string[] = [];
  let authUsers: AuthUserRow[] = [];

  try {
    authUsers = await fetchAllAuthUsers(admin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown auth.users error";
    warnings.push(`auth.users: ${message}`);
  }

  const [
    { data: userDataRows, error: userDataError },
    { data: transactionRows, error: transactionError },
    tokenRows,
    topUpRows,
    feedbackRows,
    launchRows,
    consultationRows,
    emailRows,
    promptRows,
  ] = await Promise.all([
    admin
      .from("user_data")
      .select("user_id, username, credits_remaining, credits_total, locked_tier, tier_expires_at, updated_at, setup, research_output, angles_output, selected_angle, copy_output, main_image_url, variation_1_url, variation_2_url, video_1_url, video_2_url, video_3_url, launches_approved")
      .order("updated_at", { ascending: false }),
    admin.from("credit_transactions").select("user_id, type, amount, description, created_at").order("created_at", { ascending: false }),
    safeRows<TokenLogRow>(
      "token_logs",
      admin.from("token_logs").select("user_id, module, prompt_tokens, completion_tokens, total_tokens, created_at"),
      warnings
    ),
    safeRows<TopUpRequestRow>(
      "top_up_requests",
      admin.from("top_up_requests").select("user_id, user_email, package, amount_paid, credits_requested, status, created_at, approved_at"),
      warnings
    ),
    safeRows<FeedbackRow>(
      "feedbacks",
      admin.from("feedbacks").select("user_id, user_email, rating, category, message, created_at"),
      warnings
    ),
    safeRows<CampaignLaunchRow>(
      "campaign_launches",
      admin.from("campaign_launches").select("user_id, status, credits_awarded, created_at"),
      warnings
    ),
    safeRows<ConsultationRow>(
      "consultations",
      admin.from("consultations").select("user_id, user_email, status, created_at"),
      warnings
    ),
    safeRows<EmailLogRow>(
      "email_log",
      admin.from("email_log").select("user_id, email_type, created_at"),
      warnings
    ),
    safeRows<FeedbackPromptRow>(
      "feedback_prompt_shown_at",
      admin.from("user_data").select("user_id, feedback_prompt_shown_at").not("feedback_prompt_shown_at", "is", null),
      warnings
    ),
  ]);

  if (userDataError) return NextResponse.json({ error: userDataError.message }, { status: 500 });
  if (transactionError) return NextResponse.json({ error: transactionError.message }, { status: 500 });

  const users = (userDataRows || []) as UserDataRow[];
  const transactions = (transactionRows || []) as CreditTransactionRow[];
  const tokens = tokenRows as TokenLogRow[];
  const topups = topUpRows as TopUpRequestRow[];
  const feedbacks = feedbackRows as FeedbackRow[];
  const launches = launchRows as CampaignLaunchRow[];
  const consultations = consultationRows as ConsultationRow[];
  const emails = emailRows as EmailLogRow[];
  const promptShown = promptRows as FeedbackPromptRow[];
  const authUsersById = new Map(authUsers.map((authUser) => [authUser.id, authUser]));

  const emailByUserId = new Map<string, string>();
  for (const authUser of authUsers) {
    const email = authUser.email?.trim();
    if (email) {
      emailByUserId.set(authUser.id, email);
    }
  }

  for (const row of [...topups, ...feedbacks, ...consultations]) {
    if (row.user_id && row.user_email && !emailByUserId.has(row.user_id)) {
      emailByUserId.set(row.user_id, row.user_email);
    }
  }

  const trueSignupDate = new Map<string, string>();
  for (const tx of [...transactions].reverse()) {
    if (tx.created_at && (tx.description || "").toLowerCase().includes("welcome credits")) {
      trueSignupDate.set(tx.user_id, tx.created_at);
    }
  }

  const todayKey = getTodayKeyInManila();
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const thisWeekStart = sevenDaysAgo;
  const lastWeekStart = now - 14 * 24 * 60 * 60 * 1000;

  let newToday = 0;
  let new7d = 0;
  let new30d = 0;
  let thisWeekSignups = 0;
  let lastWeekSignups = 0;
  const planBreakdown: Record<Tier, number> = { Lite: 0, Flex: 0, Max: 0 };

  const userTable = users.map(row => {
    const authUser = authUsersById.get(row.user_id);
    const email = emailByUserId.get(row.user_id) || "";
    const signupDate = trueSignupDate.get(row.user_id) || authUser?.created_at || row.updated_at || null;
    const creditsRemaining = row.credits_remaining ?? 0;
    const plan = deriveTier(creditsRemaining, row.locked_tier, row.tier_expires_at);
    const authName = authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || null;
    const username = row.username || authName || email.split("@")[0] || "User";

    if (signupDate) {
      const t = new Date(signupDate).getTime();
      if (getDateKeyInManila(signupDate) === todayKey) newToday++;
      if (t >= sevenDaysAgo) new7d++;
      if (t >= thirtyDaysAgo) new30d++;
      if (t >= thisWeekStart) thisWeekSignups++;
      if (t >= lastWeekStart && t < thisWeekStart) lastWeekSignups++;
    }

    planBreakdown[plan]++;

    return { userId: row.user_id, username, email, plan, creditsRemaining, signupDate };
  });

  const usageTransactions = transactions.filter(tx => tx.amount < 0);
  const grantTransactions = transactions.filter(tx => tx.amount > 0);
  const totalCreditsIssued = grantTransactions.reduce((s, tx) => s + tx.amount, 0);
  const totalCreditsConsumed = Math.abs(usageTransactions.reduce((s, tx) => s + tx.amount, 0));
  const topupEvents = transactions.filter(tx => tx.type === "topup");
  const topupCreditsIssued = topupEvents.reduce((s, tx) => s + Math.max(tx.amount, 0), 0);

  const grantBreakdown = { signup: 0, feedback: 0, referral: 0, campaignLaunch: 0, topup: 0, other: 0 };
  for (const tx of grantTransactions) {
    const desc = (tx.description || "").toLowerCase();
    if (tx.type === "topup") grantBreakdown.topup += tx.amount;
    else if (desc.includes("welcome credits") || desc.includes("welcome drip")) grantBreakdown.signup += tx.amount;
    else if (desc.includes("feedback")) grantBreakdown.feedback += tx.amount;
    else if (desc.includes("referral")) grantBreakdown.referral += tx.amount;
    else if (desc.includes("campaign launch") || desc.includes("launch verified")) grantBreakdown.campaignLaunch += tx.amount;
    else grantBreakdown.other += tx.amount;
  }

  const usageBreakdown = {
    research: 0,
    angles: 0,
    copy: 0,
    creative: 0,
    analyzeBasic: 0,
    analyzeAdvanced: 0,
    videoUnlocks: 0,
    videoGeneration: 0,
    consultation: 0,
    other: 0,
  };

  for (const tx of usageTransactions) {
    const desc = (tx.description || "").toLowerCase();
    const amt = Math.abs(tx.amount);
    if (desc.includes("research generation")) usageBreakdown.research += amt;
    else if (desc.includes("angles generation")) usageBreakdown.angles += amt;
    else if (desc.includes("copy generation")) usageBreakdown.copy += amt;
    else if (desc.includes("image generation")) usageBreakdown.creative += amt;
    else if (desc.includes("basic analysis")) usageBreakdown.analyzeBasic += amt;
    else if (desc.includes("advanced analysis")) usageBreakdown.analyzeAdvanced += amt;
    else if (desc.includes("video clip")) usageBreakdown.videoGeneration += amt;
    else if (desc.includes("video unlock") || desc.includes("video reward") || desc.includes("tutorial video")) usageBreakdown.videoUnlocks += amt;
    else if (desc.includes("live consultation")) usageBreakdown.consultation += amt;
    else usageBreakdown.other += amt;
  }

  const DEPT_KEYS: Record<string, string[]> = {
    research: ["research generation"],
    angles: ["angles generation"],
    copy: ["copy generation"],
    creative: ["image generation"],
    analyze: ["basic analysis", "advanced analysis"],
    video: ["video clip"],
    consultation: ["live consultation"],
  };
  const moduleUsageCount: Record<string, number> = {
    research: 0,
    angles: 0,
    copy: 0,
    creative: 0,
    analyze: 0,
    video: 0,
    consultation: 0,
  };
  const moduleUniqueUsers: Record<string, Set<string>> = {
    research: new Set(),
    angles: new Set(),
    copy: new Set(),
    creative: new Set(),
    analyze: new Set(),
    video: new Set(),
    consultation: new Set(),
  };

  for (const tx of usageTransactions) {
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

  const userDayMap = new Map<string, Set<string>>();
  for (const tx of usageTransactions) {
    if (!tx.created_at) continue;
    const day = getDateKeyInManila(tx.created_at);
    if (!userDayMap.has(tx.user_id)) userDayMap.set(tx.user_id, new Set());
    userDayMap.get(tx.user_id)!.add(day);
  }
  const returnUsers = [...userDayMap.values()].filter(days => days.size >= 2).length;
  const usersAtZero = users.filter(u => (u.credits_remaining ?? 0) === 0).length;
  const activeUsers = new Set(usageTransactions.map(tx => tx.user_id)).size;

  const userConsumption = new Map<string, number>();
  for (const tx of usageTransactions) {
    userConsumption.set(tx.user_id, (userConsumption.get(tx.user_id) || 0) + Math.abs(tx.amount));
  }
  const topUsers = [...userConsumption.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([userId, consumed]) => {
      const u = userTable.find(r => r.userId === userId);
      return {
        userId,
        username: u?.username || "User",
        email: u?.email || "",
        consumed,
        creditsRemaining: u?.creditsRemaining ?? 0,
        plan: u?.plan || "Lite",
      };
    });

  const last14Days = getLast14Days();
  const signupsByDay: Record<string, number> = {};
  for (const day of last14Days) signupsByDay[day] = 0;
  for (const u of userTable) {
    if (u.signupDate) {
      const day = getDateKeyInManila(u.signupDate);
      if (day in signupsByDay) signupsByDay[day]++;
    }
  }
  const signupTrend = last14Days.map(day => ({ day, label: getShortLabel(day), count: signupsByDay[day] }));

  const tokensByModule: Record<string, { prompt: number; completion: number; total: number; calls: number }> = {
    research: { prompt: 0, completion: 0, total: 0, calls: 0 },
    angles: { prompt: 0, completion: 0, total: 0, calls: 0 },
    copy: { prompt: 0, completion: 0, total: 0, calls: 0 },
    analyze: { prompt: 0, completion: 0, total: 0, calls: 0 },
    creative: { prompt: 0, completion: 0, total: 0, calls: 0 },
    video: { prompt: 0, completion: 0, total: 0, calls: 0 },
  };
  let grandTotalTokens = 0;

  for (const t of tokens) {
    const mod = t.module;
    if (mod in tokensByModule) {
      tokensByModule[mod].prompt += t.prompt_tokens || 0;
      tokensByModule[mod].completion += t.completion_tokens || 0;
      tokensByModule[mod].total += t.total_tokens || 0;
      tokensByModule[mod].calls++;
    }
    grandTotalTokens += t.total_tokens || 0;
  }

  const promptTokenTotal = tokens.reduce((s, t) => s + (t.prompt_tokens || 0), 0);
  const completionTokenTotal = tokens.reduce((s, t) => s + (t.completion_tokens || 0), 0);
  const estCostUSD = (promptTokenTotal / 1_000_000) * 0.15 + (completionTokenTotal / 1_000_000) * 0.60;

  const videoUnlocks = { campaign: 0, adset: 0, ads: 0, analyze_basic: 0, analyze_advanced: 0, generatedClips: 0 };
  for (const tx of transactions) {
    const description = (tx.description || "").toLowerCase();
    const isVideoUnlock = description.includes("tutorial video unlock") || description.includes("video reward") || description.includes("setup video reward");
    if (description.includes("video clip")) videoUnlocks.generatedClips++;
    if (!isVideoUnlock) continue;
    if (description.includes("analyze basic")) videoUnlocks.analyze_basic++;
    else if (description.includes("analyze advanced")) videoUnlocks.analyze_advanced++;
    else if (description.includes("ad set")) videoUnlocks.adset++;
    else if (description.includes("campaign")) videoUnlocks.campaign++;
    else if (description.includes("ads")) videoUnlocks.ads++;
  }

  const setupUsers = users.filter(hasSetup).length;
  const researchUsers = new Set([
    ...moduleUniqueUsers.research,
    ...users.filter(u => Boolean(u.research_output)).map(u => u.user_id),
  ]).size;
  const anglesUsers = new Set([
    ...moduleUniqueUsers.angles,
    ...users.filter(u => Boolean(u.angles_output || u.selected_angle)).map(u => u.user_id),
  ]).size;
  const creativeUsers = new Set([
    ...moduleUniqueUsers.creative,
    ...users.filter(hasAnyImage).map(u => u.user_id),
  ]).size;
  const copyUsers = new Set([
    ...moduleUniqueUsers.copy,
    ...users.filter(u => Boolean(u.copy_output)).map(u => u.user_id),
  ]).size;
  const launchUsers = new Set([
    ...launches.map(l => l.user_id).filter(Boolean) as string[],
    ...users.filter(u => (u.launches_approved ?? 0) > 0).map(u => u.user_id),
  ]).size;
  const paidUsers = new Set([
    ...topups.filter(t => (t.status || "").toLowerCase() === "approved").map(t => t.user_id).filter(Boolean) as string[],
    ...transactions.filter(tx => tx.type === "topup").map(tx => tx.user_id),
  ]).size;

  const activationFunnel = [
    buildConversionStep("signed_up", "Signed up", users.length, users.length, users.length),
    buildConversionStep("setup_complete", "Completed setup", setupUsers, users.length, users.length),
    buildConversionStep("research", "Used research", researchUsers, setupUsers, users.length),
    buildConversionStep("angles", "Used angles", anglesUsers, researchUsers, users.length),
    buildConversionStep("creative", "Generated creative", creativeUsers, anglesUsers, users.length),
    buildConversionStep("copy", "Generated copy", copyUsers, creativeUsers, users.length),
    buildConversionStep("launch", "Submitted launch proof", launchUsers, copyUsers, users.length),
    buildConversionStep("paid", "Bought credits", paidUsers, users.length, users.length),
  ];

  const approvedTopups = topups.filter(t => (t.status || "").toLowerCase() === "approved");
  const pendingTopups = topups.filter(t => (t.status || "").toLowerCase() === "pending");
  const rejectedTopups = topups.filter(t => (t.status || "").toLowerCase() === "rejected");
  const approvedRevenuePhp = approvedTopups.reduce((s, t) => s + asNumber(t.amount_paid), 0);
  const pendingRevenuePhp = pendingTopups.reduce((s, t) => s + asNumber(t.amount_paid), 0);
  const approvedTopupCredits = approvedTopups.reduce((s, t) => s + asNumber(t.credits_requested), 0);
  const packageCounts = new Map<string, number>();
  for (const t of approvedTopups) {
    const key = t.package || "Unknown";
    packageCounts.set(key, (packageCounts.get(key) || 0) + 1);
  }
  const topPackage = [...packageCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  const ratings = feedbacks.map(f => asNumber(f.rating)).filter(r => r > 0);
  const averageRating = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
  const highRatingCount = ratings.filter(r => r >= 4).length;
  const lowRatingCount = ratings.filter(r => r <= 2).length;
  const feedbackRewardCredits = grantBreakdown.feedback;

  const timeWindows = Object.fromEntries(WINDOW_KEYS.map(key => {
    const windowSignups = userTable.filter(u => inWindow(u.signupDate, key, now, todayKey)).length;
    const windowUsage = usageTransactions.filter(tx => inWindow(tx.created_at, key, now, todayKey));
    const windowGrants = grantTransactions.filter(tx => inWindow(tx.created_at, key, now, todayKey));
    const windowApprovedTopups = approvedTopups.filter(t => inWindow(t.approved_at || t.created_at, key, now, todayKey));
    const windowFeedback = feedbacks.filter(f => inWindow(f.created_at, key, now, todayKey));
    const windowLaunches = launches.filter(l => inWindow(l.created_at, key, now, todayKey));
    const windowTokens = tokens.filter(t => inWindow(t.created_at, key, now, todayKey));
    const windowEmails = emails.filter(e => inWindow(e.created_at, key, now, todayKey));

    return [key, {
      signups: windowSignups,
      activeUsers: uniqueUsers(windowUsage),
      creditsIssued: windowGrants.reduce((s, tx) => s + tx.amount, 0),
      creditsConsumed: Math.abs(windowUsage.reduce((s, tx) => s + tx.amount, 0)),
      topupsApproved: windowApprovedTopups.length,
      revenuePhp: windowApprovedTopups.reduce((s, t) => s + asNumber(t.amount_paid), 0),
      feedbacks: windowFeedback.length,
      launchesSubmitted: windowLaunches.length,
      tokenCalls: windowTokens.length,
      emailsSent: windowEmails.length,
    }];
  }));

  const revenue = {
    approvedRevenuePhp,
    pendingRevenuePhp,
    approvedTopupCount: approvedTopups.length,
    pendingTopupCount: pendingTopups.length,
    rejectedTopupCount: rejectedTopups.length,
    approvalRate: topups.length ? pctNumber(approvedTopups.length, topups.length) : 0,
    avgOrderValuePhp: approvedTopups.length ? Math.round(approvedRevenuePhp / approvedTopups.length) : 0,
    approvedTopupCredits,
    paidUsers,
    freeToPaidRate: users.length ? pctNumber(paidUsers, users.length) : 0,
    topPackage,
  };

  const feedback = {
    total: feedbacks.length,
    averageRating: Number(averageRating.toFixed(2)),
    highRatingCount,
    lowRatingCount,
    testimonialCandidates: highRatingCount,
    promptShownCount: promptShown.length,
    promptToFeedbackRate: promptShown.length ? pctNumber(feedbacks.length, promptShown.length) : null,
    rewardCreditsIssued: feedbackRewardCredits,
  };

  const noUsageUsers = Math.max(users.length - activeUsers, 0);
  const researchToAnglesRate = researchUsers ? pctNumber(anglesUsers, researchUsers) : 0;
  const creativeToCopyRate = creativeUsers ? pctNumber(copyUsers, creativeUsers) : 0;
  const copyToLaunchRate = copyUsers ? pctNumber(launchUsers, copyUsers) : 0;
  const returnRate = users.length ? pctNumber(returnUsers, users.length) : 0;

  const alerts: Array<{ level: "good" | "info" | "warning" | "critical"; title: string; message: string; action: string }> = [];
  if (pendingTopups.length > 0) {
    alerts.push({
      level: "critical",
      title: "Pending top-ups need approval",
      message: `${pendingTopups.length} request(s) worth PHP ${Math.round(pendingRevenuePhp).toLocaleString("en-PH")} are waiting.`,
      action: "Open GCash/payment proof and approve valid requests.",
    });
  }
  if (usersAtZero > 0) {
    alerts.push({
      level: "warning",
      title: "Users are out of credits",
      message: `${usersAtZero} user(s) have 0 credits and may stop using the app.`,
      action: "Send a top-up reminder or show a stronger pricing CTA.",
    });
  }
  if (noUsageUsers > 0 && users.length >= 5) {
    alerts.push({
      level: "warning",
      title: "Signup activation gap",
      message: `${noUsageUsers} user(s) signed up but have not spent credits yet.`,
      action: "Improve onboarding and send the signup drop-off email.",
    });
  }
  if (researchUsers >= 3 && researchToAnglesRate < 60) {
    alerts.push({
      level: "warning",
      title: "Research to angles drop-off",
      message: `Only ${researchToAnglesRate}% of research users continue to angles.`,
      action: "Add a stronger next-step CTA after research output.",
    });
  }
  if (creativeUsers >= 3 && creativeToCopyRate < 60) {
    alerts.push({
      level: "warning",
      title: "Creative to copy drop-off",
      message: `Only ${creativeToCopyRate}% of creative users continue to copy.`,
      action: "Make Use for Copy more visible and explain the next step.",
    });
  }
  if (copyUsers >= 3 && copyToLaunchRate < 30) {
    alerts.push({
      level: "info",
      title: "Launch proof is underused",
      message: `Only ${copyToLaunchRate}% of copy users submitted launch proof.`,
      action: "Promote the +20 credit launch reward near the copy output.",
    });
  }
  if (feedbacks.length >= 3 && averageRating < 4) {
    alerts.push({
      level: "critical",
      title: "Feedback quality needs attention",
      message: `Average rating is ${averageRating.toFixed(1)} from ${feedbacks.length} feedback(s).`,
      action: "Read low-rating feedback and fix repeated complaints first.",
    });
  }
  if (revenue.approvedRevenuePhp > 0) {
    alerts.push({
      level: "good",
      title: "Revenue is tracked",
      message: `Approved revenue is PHP ${Math.round(revenue.approvedRevenuePhp).toLocaleString("en-PH")} from ${revenue.approvedTopupCount} top-up(s).`,
      action: "Watch free-to-paid rate and pending top-ups daily.",
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      level: "info",
      title: "No urgent issues detected",
      message: "The dashboard has no critical alerts based on current usage.",
      action: "Keep monitoring activation, top-ups, and feedback.",
    });
  }

  const healthScore = Math.max(0, Math.min(100,
    40 +
    Math.min(20, returnRate) +
    Math.min(15, revenue.freeToPaidRate * 2) +
    Math.min(15, feedback.averageRating ? feedback.averageRating * 3 : 0) -
    Math.min(20, pendingTopups.length * 5) -
    Math.min(15, usersAtZero * 2)
  ));

  const recommendedActions = alerts
    .filter(a => a.level !== "good")
    .slice(0, 5)
    .map(a => a.action);
  if (recommendedActions.length === 0) {
    recommendedActions.push("Review the top users list and ask one power user for a testimonial.");
  }

  const recentActivity = transactions.slice(0, 20).map(tx => {
    const matchingUser = userTable.find(r => r.userId === tx.user_id);
    const username = matchingUser?.username || emailByUserId.get(tx.user_id)?.split("@")[0] || "User";
    return {
      userId: tx.user_id,
      username,
      type: tx.type,
      amount: tx.amount,
      description: tx.description || "",
      createdAt: tx.created_at || null,
      module: moduleFromDescription(tx.description || ""),
    };
  });

  const payload = {
    userStats: {
      totalSignups: users.length,
      newToday,
      new7d,
      new30d,
      planBreakdown,
      thisWeekSignups,
      lastWeekSignups,
      returnUsers,
      usersAtZero,
      activeUsers,
      noUsageUsers,
      returnRate,
    },
    creditActivity: {
      totalCreditsIssued,
      totalCreditsConsumed,
      topupEventCount: topupEvents.length,
      topupCreditsIssued,
      grantBreakdown,
      usageBreakdown,
    },
    tokenStats: { byModule: tokensByModule, grandTotalTokens, estCostUSD },
    departmentFunnel,
    activationFunnel,
    signupTrend,
    topUsers,
    videoUnlocks,
    revenue,
    feedback,
    timeWindows,
    alerts,
    recommendedActions,
    healthScore: Math.round(healthScore),
    users: userTable,
    recentActivity,
    dataQuality: {
      warnings,
      optionalSourcesAvailable: {
        tokenLogs: !warnings.some(w => w.startsWith("token_logs:")),
        topUps: !warnings.some(w => w.startsWith("top_up_requests:")),
        feedbacks: !warnings.some(w => w.startsWith("feedbacks:")),
        launches: !warnings.some(w => w.startsWith("campaign_launches:")),
        consultations: !warnings.some(w => w.startsWith("consultations:")),
        emails: !warnings.some(w => w.startsWith("email_log:")),
        feedbackPromptShownAt: !warnings.some(w => w.startsWith("feedback_prompt_shown_at:")),
      },
    },
    fetchedAt: new Date().toISOString(),
  };

  statsCache = { createdAt: Date.now(), payload };

  return NextResponse.json({
    ...payload,
    cache: { hit: false, ageSeconds: 0 },
  });
}
