import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rating, category, message } = await req.json();

  if (!message?.trim() || !rating) {
    return NextResponse.json({ error: "Message and rating are required" }, { status: 400 });
  }

  const admin = adminClient();

  // Check if user already submitted feedback (one-time credit reward)
  const { data: existing } = await admin
    .from("feedbacks")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  const isFirstFeedback = !existing;

  // Save feedback
  const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  await admin.from("feedbacks").insert({
    user_id: user.id,
    user_email: user.email,
    user_name: userName,
    rating,
    category,
    message: message.trim(),
  });

  // Post to community as a system message (4+ stars only)
  if (rating >= 4) {
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
    await admin.from("community_messages").insert({
      user_id: user.id,
      user_name: userName,
      user_avatar: user.user_metadata?.avatar_url || null,
      message: `${stars}\n"${message.trim()}"`,
    });
  }

  // Award 5 credits if first feedback
  if (isFirstFeedback) {
    const { data: userData } = await admin
      .from("user_data")
      .select("credits_remaining, credits_total")
      .eq("user_id", user.id)
      .single();

    if (userData) {
      await admin.from("user_data").update({
        credits_remaining: userData.credits_remaining + 5,
        credits_total: userData.credits_total + 5,
      }).eq("user_id", user.id);

      await admin.from("credit_transactions").insert({
        user_id: user.id,
        type: "grant",
        amount: 5,
        description: "Feedback reward",
      });
    }
  }

  // Send email notification
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Hinilas Feedback <onboarding@resend.dev>",
      to: process.env.FEEDBACK_EMAIL || "kenallego@gmail.com",
      subject: `[Hinilas Feedback] ${category} — ${rating} star${rating !== 1 ? "s" : ""}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #F5A623;">New Feedback — Hinilas Pro</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666; width: 120px;">Rating</td><td style="padding: 8px 0; font-weight: bold;">${"★".repeat(rating)}${"☆".repeat(5 - rating)} (${rating}/5)</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Category</td><td style="padding: 8px 0; font-weight: bold;">${category}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">From</td><td style="padding: 8px 0;">${user.email}</td></tr>
          </table>
          <div style="margin-top: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
            <p style="margin: 0; color: #333; white-space: pre-wrap;">${message}</p>
          </div>
        </div>
      `,
    });
  } catch {
    // Email failure doesn't block feedback
  }

  return NextResponse.json({ success: true, creditsAwarded: isFirstFeedback ? 5 : 0 });
}

export async function GET() {
  const admin = adminClient();
  const { data } = await admin
    .from("feedbacks")
    .select("id, user_name, rating, message, created_at")
    .gte("rating", 4)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({ feedbacks: data || [] });
}
