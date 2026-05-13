import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { isOwnerUser } from "@/lib/admin";
import { adminClient, asMoneyNumber, sendTelegramNotification } from "@/lib/affiliate";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerUser(user)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { overrideId } = await req.json();
  if (!overrideId) return NextResponse.json({ error: "Missing overrideId" }, { status: 400 });

  const admin = adminClient();

  const { data: override, error: overrideError } = await admin
    .from("affiliate_overrides")
    .select("*")
    .eq("id", overrideId)
    .single();

  if (overrideError || !override) {
    return NextResponse.json({ error: overrideError?.message || "Override not found" }, { status: 404 });
  }

  if (override.status === "paid") return NextResponse.json({ success: true });

  const { data: affiliate, error: affiliateError } = await admin
    .from("affiliates")
    .select("id, user_id, gcash_name, gcash_number")
    .eq("id", override.affiliate_id)
    .single();

  if (affiliateError || !affiliate) {
    return NextResponse.json({ error: affiliateError?.message || "Affiliate not found" }, { status: 404 });
  }

  const { error: updateError } = await admin
    .from("affiliate_overrides")
    .update({ status: "paid" })
    .eq("id", overrideId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const earningType = override.override_type === "gen2" ? "override_gen2" : "override";

  await admin
    .from("affiliate_earnings")
    .update({ status: "paid" })
    .eq("affiliate_id", affiliate.id)
    .eq("type", earningType)
    .eq("status", "pending")
    .eq("source_amount", override.team_topup_revenue)
    .eq("amount_earned", override.amount_earned);

  const amount = asMoneyNumber(override.amount_earned);
  const { data: affiliateUser } = await admin.auth.admin.getUserById(affiliate.user_id);

  await sendTelegramNotification(
    `${override.override_type === "gen2" ? "Gen 2" : "Gen 1"} override payout marked paid: PHP ${amount.toLocaleString("en-PH")} for ${affiliate.gcash_name} (${affiliate.gcash_number}), month ${override.month}.`
  );

  try {
    if (affiliateUser.user?.email) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Ken from Hinilas Pro <ken@hinilas.pro>",
        to: affiliateUser.user.email,
        subject: "Your Hinilas Pro partner override has been sent",
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1F2937;">
            <p style="font-size:16px;line-height:1.6;">Napadala na ang PHP ${amount.toLocaleString("en-PH")} team override mo sa GCash (${affiliate.gcash_number}). Salamat sa pag-build ng team.</p>
          </div>
        `,
      });
    }
  } catch {
    // Email failure should not roll back override payment.
  }

  return NextResponse.json({ success: true });
}
