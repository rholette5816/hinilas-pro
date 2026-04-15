import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const VIDEO_COST = 1;

const VIDEO_CONFIG = {
  campaign: "Campaign tutorial video unlock",
  adset: "Ad Set tutorial video unlock",
  ads: "Ads tutorial video unlock",
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
    .select("description")
    .eq("user_id", user.id)
    .eq("type", "use")
    .in("description", descriptions);

  const claimed = {
    campaign: false,
    adset: false,
    ads: false,
  };

  for (const row of data || []) {
    if (row.description === VIDEO_CONFIG.campaign) claimed.campaign = true;
    if (row.description === VIDEO_CONFIG.adset) claimed.adset = true;
    if (row.description === VIDEO_CONFIG.ads) claimed.ads = true;
  }

  return NextResponse.json({ claimed });
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

  const { data: existing } = await admin
    .from("credit_transactions")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "use")
    .eq("description", description)
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ awarded: false, alreadyClaimed: true });
  }

  const { data: userData } = await admin
    .from("user_data")
    .select("credits_remaining, credits_total")
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

  await admin.from("credit_transactions").insert({
    user_id: user.id,
    type: "use",
    amount: -VIDEO_COST,
    description,
  });

  return NextResponse.json({
    unlocked: true,
    alreadyClaimed: false,
    creditsRemaining,
  });
}
