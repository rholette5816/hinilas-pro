import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function sendMessengerNotification(message: string) {
  const pageToken = process.env.FB_PAGE_ACCESS_TOKEN;
  const recipientIds = [
    process.env.FB_ADMIN_USER_ID,
    process.env.FB_ADMIN_USER_ID_2,
  ].filter(Boolean) as string[];

  if (!pageToken || recipientIds.length === 0) {
    console.log("Messenger: missing FB_PAGE_ACCESS_TOKEN or no recipient IDs configured");
    return;
  }

  for (const recipientId of recipientIds) {
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${pageToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: message },
        }),
      });
      const data = await res.json();
      console.log(`Messenger response for ${recipientId}:`, JSON.stringify(data));
    } catch (e) {
      console.log(`Messenger error for ${recipientId}:`, e);
    }
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { package: pkg, referenceNumber, amount, credits, screenshotUrl } = await req.json();

  const { data: insertedRequest } = await adminClient()
    .from("top_up_requests")
    .insert({
      user_id: user.id,
      user_email: user.email,
      package: pkg,
      amount_paid: amount,
      credits_requested: credits,
      reference_number: referenceNumber,
      screenshot_url: screenshotUrl || null,
      status: "pending",
    })
    .select("id")
    .single();

  const requestId = insertedRequest?.id;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hinilas-pro.vercel.app";
  const approveUrl = `${baseUrl}/api/topup/approve-link?id=${requestId}&secret=${process.env.TOPUP_WEBHOOK_SECRET}`;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Hinilas Pro <onboarding@resend.dev>",
      to: process.env.FEEDBACK_EMAIL || "admin@hinilas.pro",
      subject: `New Top-Up Request — ${pkg}`,
      html: `
        <h2>New Top-Up Request</h2>
        <table style="font-family:Arial;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 12px;color:#6B7280">User</td><td style="padding:6px 12px"><strong>${user.email}</strong></td></tr>
          <tr><td style="padding:6px 12px;color:#6B7280">Package</td><td style="padding:6px 12px"><strong>${pkg}</strong></td></tr>
          <tr><td style="padding:6px 12px;color:#6B7280">Amount Paid</td><td style="padding:6px 12px"><strong>₱${amount}</strong></td></tr>
          <tr><td style="padding:6px 12px;color:#6B7280">Credits to Add</td><td style="padding:6px 12px"><strong>${credits} credits</strong></td></tr>
        </table>
        ${screenshotUrl ? `<p style="margin-top:16px;color:#6B7280;font-size:13px;margin-bottom:8px">Payment Screenshot:</p><img src="${screenshotUrl}" alt="Payment Screenshot" style="max-width:400px;border-radius:8px;border:1px solid #374151" />` : ""}
        <p style="margin-top:20px"><a href="${approveUrl}" style="background:#22c55e;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">Approve Credits</a></p>
      `,
    });
  } catch {
    // Email failure doesn't block the request
  }

  // Messenger notification
  await sendMessengerNotification(
    `💰 New Top-Up Request\n\nUser: ${user.email}\nPackage: ${pkg}\nAmount: ₱${amount}\nCredits: ${credits}\n\nApprove here:\n${approveUrl}`
  );

  return NextResponse.json({ success: true });
}
