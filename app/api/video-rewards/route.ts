import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isOwnerUser } from "@/lib/admin";
import { deductCreditsAtomic } from "@/lib/credits";
import { checkRateLimit } from "@/lib/rate-limit";

const VIDEO_COST = 1;
const UNLOCK_DURATION_MS = 24 * 60 * 60 * 1000;

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

  const rl = checkRateLimit(`video-rewards:${user.id}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
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
    if (result[key].unlocked) continue;
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

  const rl = checkRateLimit(`video-rewards:${user.id}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const videoKey = typeof body.videoKey === "string" ? body.videoKey : "";

  if (!isVideoKey(videoKey)) {
    return NextResponse.json({ error: "Invalid video key" }, { status: 400 });
  }

  if (isOwnerUser(user)) {
    const expiresAt = new Date(Date.now() + UNLOCK_DURATION_MS).toISOString();
    return NextResponse.json({ unlocked: true, alreadyUnlocked: false, expiresAt, creditsRemaining: 9999 });
  }

  const admin = adminClient();
  const description = VIDEO_CONFIG[videoKey];

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

  const deduction = await deductCreditsAtomic({
    userId: user.id,
    amount: VIDEO_COST,
    description,
  });

  if (!deduction.ok) {
    if (deduction.code === "NO_CREDITS") {
      return NextResponse.json({ error: "No credits remaining", code: "NO_CREDITS" }, { status: 402 });
    }
    return NextResponse.json({ error: "Credit update failed", code: deduction.code }, { status: 409 });
  }

  const expiresAt = new Date(Date.now() + UNLOCK_DURATION_MS).toISOString();

  return NextResponse.json({
    unlocked: true,
    alreadyUnlocked: false,
    expiresAt,
    creditsRemaining: deduction.creditsRemaining,
  });
}
