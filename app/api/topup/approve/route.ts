import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { sendMetaEvent } from "@/lib/meta-capi";

async function grantReferralReward(supabase: SupabaseClient, userId: string, creditsPurchased: number) {
  const { data: buyer } = await supabase
    .from("user_data")
    .select("referred_by, referral_rewarded")
    .eq("user_id", userId)
    .single();

  if (!buyer?.referred_by || buyer.referral_rewarded) return;

  const { data: referrer } = await supabase
    .from("user_data")
    .select("user_id, credits_remaining, credits_total")
    .eq("referral_code", buyer.referred_by)
    .single();

  if (!referrer) return;

  let reward = 10;
  if (creditsPurchased >= 500) reward = 75;
  else if (creditsPurchased >= 150) reward = 30;

  await supabase.from("user_data").update({
    credits_remaining: referrer.credits_remaining + reward,
    credits_total: referrer.credits_total + reward,
  }).eq("user_id", referrer.user_id);

  await supabase.from("credit_transactions").insert({
    user_id: referrer.user_id,
    type: "referral",
    amount: reward,
    description: `Referral reward — your referral made their first purchase`,
  });

  await supabase.from("user_data").update({ referral_rewarded: true }).eq("user_id", userId);
}

// Uses service role key — bypasses RLS to update any user's credits
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  // Verify secret so only your Google Apps Script can call this
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.TOPUP_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { amount, senderName } = await req.json();
  if (!amount) return NextResponse.json({ error: "Missing amount" }, { status: 400 });

  const supabase = adminClient();

  // Find the most recent pending request matching this amount (within last 24 hours)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: requests } = await supabase
    .from("top_up_requests")
    .select("*")
    .eq("status", "pending")
    .eq("amount_paid", amount)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!requests || requests.length === 0) {
    return NextResponse.json({ error: "No matching pending request found" }, { status: 404 });
  }

  const request = requests[0];

  // Mark request as approved
  await supabase
    .from("top_up_requests")
    .update({ status: "approved", approved_at: new Date().toISOString(), sender_name: senderName || null })
    .eq("id", request.id);

  // Fetch current credits
  const { data: userData } = await supabase
    .from("user_data")
    .select("credits_remaining, credits_total")
    .eq("user_id", request.user_id)
    .single();

  if (!userData) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const newCredits = userData.credits_remaining + request.credits_requested;
  const newTotal = userData.credits_total + request.credits_requested;

  // Determine if this purchase locks a tier (Flex 150 or Max 500). Top-ups do not lock tier.
  let lockedTier: "Flex" | "Max" | null = null;
  if (request.credits_requested >= 500) lockedTier = "Max";
  else if (request.credits_requested >= 150) lockedTier = "Flex";

  const tierUpdate = lockedTier
    ? {
        locked_tier: lockedTier,
        tier_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }
    : {};

  // Add credits (and lock tier if applicable)
  await supabase
    .from("user_data")
    .update({
      credits_remaining: newCredits,
      credits_total: newTotal,
      ...tierUpdate,
    })
    .eq("user_id", request.user_id);

  // Log transaction
  await supabase.from("credit_transactions").insert({
    user_id: request.user_id,
    type: "topup",
    amount: request.credits_requested,
    description: `Top-up approved — ${request.package} (₱${amount})`,
  });

  await sendMetaEvent({
    request: req,
    eventName: "Purchase",
    eventId: `purchase-topup-${request.id}`,
    eventSourceUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://hinilas.pro"}/pricing`,
    userData: {
      email: request.user_email,
      externalId: request.user_id,
    },
    customData: {
      currency: "PHP",
      value: Number(amount) || 0,
      content_name: request.package,
      content_category: "Top Up",
    },
  });

  // Referral reward
  await grantReferralReward(supabase, request.user_id, request.credits_requested);

  // Notify user via email
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Hinilas Pro <onboarding@resend.dev>",
      to: request.user_email,
      subject: "Your credits have been added — Hinilas Pro",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0F172A;color:#fff;border-radius:12px">
          <h2 style="color:#1E3A8A;margin-bottom:8px">Credits Added</h2>
          <p style="color:#94A3B8;margin-bottom:24px">Your payment has been verified and your credits are now live.</p>
          <div style="background:#1E293B;border-radius:10px;padding:20px;margin-bottom:24px">
            <div style="font-size:36px;font-weight:900;color:#22c55e;margin-bottom:4px">+${request.credits_requested} credits</div>
            <div style="font-size:13px;color:#64748B">${request.package} — ₱${amount}</div>
          </div>
          <p style="color:#64748B;font-size:13px">Log in to Hinilas Pro to start using your credits.</p>
        </div>
      `,
    });
  } catch {
    // Email failure doesn't block approval
  }

  return NextResponse.json({
    success: true,
    user: request.user_email,
    creditsAdded: request.credits_requested,
    newBalance: newCredits,
  });
}
