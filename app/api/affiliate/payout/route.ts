import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient, calculateWithdrawableEarnings, MIN_PAYOUT_AMOUNT, sendTelegramNotification } from "@/lib/affiliate";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`affiliate-payout:${user.id}`, { limit: 5, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const admin = adminClient();

  const { data: affiliate } = await admin
    .from("affiliates")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!affiliate) return NextResponse.json({ error: "Partner account not found" }, { status: 404 });
  if (affiliate.status !== "active") return NextResponse.json({ error: "Partner account is not active" }, { status: 403 });

  const { data: existingPayout } = await admin
    .from("affiliate_payouts")
    .select("id")
    .eq("affiliate_id", affiliate.id)
    .eq("status", "requested")
    .maybeSingle();

  if (existingPayout) {
    return NextResponse.json({ error: "You already have a pending payout request" }, { status: 400 });
  }

  const { data: earnings } = await admin
    .from("affiliate_earnings")
    .select("amount_earned, status, created_at")
    .eq("affiliate_id", affiliate.id);

  const pendingBalance = calculateWithdrawableEarnings(earnings || []);

  if (pendingBalance < MIN_PAYOUT_AMOUNT) {
    return NextResponse.json({ error: "Minimum payout is PHP 200" }, { status: 400 });
  }

  const { error } = await admin.from("affiliate_payouts").insert({
    affiliate_id: affiliate.id,
    user_id: user.id,
    amount: pendingBalance,
    gcash_number: affiliate.gcash_number,
    gcash_name: affiliate.gcash_name,
    status: "requested",
  });

  if (error) {
    console.error("[affiliate-payout] payout insert error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  const { data: userData } = await admin
    .from("user_data")
    .select("username")
    .eq("user_id", user.id)
    .maybeSingle();

  await sendTelegramNotification(
    [
      "Partner Payout Request",
      "",
      `Partner: ${userData?.username || "User"} (${user.email || "no email"})`,
      `GCash: ${affiliate.gcash_name} - ${affiliate.gcash_number}`,
      `Amount: PHP ${pendingBalance.toLocaleString("en-PH")}`,
      "",
      "Go to admin to approve.",
    ].join("\n")
  );

  return NextResponse.json({ success: true });
}
