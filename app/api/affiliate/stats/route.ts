import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient, asMoneyNumber, calculateWithdrawableEarnings, getHoldCutoffDate, getNextRank } from "@/lib/affiliate";

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

type MemberRow = {
  user_id: string;
  username?: string | null;
  avatar_url?: string | null;
  updated_at?: string | null;
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
    { data: userData },
  ] = await Promise.all([
    admin.from("affiliate_earnings").select("*").eq("affiliate_id", affiliate.id).order("created_at", { ascending: false }),
    admin.from("affiliate_payouts").select("*").eq("affiliate_id", affiliate.id).order("requested_at", { ascending: false }),
    admin.from("user_data").select("referral_code").eq("user_id", user.id).single(),
  ]);

  if (earningsError) return NextResponse.json({ error: earningsError.message }, { status: 500 });
  if (payoutsError) return NextResponse.json({ error: payoutsError.message }, { status: 500 });

  const earnings = (earningsData || []) as EarningRow[];
  const payouts = (payoutsData || []) as PayoutRow[];
  const referralCode = userData?.referral_code || null;

  let members: Array<MemberRow & { total_paid: number; joined_at: string | null }> = [];
  if (referralCode) {
    const { data: memberRows } = await admin
      .from("user_data")
      .select("user_id, username, avatar_url, updated_at")
      .eq("referred_by", referralCode)
      .order("updated_at", { ascending: false });

    const rawMembers = (memberRows || []) as MemberRow[];
    const memberIds = rawMembers.map(member => member.user_id);
    const totalPaidByUser = new Map<string, number>();

    if (memberIds.length > 0) {
      const { data: topups } = await admin
        .from("top_up_requests")
        .select("user_id, amount_paid")
        .eq("status", "approved")
        .in("user_id", memberIds);

      for (const topup of topups || []) {
        const userId = String(topup.user_id);
        totalPaidByUser.set(userId, (totalPaidByUser.get(userId) || 0) + asMoneyNumber(topup.amount_paid));
      }
    }

    members = rawMembers.map(member => ({
      ...member,
      joined_at: member.updated_at || null,
      total_paid: totalPaidByUser.get(member.user_id) || 0,
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

  return NextResponse.json({
    notAffiliate: false,
    affiliate: {
      id: affiliate.id,
      gcashNumber: affiliate.gcash_number,
      gcashName: affiliate.gcash_name,
      status: affiliate.status,
      rank: affiliate.rank,
      joinedAt: affiliate.joined_at,
    },
    referralCode,
    totalEarned,
    totalPaid,
    pendingBalance,
    holdBalance,
    rank: affiliate.rank,
    totalPaidReferrals,
    nextRank: getNextRank(totalPaidReferrals),
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
  });
}
