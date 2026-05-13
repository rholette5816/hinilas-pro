import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { isOwnerUser } from "@/lib/admin";
import { adminClient, getHoldCutoffDate } from "@/lib/affiliate";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerUser(user)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { payoutId } = await req.json();
  if (!payoutId) return NextResponse.json({ error: "Missing payoutId" }, { status: 400 });

  const admin = adminClient();

  const { data: payout, error: payoutError } = await admin
    .from("affiliate_payouts")
    .select("*")
    .eq("id", payoutId)
    .single();

  if (payoutError || !payout) {
    return NextResponse.json({ error: payoutError?.message || "Payout not found" }, { status: 404 });
  }

  if (payout.status === "paid") return NextResponse.json({ success: true });

  const paidAt = new Date().toISOString();
  const cutoff = getHoldCutoffDate().toISOString();

  const { error: updateError } = await admin
    .from("affiliate_payouts")
    .update({ status: "paid", paid_at: paidAt })
    .eq("id", payoutId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await admin
    .from("affiliate_earnings")
    .update({ status: "paid" })
    .eq("affiliate_id", payout.affiliate_id)
    .eq("status", "pending")
    .lte("created_at", cutoff);

  try {
    const { data: affiliateUser } = await admin.auth.admin.getUserById(payout.user_id);
    if (affiliateUser.user?.email) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Ken from Hinilas Pro <ken@hinilas.pro>",
        to: affiliateUser.user.email,
        subject: "Your Hinilas Pro affiliate payout has been sent",
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
