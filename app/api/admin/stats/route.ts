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

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getPrimaryDate(row: UserDataRow) {
  return row.updated_at || null;
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

async function listAllAuthUsers() {
  const admin = adminClient();
  const users: Array<{
    id: string;
    email?: string;
    user_metadata?: { full_name?: string };
  }> = [];

  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const batch = data.users ?? [];
    users.push(...batch);

    if (batch.length < perPage) break;
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

  const [{ data: userDataRows, error: userDataError }, { data: transactionRows, error: transactionError }, authUsers] = await Promise.all([
    admin
      .from("user_data")
      .select("user_id, username, credits_remaining, credits_total, updated_at")
      .order("updated_at", { ascending: false }),
    admin
      .from("credit_transactions")
      .select("user_id, type, amount, description, created_at")
      .order("created_at", { ascending: false }),
    listAllAuthUsers(),
  ]);

  if (userDataError) {
    return NextResponse.json({ error: userDataError.message }, { status: 500 });
  }

  if (transactionError) {
    return NextResponse.json({ error: transactionError.message }, { status: 500 });
  }

  const users = (userDataRows || []) as UserDataRow[];
  const transactions = (transactionRows || []) as CreditTransactionRow[];

  const authUserMap = new Map(
    authUsers.map(authUser => [
      authUser.id,
      {
        email: authUser.email || "",
        fullName: authUser.user_metadata?.full_name || "",
      },
    ])
  );

  const todayKey = getTodayKeyInManila();
  const now = Date.now();
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

  let newToday = 0;
  let new7d = 0;
  let new30d = 0;

  const planBreakdown = {
    Lite: 0,
    Flex: 0,
    Max: 0,
  };

  const userTable = users.map(row => {
    const signupDate = getPrimaryDate(row);
    const creditsRemaining = row.credits_remaining ?? 0;
    const plan = derivePlanFromCredits(creditsRemaining);
    const authUser = authUserMap.get(row.user_id);
    const username =
      row.username ||
      authUser?.fullName ||
      authUser?.email?.split("@")[0] ||
      "User";

    if (signupDate) {
      const signupTime = new Date(signupDate).getTime();
      if (getDateKeyInManila(signupDate) === todayKey) newToday += 1;
      if (signupTime >= sevenDaysAgo) new7d += 1;
      if (signupTime >= thirtyDaysAgo) new30d += 1;
    }

    planBreakdown[plan] += 1;

    return {
      userId: row.user_id,
      username,
      email: authUser?.email || "",
      plan,
      creditsRemaining,
      signupDate,
    };
  });

  const totalCreditsIssued = transactions
    .filter(tx => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalCreditsConsumed = Math.abs(
    transactions
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + tx.amount, 0)
  );

  const topupEvents = transactions.filter(tx => tx.type === "topup");
  const topupCreditsIssued = topupEvents.reduce((sum, tx) => sum + Math.max(tx.amount, 0), 0);

  const videoUnlocks = {
    campaign: 0,
    adset: 0,
    ads: 0,
    analyze_basic: 0,
    analyze_advanced: 0,
  };

  for (const tx of transactions) {
    const description = (tx.description || "").toLowerCase();
    const isVideoUnlock =
      description.includes("tutorial video unlock") ||
      description.includes("video reward") ||
      description.includes("setup video reward");

    if (!isVideoUnlock) continue;

    if (description.includes("analyze basic")) {
      videoUnlocks.analyze_basic += 1;
    } else if (description.includes("analyze advanced")) {
      videoUnlocks.analyze_advanced += 1;
    } else if (description.includes("ad set")) {
      videoUnlocks.adset += 1;
    } else if (description.includes("campaign")) {
      videoUnlocks.campaign += 1;
    } else if (description.includes("ads")) {
      videoUnlocks.ads += 1;
    }
  }

  const recentActivity = transactions.slice(0, 20).map(tx => {
    const authUser = authUserMap.get(tx.user_id);
    const matchingUser = userTable.find(row => row.userId === tx.user_id);
    const username =
      matchingUser?.username ||
      authUser?.fullName ||
      authUser?.email?.split("@")[0] ||
      "User";

    return {
      userId: tx.user_id,
      username,
      type: tx.type,
      amount: tx.amount,
      description: tx.description || "",
      createdAt: tx.created_at || null,
    };
  });

  return NextResponse.json({
    userStats: {
      totalSignups: users.length,
      newToday,
      new7d,
      new30d,
      planBreakdown,
    },
    creditActivity: {
      totalCreditsIssued,
      totalCreditsConsumed,
      topupEventCount: topupEvents.length,
      topupCreditsIssued,
    },
    videoUnlocks,
    users: userTable,
    recentActivity,
    fetchedAt: new Date().toISOString(),
  });
}
