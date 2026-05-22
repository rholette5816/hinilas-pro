import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { generateApprovalToken } from "@/lib/approval-token";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function aiScreenCheck(base64: string, mimeType: string): Promise<{ pass: boolean; reason: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { pass: true, reason: "skipped" };

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          {
            type: "text",
            text: `You are reviewing a screenshot submitted by a user claiming to have launched a Facebook/Meta Ads campaign.

Check if this screenshot shows a real, active Meta Ads Manager campaign. Look for:
- A table or list of campaigns, ad sets, or ads
- Status indicators (Active, Learning, etc.)
- Meta Ads Manager UI elements (columns like Budget, Results, Reach, Impressions, etc.)
- Facebook/Meta branding or interface

Reply ONLY with a JSON object like this:
{"pass": true, "reason": "Shows active campaign in Ads Manager"}
or
{"pass": false, "reason": "Screenshot does not show a Meta Ads Manager campaign"}

Be strict. Reject blurry, cropped, edited, or unrelated screenshots.`,
          },
        ],
      }],
    });

    const text = (completion.choices[0]?.message?.content || "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return { pass: !!parsed.pass, reason: parsed.reason || "" };
    }
    return { pass: false, reason: "Could not verify screenshot" };
  } catch {
    return { pass: true, reason: "AI check skipped" };
  }
}

async function sendTelegramLaunch(
  username: string,
  email: string,
  launchId: string,
  screenshotUrl: string
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = (process.env.TELEGRAM_CHAT_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hinilas.pro";

  if (!botToken || chatIds.length === 0) return;

  const token = generateApprovalToken(launchId);
  const approveUrl = `${baseUrl}/api/launch/approve?action=approve&token=${token}`;
  const rejectUrl = `${baseUrl}/api/launch/approve?action=reject&token=${token}`;

  const caption = `🚀 New Campaign Launch Submission\n\nUser: ${username}\nEmail: ${email}\n\n✅ Approve (+20 credits): ${approveUrl}\n❌ Reject: ${rejectUrl}`;

  for (const chatId of chatIds) {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, photo: screenshotUrl, caption }),
      });
    } catch {
      // silent
    }
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`launch-submit:${user.id}`, { limit: 5, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const { data: userData } = await supabase
    .from("user_data")
    .select("username")
    .eq("user_id", user.id)
    .single();

  const username = userData?.username || user.email?.split("@")[0] || "User";

  const formData = await req.formData();
  const file = formData.get("screenshot") as File | null;
  if (!file) return NextResponse.json({ error: "No screenshot provided" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = file.type || "image/png";

  const check = await aiScreenCheck(base64, mimeType);
  if (!check.pass) {
    return NextResponse.json({
      error: "Screenshot not accepted. Make sure it clearly shows your active campaign in Meta Ads Manager.",
      rejected: true,
    }, { status: 422 });
  }

  const filename = `launches/${user.id}/${Date.now()}.${file.name.split(".").pop() || "png"}`;
  const { error: uploadError } = await adminClient()
    .storage
    .from("screenshots")
    .upload(filename, Buffer.from(arrayBuffer), { contentType: mimeType, upsert: false });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  const { data: urlData } = adminClient().storage.from("screenshots").getPublicUrl(filename);
  const screenshotUrl = urlData.publicUrl;

  const { data: launch, error: insertError } = await adminClient()
    .from("campaign_launches")
    .insert({
      user_id: user.id,
      username,
      screenshot_url: screenshotUrl,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !launch) {
    console.error("DB insert error:", insertError);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  await sendTelegramLaunch(username, user.email || "", launch.id, screenshotUrl);

  return NextResponse.json({ success: true });
}
