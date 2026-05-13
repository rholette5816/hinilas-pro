import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AffiliateRank = "Starter" | "Hustler" | "Pro" | "Elite";

export const MIN_PAYOUT_AMOUNT = 200;
export const AFFILIATE_HOLD_DAYS = 7;

const RANK_BONUS: Record<AffiliateRank, number> = {
  Starter: 0,
  Hustler: 25,
  Pro: 50,
  Elite: 75,
};

export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export function getHoldCutoffDate() {
  return new Date(Date.now() - AFFILIATE_HOLD_DAYS * 24 * 60 * 60 * 1000);
}

export function asMoneyNumber(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  return Number.isFinite(n) ? Number(n) : 0;
}

export function getRankForPaidReferrals(count: number): AffiliateRank {
  if (count >= 30) return "Elite";
  if (count >= 15) return "Pro";
  if (count >= 5) return "Hustler";
  return "Starter";
}

export function getNextRank(count: number) {
  if (count < 5) return { name: "Hustler", referralsNeeded: 5 - count };
  if (count < 15) return { name: "Pro", referralsNeeded: 15 - count };
  if (count < 30) return { name: "Elite", referralsNeeded: 30 - count };
  return { name: "Elite", referralsNeeded: 0 };
}

export function calculateWithdrawableEarnings(
  earnings: Array<{ amount_earned?: number | string | null; status?: string | null; created_at?: string | null }>
) {
  const cutoff = getHoldCutoffDate().getTime();
  return earnings.reduce((sum, earning) => {
    const createdAt = earning.created_at ? new Date(earning.created_at).getTime() : 0;
    if (earning.status === "pending" && createdAt <= cutoff) {
      return sum + asMoneyNumber(earning.amount_earned);
    }
    return sum;
  }, 0);
}

export async function sendTelegramNotification(message: string, screenshotUrl?: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = (process.env.TELEGRAM_CHAT_IDS || "").split(",").map(s => s.trim()).filter(Boolean);

  if (!botToken || chatIds.length === 0) {
    console.log("Telegram: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_IDS");
    return;
  }

  for (const chatId of chatIds) {
    try {
      const endpoint = screenshotUrl ? "sendPhoto" : "sendMessage";
      const body = screenshotUrl
        ? { chat_id: chatId, photo: screenshotUrl, caption: message }
        : { chat_id: chatId, text: message };

      const res = await fetch(`https://api.telegram.org/bot${botToken}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      console.log(`Telegram ${endpoint} response for ${chatId}:`, JSON.stringify(data));
    } catch (error) {
      console.log(`Telegram error for ${chatId}:`, error);
    }
  }
}

type TopUpRequestForAffiliate = {
  user_id: string;
  amount_paid?: number | string | null;
  credits_requested?: number | string | null;
};

export async function grantAffiliateCommissions(
  supabase: SupabaseClient,
  request: TopUpRequestForAffiliate,
  paidAmountOverride?: number | string | null
) {
  const amount = asMoneyNumber(paidAmountOverride ?? request.amount_paid);
  if (!request.user_id || amount <= 0) return;

  const { data: buyerData } = await supabase
    .from("user_data")
    .select("referred_by")
    .eq("user_id", request.user_id)
    .single();

  if (!buyerData?.referred_by) return;

  const { data: referrer } = await supabase
    .from("user_data")
    .select("user_id")
    .eq("referral_code", buyerData.referred_by)
    .single();

  if (!referrer || referrer.user_id === request.user_id) return;

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, user_id, rank, total_paid_referrals, status")
    .eq("user_id", referrer.user_id)
    .single();

  if (!affiliate || affiliate.status !== "active" || affiliate.user_id === request.user_id) return;

  let commission = 0;
  let type = "";

  if (Number(request.credits_requested) === 150) {
    const rank = (affiliate.rank || "Starter") as AffiliateRank;
    commission = 250 + (RANK_BONUS[rank] ?? 0);
    type = "flex_sale";

    const newCount = asMoneyNumber(affiliate.total_paid_referrals) + 1;
    await supabase
      .from("affiliates")
      .update({ total_paid_referrals: newCount, rank: getRankForPaidReferrals(newCount) })
      .eq("id", affiliate.id);
  } else {
    commission = Math.round(amount * 0.2);
    type = "topup_direct";
  }

  if (commission > 0) {
    await supabase.from("affiliate_earnings").insert({
      affiliate_id: affiliate.id,
      from_user_id: request.user_id,
      type,
      source_amount: amount,
      amount_earned: commission,
      status: "pending",
    });
  }

  if (type === "flex_sale") return;

  const { data: referrerData } = await supabase
    .from("user_data")
    .select("referred_by")
    .eq("user_id", referrer.user_id)
    .single();

  if (!referrerData?.referred_by) return;

  const { data: grandReferrer } = await supabase
    .from("user_data")
    .select("user_id")
    .eq("referral_code", referrerData.referred_by)
    .single();

  if (!grandReferrer || grandReferrer.user_id === request.user_id || grandReferrer.user_id === referrer.user_id) return;

  const { data: grandAffiliate } = await supabase
    .from("affiliates")
    .select("id, user_id, status")
    .eq("user_id", grandReferrer.user_id)
    .single();

  if (!grandAffiliate || grandAffiliate.status !== "active" || grandAffiliate.user_id === request.user_id) return;

  const level2Commission = Math.round(amount * 0.1);
  if (level2Commission > 0) {
    await supabase.from("affiliate_earnings").insert({
      affiliate_id: grandAffiliate.id,
      from_user_id: request.user_id,
      type: "topup_level2",
      source_amount: amount,
      amount_earned: level2Commission,
      status: "pending",
    });
  }
}
