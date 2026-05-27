import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { sendMetaEvent } from "@/lib/meta-capi";
import { grantAffiliateCommissions } from "@/lib/affiliate";
import { logAdminAction } from "@/lib/audit-log";
import { verifyApprovalToken } from "@/lib/approval-token";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";


async function grantReferralReward(supabase: SupabaseClient, userId: string, creditsPurchased: number) {
  // Check if this user was referred and reward hasn't been granted yet
  const { data: buyer } = await supabase
    .from("user_data")
    .select("referred_by, referral_rewarded")
    .eq("user_id", userId)
    .single();

  if (!buyer?.referred_by || buyer.referral_rewarded) return;

  const { data: rewardResult } = await supabase
    .from("user_data")
    .update({ referral_rewarded: true })
    .eq("user_id", userId)
    .eq("referral_rewarded", false)
    .select("user_id")
    .single();

  if (!rewardResult) return;

  // Find the referrer by their referral_code
  const { data: referrer } = await supabase
    .from("user_data")
    .select("user_id, credits_remaining, credits_total")
    .eq("referral_code", buyer.referred_by)
    .single();

  if (!referrer) return;

  // Determine reward based on credits purchased
  let reward = 10;
  if (creditsPurchased >= 500) reward = 75;
  else if (creditsPurchased >= 150) reward = 30;

  // Grant credits to referrer
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

}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const ip = getRequestIp(req);
  const rl = checkRateLimit(`topup-approve-link:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const id = token ? verifyApprovalToken(token) : null;

  if (!id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = adminClient();

  const { data: request, error: approveError } = await supabase
    .from("top_up_requests")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (approveError) {
    console.error("[topup-approve-link] approval update error:", approveError);
    return new NextResponse("Something went wrong. Please try again.", { status: 500 });
  }

  if (!request) {
    return new NextResponse(`
      <html><body style="font-family:Arial;text-align:center;padding:60px;background:#1C1E21;color:#fff">
        <h2 style="color:#D97706">Already Approved</h2>
        <p style="color:#94A3B8">This top-up request was already approved or could not be found.</p>
      </body></html>
    `, { status: 200, headers: { "Content-Type": "text/html" } });
  }

  // Fetch current credits
  const { data: userData } = await supabase
    .from("user_data")
    .select("credits_remaining, credits_total")
    .eq("user_id", request.user_id)
    .single();

  if (!userData) {
    return new NextResponse("User not found", { status: 404 });
  }

  const newCredits = userData.credits_remaining + request.credits_requested;
  const newTotal = userData.credits_total + request.credits_requested;

  await supabase
    .from("user_data")
    .update({ credits_remaining: newCredits, credits_total: newTotal })
    .eq("user_id", request.user_id);

  await supabase.from("credit_transactions").insert({
    user_id: request.user_id,
    type: "topup",
    amount: request.credits_requested,
    description: `Top-up approved — ${request.package} (₱${request.amount_paid})`,
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
      value: Number(request.amount_paid) || 0,
      content_name: request.package,
      content_category: "Top Up",
    },
  });

  // Referral reward — only fires once per referred user
  await grantReferralReward(supabase, request.user_id, request.credits_requested);

  // Affiliate cash commissions
  await grantAffiliateCommissions(supabase, request, request.amount_paid);

  await logAdminAction({
    adminEmail: "approval-link",
    action: "topup_approved",
    targetId: request.id,
    details: { source: "topup_approve_link" },
  });

  // Notify user via email
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Hinilas Pro <onboarding@resend.dev>",
      to: request.user_email,
      subject: "Your credits have been added — Hinilas Pro",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#1C1E21;color:#fff;border-radius:12px">
          <h2 style="color:#0866FF;margin-bottom:8px">Credits Added</h2>
          <p style="color:#94A3B8;margin-bottom:24px">Your payment has been verified and your credits are now live.</p>
          <div style="background:#1C1E21;border-radius:10px;padding:20px;margin-bottom:24px">
            <div style="font-size:36px;font-weight:900;color:#22c55e;margin-bottom:4px">+${request.credits_requested} credits</div>
            <div style="font-size:13px;color:#64748B">${request.package} — ₱${request.amount_paid}</div>
          </div>
          <p style="color:#64748B;font-size:13px">Log in to Hinilas Pro to start using your credits.</p>
        </div>
      `,
    });
  } catch {
    // Email failure doesn't block approval
  }

  return new NextResponse(`
    <html><body style="font-family:Arial;text-align:center;padding:60px;background:#1C1E21;color:#fff">
      <div style="font-size:48px;margin-bottom:16px">✅</div>
      <h2 style="color:#22c55e">Approved!</h2>
      <p style="color:#94A3B8">${request.user_email} has been given <strong style="color:#fff">${request.credits_requested} credits</strong>.</p>
      <p style="color:#64748B;font-size:13px">New balance: ${newCredits} credits</p>
    </body></html>
  `, { status: 200, headers: { "Content-Type": "text/html" } });
}
