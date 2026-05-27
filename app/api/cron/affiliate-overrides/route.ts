import { NextResponse } from "next/server";
import { acquireCronLock } from "@/lib/cron-lock";
import {
  ACTIVE_MEMBER_DAYS,
  OVERRIDE_ACTIVE_REQUIRED,
  OVERRIDE_ACTIVE_REQUIRED_GEN2,
  OVERRIDE_RATES,
  OVERRIDE_RATES_GEN2,
  adminClient,
  asMoneyNumber,
  coerceAffiliateRank,
  sendTelegramNotification,
  type AffiliateRank,
} from "@/lib/affiliate";

export const maxDuration = 60;

type AffiliateRow = {
  id: string;
  user_id: string;
  rank: string | null;
  total_paid_referrals: number | string | null;
  status: string | null;
};

type MemberRow = {
  user_id: string;
  referral_code?: string | null;
};

type ExistingOverrideRow = {
  id: string;
  override_type?: string | null;
};

function previousCalendarMonth() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const month = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
  return { month, startIso: start.toISOString(), endIso: end.toISOString() };
}

function isOverrideRank(rank: AffiliateRank) {
  return rank === "Leader" || rank === "Educator" || rank === "Top Leader";
}

function serverError(context: string, error: unknown) {
  console.error(`[cron-affiliate-overrides] ${context}:`, error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!acquireCronLock("affiliate-overrides")) {
    return NextResponse.json({ message: "Already ran recently" }, { status: 200 });
  }

  const admin = adminClient();
  const { month, startIso, endIso } = previousCalendarMonth();
  const activeSince = new Date(Date.now() - ACTIVE_MEMBER_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: affiliateRows, error: affiliateError } = await admin
    .from("affiliates")
    .select("id, user_id, rank, total_paid_referrals, status")
    .eq("status", "active");

  if (affiliateError) return serverError("affiliate query error", affiliateError);

  let gen1Earners = 0;
  let gen2Earners = 0;
  let totalGen1Override = 0;
  let totalGen2Override = 0;
  let skippedExisting = 0;

  for (const affiliate of (affiliateRows || []) as AffiliateRow[]) {
    const rank = coerceAffiliateRank(affiliate.rank, asMoneyNumber(affiliate.total_paid_referrals));
    if (!isOverrideRank(rank)) continue;

    const { data: existingOverrides, error: existingOverrideError } = await admin
      .from("affiliate_overrides")
      .select("id, override_type")
      .eq("affiliate_id", affiliate.id)
      .eq("month", month);

    if (existingOverrideError) return serverError("existing override query error", existingOverrideError);
    const existingOverrideTypes = new Set(
      ((existingOverrides || []) as ExistingOverrideRow[]).map(row => row.override_type || "gen1")
    );

    const { data: affiliateUserData } = await admin
      .from("user_data")
      .select("referral_code")
      .eq("user_id", affiliate.user_id)
      .maybeSingle();

    const referralCode = affiliateUserData?.referral_code;
    if (!referralCode) continue;

    const { data: memberRows } = await admin
      .from("user_data")
      .select("user_id, referral_code")
      .eq("referred_by", referralCode);

    const directMembers = (memberRows || []) as MemberRow[];
    const memberIds = directMembers.map(member => member.user_id).filter(Boolean);
    if (memberIds.length === 0) continue;

    if (existingOverrideTypes.has("gen1")) {
      skippedExisting += 1;
    } else {
      const { data: activeTopups } = await admin
        .from("top_up_requests")
        .select("user_id")
        .eq("status", "approved")
        .in("user_id", memberIds)
        .gte("approved_at", activeSince);

      const activeMembers = new Set((activeTopups || []).map(row => String(row.user_id))).size;

      if (activeMembers >= OVERRIDE_ACTIVE_REQUIRED[rank]) {
        const { data: monthlyTopups, error: topupError } = await admin
          .from("top_up_requests")
          .select("amount_paid")
          .eq("status", "approved")
          .in("user_id", memberIds)
          .gte("approved_at", startIso)
          .lt("approved_at", endIso);

        if (topupError) return serverError("gen1 topup query error", topupError);

        const teamTopupRevenue = (monthlyTopups || []).reduce((sum, topup) => sum + asMoneyNumber(topup.amount_paid), 0);
        const overrideRate = OVERRIDE_RATES[rank];
        const amountEarned = Math.round(teamTopupRevenue * overrideRate);

        if (amountEarned > 0) {
          const { error: overrideError } = await admin.from("affiliate_overrides").insert({
            affiliate_id: affiliate.id,
            month,
            team_topup_revenue: teamTopupRevenue,
            active_members: activeMembers,
            override_rate: overrideRate,
            amount_earned: amountEarned,
            override_type: "gen1",
            status: "pending",
          });

          if (overrideError) return serverError("gen1 override insert error", overrideError);

          const { error: earningError } = await admin.from("affiliate_earnings").insert({
            affiliate_id: affiliate.id,
            from_user_id: affiliate.user_id,
            type: "override",
            source_amount: teamTopupRevenue,
            amount_earned: amountEarned,
            status: "pending",
          });

          if (earningError) return serverError("gen1 earning insert error", earningError);

          gen1Earners += 1;
          totalGen1Override += amountEarned;
        }
      }
    }

    if (existingOverrideTypes.has("gen2")) {
      skippedExisting += 1;
      continue;
    }

    const gen1Codes = directMembers.map(member => member.referral_code).filter(Boolean) as string[];
    if (gen1Codes.length === 0) continue;

    const { data: gen2Rows } = await admin
      .from("user_data")
      .select("user_id")
      .in("referred_by", gen1Codes);

    const gen2Ids = ((gen2Rows || []) as MemberRow[]).map(member => member.user_id).filter(Boolean);
    if (gen2Ids.length === 0) continue;

    const { data: activeGen2Topups } = await admin
      .from("top_up_requests")
      .select("user_id")
      .eq("status", "approved")
      .in("user_id", gen2Ids)
      .gte("approved_at", activeSince);

    const activeGen2Members = new Set((activeGen2Topups || []).map(row => String(row.user_id))).size;
    if (activeGen2Members < OVERRIDE_ACTIVE_REQUIRED_GEN2[rank]) continue;

    const { data: monthlyGen2Topups, error: gen2TopupError } = await admin
      .from("top_up_requests")
      .select("amount_paid")
      .eq("status", "approved")
      .in("user_id", gen2Ids)
      .gte("approved_at", startIso)
      .lt("approved_at", endIso);

    if (gen2TopupError) return serverError("gen2 topup query error", gen2TopupError);

    const gen2TopupRevenue = (monthlyGen2Topups || []).reduce((sum, topup) => sum + asMoneyNumber(topup.amount_paid), 0);
    const gen2OverrideRate = OVERRIDE_RATES_GEN2[rank];
    const gen2AmountEarned = Math.round(gen2TopupRevenue * gen2OverrideRate);
    if (gen2AmountEarned <= 0) continue;

    const { error: gen2OverrideError } = await admin.from("affiliate_overrides").insert({
      affiliate_id: affiliate.id,
      month,
      team_topup_revenue: gen2TopupRevenue,
      active_members: activeGen2Members,
      override_rate: gen2OverrideRate,
      amount_earned: gen2AmountEarned,
      override_type: "gen2",
      status: "pending",
    });

    if (gen2OverrideError) return serverError("gen2 override insert error", gen2OverrideError);

    const { error: gen2EarningError } = await admin.from("affiliate_earnings").insert({
      affiliate_id: affiliate.id,
      from_user_id: affiliate.user_id,
      type: "override_gen2",
      source_amount: gen2TopupRevenue,
      amount_earned: gen2AmountEarned,
      status: "pending",
    });

    if (gen2EarningError) return serverError("gen2 earning insert error", gen2EarningError);

    gen2Earners += 1;
    totalGen2Override += gen2AmountEarned;
  }

  await sendTelegramNotification(
    `Monthly overrides calculated for ${month}. Gen 1: ${gen1Earners} affiliates, PHP ${totalGen1Override.toLocaleString("en-PH")}. Gen 2: ${gen2Earners} affiliates, PHP ${totalGen2Override.toLocaleString("en-PH")}.`
  );

  return NextResponse.json({
    success: true,
    month,
    gen1Earners,
    gen2Earners,
    totalGen1Override,
    totalGen2Override,
    totalOverride: totalGen1Override + totalGen2Override,
    skippedExisting,
  });
}
