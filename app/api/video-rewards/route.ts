import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const VIDEO_COST = 1;
const UNLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const VIDEO_CONFIG = {
  campaign: "Campaign tutorial video unlock",
  adset: "Ad Set tutorial video unlock",
  ads: "Ads tutorial video unlock",
  analyze_basic: "Analyze Basic tutorial video unlock",
  analyze_advanced: "Analyze Advanced tutorial video unlock",
} as const;

type VideoKey = keyof typeof VIDEO_CONFIG;

function isVideoKey(value: string): value is VideoKey {
  return value in VIDEO_CONFIG;
}

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function isWithin24h(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < UNLOCK_DURATION_MS;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = adminClient();
  const descriptions = Object.values(VIDEO_CONFIG);

  const { data } = await admin
    .from("credit_transactions")
    .select("description, created_at")
    .eq("user_id", user.id)
    .eq("type", "use")
    .in("description", descriptions)
    .order("created_at", { ascending: false });

  // For each key, find the most recent unlock and check if it's within 24h
  const result: Record<VideoKey, { unlocked: boolean; expiresAt: string | null }> = {
    campaign: { unlocked: false, expiresAt: null },
    adset: { unlocked: false, expiresAt: null },
    ads: { unlocked: false, expiresAt: null },
    analyze_basic: { unlocked: false, expiresAt: null },
    analyze_advanced: { unlocked: false, expiresAt: null },
  };

  for (const row of data || []) {
    const key = (Object.keys(VIDEO_CONFIG) as VideoKey[]).find(k => VIDEO_CONFIG[k] === row.description);
    if (!key) continue;
    if (result[key].unlocked) continue; // already found most recent
    if (isWithin24h(row.created_at)) {
      const expiresAt = new Date(new Date(row.created_at).getTime() + UNLOCK_DURATION_MS).toISOString();
      result[key] = { unlocked: true, expiresAt };
    }
  }

  return NextResponse.json({ videos: result });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const videoKey = typeof body.videoKey === "string" ? body.videoKey : "";

  if (!isVideoKey(videoKey)) {
    return NextResponse.json({ error: "Invalid video key" }, { status: 400 });
  }

  const admin = adminClient();
  const description = VIDEO_CONFIG[videoKey];

  // Check if already unlocked within 24h
  const { data: recent } = await admin
    .from("credit_transactions")
    .select("created_at")
    .eq("user_id", user.id)
    .eq("type", "use")
    .eq("description", description)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (recent && isWithin24h(recent.created_at)) {
    const expiresAt = new Date(new Date(recent.created_at).getTime() + UNLOCK_DURATION_MS).toISOString();
    return NextResponse.json({ unlocked: false, alreadyUnlocked: true, expiresAt });
  }

  const { data: userData } = await admin
    .from("user_data")
    .select("credits_remaining")
    .eq("user_id", user.id)
    .single();

  if (!userData) {
    return NextResponse.json({ error: "User data not found" }, { status: 404 });
  }

  if (userData.credits_remaining < VIDEO_COST) {
    return NextResponse.json({ error: "No credits remaining", code: "NO_CREDITS" }, { status: 402 });
  }

  const creditsRemaining = userData.credits_remaining - VIDEO_COST;

  await admin
    .from("user_data")
    .update({ credits_remaining: creditsRemaining })
    .eq("user_id", user.id);

  const now = new Date().toISOString();
  await admin.from("credit_transactions").insert({
    user_id: user.id,
    type: "use",
    amount: -VIDEO_COST,
    description,
    created_at: now,
  });

  const expiresAt = new Date(new Date(now).getTime() + UNLOCK_DURATION_MS).toISOString();

  return NextResponse.json({
    unlocked: true,
    alreadyUnlocked: false,
    expiresAt,
    creditsRemaining,
  });
}
