import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

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

  // Add credits
  await supabase
    .from("user_data")
    .update({ credits_remaining: newCredits, credits_total: newTotal })
    .eq("user_id", request.user_id);

  // Log transaction
  await supabase.from("credit_transactions").insert({
    user_id: request.user_id,
    type: "topup",
    amount: request.credits_requested,
    description: `Top-up approved — ${request.package} (₱${amount})`,
  });

  // Notify user via email
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "noreply@hinilas.pro",
      to: request.user_email,
      subject: "Your credits have been added — Hinilas Pro",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0F172A;color:#fff;border-radius:12px">
          <h2 style="color:#2B7EC9;margin-bottom:8px">Credits Added</h2>
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
