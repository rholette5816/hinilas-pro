import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { package: pkg, referenceNumber, amount, credits } = await req.json();

  await supabase.from("top_up_requests").insert({
    user_id: user.id,
    user_email: user.email,
    package: pkg,
    amount_paid: amount,
    credits_requested: credits,
    reference_number: referenceNumber,
    status: "pending",
  });

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "noreply@hinilas.pro",
      to: process.env.FEEDBACK_EMAIL || "admin@hinilas.pro",
      subject: `New Top-Up Request — ${pkg}`,
      html: `
        <h2>New Top-Up Request</h2>
        <table style="font-family:Arial;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 12px;color:#6B7280">User</td><td style="padding:6px 12px"><strong>${user.email}</strong></td></tr>
          <tr><td style="padding:6px 12px;color:#6B7280">Package</td><td style="padding:6px 12px"><strong>${pkg}</strong></td></tr>
          <tr><td style="padding:6px 12px;color:#6B7280">Amount Paid</td><td style="padding:6px 12px"><strong>₱${amount}</strong></td></tr>
          <tr><td style="padding:6px 12px;color:#6B7280">Credits to Add</td><td style="padding:6px 12px"><strong>${credits} credits</strong></td></tr>
          <tr><td style="padding:6px 12px;color:#6B7280">Reference No.</td><td style="padding:6px 12px"><strong>${referenceNumber}</strong></td></tr>
        </table>
        <p style="margin-top:16px;color:#6B7280;font-size:13px">Credits will be added automatically once the GCash payment is detected.</p>
      `,
    });
  } catch {
    // Email failure doesn't block the request
  }

  return NextResponse.json({ success: true });
}
