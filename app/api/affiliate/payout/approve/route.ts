import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { isOwnerUser, OWNER_EMAILS } from "@/lib/admin";
import { adminClient, getHoldCutoffDate } from "@/lib/affiliate";
import { logAdminAction } from "@/lib/audit-log";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const rl = checkRateLimit(`affiliate-payout-approve:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerUser(user)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!OWNER_EMAILS.includes((user.email ?? "").toLowerCase())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { payoutId } = await req.json();
  if (!payoutId) return NextResponse.json({ error: "Missing payoutId" }, { status: 400 });

  const admin = adminClient();

  const { data: payout, error: payoutError } = await admin
    .from("affiliate_payouts")
    .select("*")
    .eq("id", payoutId)
    .single();

  if (payoutError || !payout) {
    if (payoutError) console.error("[affiliate-payout-approve] payout lookup error:", payoutError);
    return NextResponse.json({ error: "Payout not found" }, { status: 404 });
  }

  if (payout.status === "paid") return NextResponse.json({ success: true });

  const paidAt = new Date().toISOString();
  const cutoff = getHoldCutoffDate().toISOString();

  const { error: updateError } = await admin
    .from("affiliate_payouts")
    .update({ status: "paid", paid_at: paidAt })
    .eq("id", payoutId);

  if (updateError) {
    console.error("[affiliate-payout-approve] payout update error:", updateError);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  await admin
    .from("affiliate_earnings")
    .update({ status: "paid" })
    .eq("affiliate_id", payout.affiliate_id)
    .eq("status", "pending")
    .lte("created_at", cutoff);

  await admin
    .from("affiliate_overrides")
    .update({ status: "paid" })
    .eq("affiliate_id", payout.affiliate_id)
    .eq("status", "pending")
    .lte("calculated_at", cutoff);

  await logAdminAction({
    adminEmail: user.email ?? "unknown",
    action: "payout_approved",
    targetId: payoutId,
    details: { affiliateId: payout.affiliate_id, amount: payout.amount },
  });

  try {
    const { data: affiliateUser } = await admin.auth.admin.getUserById(payout.user_id);
    if (affiliateUser.user?.email) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Ken from Hinilas Pro <ken@hinilas.pro>",
        to: affiliateUser.user.email,
        subject: "Your Hinilas Pro partner payout has been sent",
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1F2937;">
            <p style="font-size:16px;line-height:1.6;">Napadala na ang ₱${Number(payout.amount).toLocaleString("en-PH")} sa iyong GCash (${payout.gcash_number}). Salamat sa pag-refer!</p>
          </div>
        `,
      });
    }
  } catch {
    // Email failure should not roll back payout approval.
  }

  return NextResponse.json({ success: true });
}
