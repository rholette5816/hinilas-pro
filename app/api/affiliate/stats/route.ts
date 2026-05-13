import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ACTIVE_MEMBER_DAYS,
  OVERRIDE_ACTIVE_REQUIRED,
  OVERRIDE_ACTIVE_REQUIRED_GEN2,
  OVERRIDE_RATES,
  OVERRIDE_RATES_GEN2,
  adminClient,
  asMoneyNumber,
  calculateWithdrawableEarnings,
  coerceAffiliateRank,
  getHoldCutoffDate,
  getNextRank,
  type AffiliateRank,
} from "@/lib/affiliate";

type EarningRow = {
  id: string;
  affiliate_id: string;
  from_user_id: string;
  type: string;
  source_amount: number | string;
  amount_earned: number | string;
  status: string;
  created_at: string;
};

type PayoutRow = {
  id: string;
  affiliate_id: string;
  user_id: string;
  amount: number | string;
  gcash_number: string;
  gcash_name: string;
  status: string;
  requested_at: string;
  paid_at: string | null;
};

type OverrideRow = {
  id: string;
  affiliate_id: string;
  month: string;
  team_topup_revenue: number | string;
  active_members: number | string;
  override_rate: number | string;
  amount_earned: number | string;
  override_type?: string | null;
  status: string;
  calculated_at: string;
};

type MemberRow = {
  user_id: string;
  username?: string | null;
  avatar_url?: string | null;
  updated_at?: string | null;
  referral_code?: string | null;
};

type MemberAffiliateRow = {
  user_id: string;
  total_paid_referrals?: number | string | null;
};

type Gen2MemberRow = {
  user_id: string;
  username?: string | null;
  avatar_url?: string | null;
  updated_at?: string | null;
  referred_by?: string | null;
};

type Gen2Member = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  joined_at: string | null;
  active: boolean;
  total_paid: number;
};

function maskEmail(email: string | null | undefined) {
  if (!email || !email.includes("@")) return "Hidden user";
  const [name, domain] = email.split("@");
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(name.length - 2, 2))}@${domain}`;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = adminClient();

  const { data: affiliate, error: affiliateError } = await admin
    .from("affiliates")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (affiliateError) return NextResponse.json({ error: affiliateError.message }, { status: 500 });
  if (!affiliate) return NextResponse.json({ notAffiliate: true });

  const [
    { data: earningsData, error: earningsError },
    { data: payoutsData, error: payoutsError },
    { data: overridesData, error: overridesError },
    { data: userData },
  ] = await Promise.all([
    admin.from("affiliate_earnings").select("*").eq("affiliate_id", affiliate.id).order("created_at", { ascending: false }),
    admin.from("affiliate_payouts").select("*").eq("affiliate_id", affiliate.id).order("requested_at", { ascending: false }),
    admin.from("affiliate_overrides").select("*").eq("affiliate_id", affiliate.id).order("calculated_at", { ascending: false }),
    admin.from("user_data").select("referral_code").eq("user_id", user.id).single(),
  ]);

  if (earningsError) return NextResponse.json({ error: earningsError.message }, { status: 500 });
  if (payoutsError) return NextResponse.json({ error: payoutsError.message }, { status: 500 });
  if (overridesError) return NextResponse.json({ error: overridesError.message }, { status: 500 });

  const earnings = (earningsData || []) as EarningRow[];
  const payouts = (payoutsData || []) as PayoutRow[];
  const overrides = (overridesData || []) as OverrideRow[];
  const referralCode = userData?.referral_code || null;

  let members: Array<MemberRow & { total_paid: number; joined_at: string | null; active: boolean; total_paid_referrals: number }> = [];
  let activeMembers = 0;
  let gen2Members: Record<string, Gen2Member[]> = {};
  let gen2ActiveCount = 0;
  if (referralCode) {
    const { data: memberRows } = await admin
      .from("user_data")
      .select("user_id, username, avatar_url, updated_at, referral_code")
      .eq("referred_by", referralCode)
      .order("updated_at", { ascending: false });

    const rawMembers = (memberRows || []) as MemberRow[];
    const memberIds = rawMembers.map(member => member.user_id);
    const totalPaidByUser = new Map<string, number>();
    const teamCountByUser = new Map<string, number>();
    const activeMemberIds = new Set<string>();
    const since30 = new Date(Date.now() - ACTIVE_MEMBER_DAYS * 24 * 60 * 60 * 1000).toISOString();

    if (memberIds.length > 0) {
      const [{ data: topups }, { data: activeTopups }, { data: memberAffiliates }] = await Promise.all([
        admin
          .from("top_up_requests")
          .select("user_id, amount_paid")
          .eq("status", "approved")
          .in("user_id", memberIds),
        admin
          .from("top_up_requests")
          .select("user_id")
          .eq("status", "approved")
          .in("user_id", memberIds)
          .gte("approved_at", since30),
        admin
          .from("affiliates")
          .select("user_id, total_paid_referrals")
          .in("user_id", memberIds),
      ]);

      for (const topup of topups || []) {
        const userId = String(topup.user_id);
        totalPaidByUser.set(userId, (totalPaidByUser.get(userId) || 0) + asMoneyNumber(topup.amount_paid));
      }
      for (const topup of activeTopups || []) {
        activeMemberIds.add(String(topup.user_id));
      }
      for (const memberAffiliate of (memberAffiliates || []) as MemberAffiliateRow[]) {
        teamCountByUser.set(memberAffiliate.user_id, asMoneyNumber(memberAffiliate.total_paid_referrals));
      }

      const { data: gen1ReferralCodes } = await admin
        .from("user_data")
        .select("user_id, referral_code")
        .in("user_id", memberIds);

      const codeToGen1UserId = new Map(
        ((gen1ReferralCodes || []) as MemberRow[])
          .filter(row => Boolean(row.referral_code))
          .map(row => [row.referral_code as string, row.user_id])
      );
      const gen1Codes = Array.from(codeToGen1UserId.keys());

      if (gen1Codes.length > 0) {
        const { data: gen2Rows } = await admin
          .from("user_data")
          .select("user_id, username, avatar_url, updated_at, referred_by")
          .in("referred_by", gen1Codes);

        const gen2Ids = ((gen2Rows || []) as Gen2MemberRow[]).map(row => row.user_id).filter(Boolean);
        const activeGen2Ids = new Set<string>();
        const gen2TotalPaidByUser = new Map<string, number>();

        if (gen2Ids.length > 0) {
          const { data: gen2ActiveTopups } = await admin
            .from("top_up_requests")
            .select("user_id, amount_paid")
            .in("user_id", gen2Ids)
            .eq("status", "approved")
            .gte("approved_at", since30);

          for (const topup of gen2ActiveTopups || []) {
            const userId = String(topup.user_id);
            activeGen2Ids.add(userId);
            gen2TotalPaidByUser.set(userId, (gen2TotalPaidByUser.get(userId) || 0) + asMoneyNumber(topup.amount_paid));
          }
        }

        gen2Members = {};
        for (const row of (gen2Rows || []) as Gen2MemberRow[]) {
          const gen1UserId = row.referred_by ? codeToGen1UserId.get(row.referred_by) : null;
          if (!gen1UserId) continue;
          if (!gen2Members[gen1UserId]) gen2Members[gen1UserId] = [];
          gen2Members[gen1UserId].push({
            user_id: row.user_id,
            username: row.username || null,
            avatar_url: row.avatar_url || null,
            joined_at: row.updated_at || null,
            active: activeGen2Ids.has(row.user_id),
            total_paid: gen2TotalPaidByUser.get(row.user_id) || 0,
          });
        }

        gen2ActiveCount = activeGen2Ids.size;
      }
    }

    activeMembers = activeMemberIds.size;
    members = rawMembers.map(member => ({
      ...member,
      joined_at: member.updated_at || null,
      total_paid: totalPaidByUser.get(member.user_id) || 0,
      active: activeMemberIds.has(member.user_id),
      total_paid_referrals: teamCountByUser.get(member.user_id) || 0,
    }));
  }

  const emailByUserId = new Map<string, string | null>();
  await Promise.all(
    Array.from(new Set(earnings.map(earning => earning.from_user_id))).map(async (userId) => {
      const { data } = await admin.auth.admin.getUserById(userId);
      emailByUserId.set(userId, data.user?.email || null);
    })
  );

  const cutoff = getHoldCutoffDate().getTime();
  const totalEarned = earnings.reduce((sum, earning) => sum + asMoneyNumber(earning.amount_earned), 0);
  const totalPaid = payouts
    .filter(payout => payout.status === "paid")
    .reduce((sum, payout) => sum + asMoneyNumber(payout.amount), 0);
  const pendingBalance = calculateWithdrawableEarnings(earnings);
  const holdBalance = earnings.reduce((sum, earning) => {
    const createdAt = earning.created_at ? new Date(earning.created_at).getTime() : 0;
    if (earning.status === "pending" && createdAt > cutoff) return sum + asMoneyNumber(earning.amount_earned);
    return sum;
  }, 0);

  const totalPaidReferrals = Number(affiliate.total_paid_referrals || 0);
  const rank = coerceAffiliateRank(affiliate.rank, totalPaidReferrals);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartTime = monthStart.getTime();
  const thisMonthEarnings = earnings.reduce((sum, earning) => {
    const createdAt = earning.created_at ? new Date(earning.created_at).getTime() : 0;
    return createdAt >= monthStartTime ? sum + asMoneyNumber(earning.amount_earned) : sum;
  }, 0);
  const thisMonthOverride = earnings.reduce((sum, earning) => {
    const createdAt = earning.created_at ? new Date(earning.created_at).getTime() : 0;
    return earning.type === "override" && createdAt >= monthStartTime ? sum + asMoneyNumber(earning.amount_earned) : sum;
  }, 0);
  const thisMonthGen2Override = earnings.reduce((sum, earning) => {
    const createdAt = earning.created_at ? new Date(earning.created_at).getTime() : 0;
    return earning.type === "override_gen2" && createdAt >= monthStartTime ? sum + asMoneyNumber(earning.amount_earned) : sum;
  }, 0);

  return NextResponse.json({
    notAffiliate: false,
    affiliate: {
      id: affiliate.id,
      gcashNumber: affiliate.gcash_number,
      gcashName: affiliate.gcash_name,
      status: affiliate.status,
      rank,
      joinedAt: affiliate.joined_at,
    },
    referralCode,
    totalEarned,
    totalPaid,
    pendingBalance,
    holdBalance,
    rank,
    totalPaidReferrals,
    nextRank: getNextRank(totalPaidReferrals),
    thisMonthEarnings,
    thisMonthOverride,
    thisMonthGen2Override,
    activeMembers,
    overrideRate: OVERRIDE_RATES[rank as AffiliateRank],
    overrideActiveRequired: OVERRIDE_ACTIVE_REQUIRED[rank as AffiliateRank],
    gen2Members,
    gen2ActiveCount,
    gen2OverrideRate: OVERRIDE_RATES_GEN2[rank as AffiliateRank],
    gen2OverrideActiveRequired: OVERRIDE_ACTIVE_REQUIRED_GEN2[rank as AffiliateRank],
    overrides: overrides.map(override => ({
      ...override,
      team_topup_revenue: asMoneyNumber(override.team_topup_revenue),
      active_members: asMoneyNumber(override.active_members),
      override_rate: asMoneyNumber(override.override_rate),
      amount_earned: asMoneyNumber(override.amount_earned),
    })),
    earnings: earnings.map(earning => ({
      ...earning,
      source_amount: asMoneyNumber(earning.source_amount),
      amount_earned: asMoneyNumber(earning.amount_earned),
      from_email: maskEmail(emailByUserId.get(earning.from_user_id)),
    })),
    payouts: payouts.map(payout => ({
      ...payout,
      amount: asMoneyNumber(payout.amount),
    })),
    members,
    membersWithTeams: members,
  });
}
