import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { rating, category, message, userEmail } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    await resend.emails.send({
      from: "Hinilas Feedback <onboarding@resend.dev>",
      to: process.env.FEEDBACK_EMAIL || "kenallego@gmail.com",
      subject: `[Hinilas Feedback] ${category} — ${rating} star${rating !== 1 ? "s" : ""}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #F5A623;">New Feedback — Hinilas Pro</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 120px;">Rating</td>
              <td style="padding: 8px 0; font-weight: bold;">${"★".repeat(rating)}${"☆".repeat(5 - rating)} (${rating}/5)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Category</td>
              <td style="padding: 8px 0; font-weight: bold;">${category}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">From</td>
              <td style="padding: 8px 0;">${userEmail || "Unknown"}</td>
            </tr>
          </table>
          <div style="margin-top: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
            <p style="margin: 0; color: #333; white-space: pre-wrap;">${message}</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Feedback email error:", err);
    return NextResponse.json({ error: "Failed to send feedback" }, { status: 500 });
  }
}
