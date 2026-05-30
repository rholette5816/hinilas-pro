import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { generateApprovalToken } from "@/lib/approval-token";
import { checkRateLimit } from "@/lib/rate-limit";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function sendTelegramNotification(message: string, screenshotUrl?: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = (process.env.TELEGRAM_CHAT_IDS || "").split(",").map(s => s.trim()).filter(Boolean);

  if (!botToken || chatIds.length === 0) {
    console.log("Telegram: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_IDS");
    return;
  }

  for (const chatId of chatIds) {
    try {
      if (screenshotUrl) {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, photo: screenshotUrl, caption: message }),
        });
        const data = await res.json();
        console.log(`Telegram photo response for ${chatId}:`, JSON.stringify(data));
      } else {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: message }),
        });
        const data = await res.json();
        console.log(`Telegram response for ${chatId}:`, JSON.stringify(data));
      }
    } catch (e) {
      console.log(`Telegram error for ${chatId}:`, e);
    }
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`topup:${user.id}`, { limit: 5, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const { package: pkg, referenceNumber, amount, credits, screenshotUrl } = await req.json();

  const admin = adminClient();

  // Insert as already approved
  const { data: insertedRequest } = await admin
    .from("top_up_requests")
    .insert({
      user_id: user.id,
      user_email: user.email,
      package: pkg,
      amount_paid: amount,
      credits_requested: credits,
      reference_number: referenceNumber,
      screenshot_url: screenshotUrl || null,
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  // Grant credits immediately
  const { data: userData } = await admin
    .from("user_data")
    .select("credits_remaining, credits_total")
    .eq("user_id", user.id)
    .single();

  const newCredits = (userData?.credits_remaining || 0) + credits;
  const newTotal = (userData?.credits_total || 0) + credits;

  let lockedTier: "Flex" | "Max" | null = null;
  if (credits >= 500) lockedTier = "Max";
  else if (credits >= 150) lockedTier = "Flex";

  const tierUpdate = lockedTier ? { locked_tier: lockedTier, tier_expires_at: null } : {};

  await admin
    .from("user_data")
    .update({ credits_remaining: newCredits, credits_total: newTotal, ...tierUpdate })
    .eq("user_id", user.id);

  await admin.from("credit_transactions").insert({
    user_id: user.id,
    type: "topup",
    amount: credits,
    description: `Top-up — ${pkg} (₱${amount})`,
  });

  // Notify Ken via Telegram with screenshot to verify
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hinilas.pro";
  const requestId = insertedRequest?.id;
  const approveUrl = requestId
    ? `${baseUrl}/api/topup/approve-link?token=${generateApprovalToken(requestId)}`
    : `${baseUrl}/admin`;

  await sendTelegramNotification(
    `💰 Payment Submitted — Credits Auto-Granted\n\nUser: ${user.email}\nPackage: ${pkg}\nAmount: ₱${amount}\nCredits added: +${credits}\nRef#: ${referenceNumber || "not provided"}${lockedTier ? `\nTier: ${lockedTier}` : ""}\n\nVerify screenshot above. If fake, deduct from admin:\n${baseUrl}/admin`,
    screenshotUrl || undefined
  );

  // Notify user via email
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Hinilas Pro <onboarding@resend.dev>",
      to: user.email || "",
      subject: "Your credits have been added — Hinilas Pro",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#1C1E21;color:#fff;border-radius:12px">
          <h2 style="color:#0866FF;margin-bottom:8px">Credits Added</h2>
          <p style="color:#94A3B8;margin-bottom:24px">Your payment has been received and your credits are now live.</p>
          <div style="background:#111827;border-radius:10px;padding:20px;margin-bottom:24px">
            <div style="font-size:36px;font-weight:900;color:#22c55e;margin-bottom:4px">+${credits} credits</div>
            <div style="font-size:13px;color:#64748B">${pkg} — ₱${amount}</div>
          </div>
          <a href="${baseUrl}" style="display:inline-block;background:#D97706;color:#000;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">Start Using Hinilas Pro</a>
        </div>
      `,
    });
  } catch {
    // Email failure doesn't block
  }

  void approveUrl; // kept for future manual override use

  return NextResponse.json({ success: true, creditsAdded: credits, newBalance: newCredits });
}
