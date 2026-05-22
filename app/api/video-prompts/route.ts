import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { isOwnerUser } from "@/lib/admin";
import { deductCreditsAtomic } from "@/lib/credits";
import { sanitizePrompt } from "@/lib/sanitize";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

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

  const rl = checkRateLimit(`video-prompts:${user.id}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const { angle, userContext, industry } = await req.json();
  if (typeof angle !== "string" || typeof userContext !== "string" || !angle.trim() || !userContext.trim()) {
    return NextResponse.json({ error: "angle and userContext are required" }, { status: 400 });
  }
  if (
    angle.trim().length > 5000 ||
    userContext.trim().length > 5000 ||
    (typeof industry === "string" && industry.trim().length > 5000)
  ) {
    return NextResponse.json({ error: "Prompt input too long." }, { status: 400 });
  }

  const sanitizedAngle = sanitizePrompt(angle);
  const sanitizedUserContext = sanitizePrompt(userContext);
  const sanitizedIndustry = typeof industry === "string" ? sanitizePrompt(industry) : "";

  const ownerMode = isOwnerUser(user);

  if (!ownerMode) {
    const { data: userData } = await supabase
      .from("user_data")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .single();

    if (!userData || userData.credits_remaining < 2) {
      return NextResponse.json({ error: "Not enough credits. You need 2 credits to generate scripts.", code: "NO_CREDITS" }, { status: 402 });
    }
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const prompt = `You are a video ad director and scriptwriter for Meta Ads. Your job is to write 3 short video clip prompts powered by Veo 3, which generates video WITH audio and spoken dialogue.

BUSINESS CONTEXT:
${sanitizedUserContext}

MARKETING ANGLE:
${sanitizedAngle}

INDUSTRY: ${sanitizedIndustry || "general"}

STEP 1 — Detect the dialect/language from the angle above. The dialogue in all 3 clips MUST be written in that exact dialect (Tagalog, Bisaya, Taglish, English, etc). Match the tone and slang of the angle exactly.

STEP 2 — Define a locked character and setting. Be extremely specific. This exact description will be copied into all 3 prompts so Veo renders the same person every clip.
- Character: gender, exact age (e.g. 24 years old), skin tone (e.g. medium morena), face shape, hair color + length + style (e.g. straight black hair shoulder-length), any distinguishing feature (e.g. small mole above lip), outfit color and type (e.g. dusty pink oversized tee)
- Setting: exact location, background details, props, lighting (e.g. small tiled bathroom, white wall, ring light glow, morning)
- Visual style: photorealistic UGC-style, handheld camera, natural lighting (or adapt to the angle's mood)
- Music mood: match the angle's energy (e.g. soft piano building to upbeat)

STEP 3 — Write 3 prompts using this structure:
- Clip 1 (Hook): ONE action + ONE line of dialogue showing the problem or pain point. Must feel relatable. Camera: close-up or reaction shot.
- Clip 2 (Solution): ONE action + ONE line of dialogue showing product/service use or discovery. Camera: product reveal or mid-shot.
- Clip 3 (CTA): ONE action + ONE line of dialogue showing the result or call to action. Camera: confident wide or selfie-style shot.

RULES:
- Copy the FULL character description word-for-word into all 3 prompts — do not summarize or shorten it. Veo needs the exact same description to render the same person.
- Dialogue must feel natural and native to the detected dialect — not translated, not formal
- Dialogue must fill the 8 seconds — write 15-20 words of natural spoken dialogue per clip.
- ONE scene, ONE action, ONE line per clip. No scene transitions. No cuts.
- Include: shot type, character action, spoken dialogue (in detected dialect), background music mood
- Each clip is exactly 8 seconds, vertical 9:16, photorealistic
- Each prompt must be self-contained so Veo 3 can render it independently

Output ONLY a JSON array of exactly 3 strings. No explanation. No markdown. Just the JSON.
Each string under 600 characters.

Example format:
["prompt one here","prompt two here","prompt three here"]`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });
    const text = (completion.choices[0]?.message?.content || "").trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return NextResponse.json({ error: "Could not parse prompts" }, { status: 500 });
    const prompts = JSON.parse(match[0]) as string[];

    const admin = adminClient();
    await admin.from("user_data").update({
      video_prompts: prompts,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    if (!ownerMode) {
      const deduction = await deductCreditsAtomic({
        userId: user.id,
        amount: 2,
        description: "Video script generation (3 clips)",
      });
      if (!deduction.ok) {
        return NextResponse.json({ error: "Credit deduction failed", code: deduction.code }, { status: 409 });
      }
      return NextResponse.json({ prompts, creditsRemaining: deduction.creditsRemaining });
    }

    return NextResponse.json({ prompts });
  } catch (err: unknown) {
    console.error("[video-prompts] OpenAI API error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
