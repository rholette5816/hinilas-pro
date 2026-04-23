import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 60;

const CREDIT_COST = 10;

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function buildVideoPrompts(angle: string, userContext: string, industry: string): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are a video ad director and scriptwriter for Meta Ads. Your job is to write 3 short video clip prompts powered by Veo 3, which generates video WITH audio and spoken dialogue.

BUSINESS CONTEXT:
${userContext}

MARKETING ANGLE:
${angle}

INDUSTRY: ${industry || "general"}

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
- Dialogue must be SHORT — maximum 8-10 words spoken. Veo 3 Fast generates exactly 8 seconds. No long sentences.
- ONE scene, ONE action, ONE line per clip. No scene transitions. No cuts.
- Include: shot type, character action, spoken dialogue (in detected dialect), background music mood
- Each clip is exactly 8 seconds, vertical 9:16, photorealistic
- Each prompt must be self-contained so Veo 3 can render it independently

Output ONLY a JSON array of exactly 3 strings. No explanation. No markdown. Just the JSON.
Each string under 600 characters.

Example format:
["prompt one here","prompt two here","prompt three here"]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Could not parse video prompts");
  return JSON.parse(match[0]) as string[];
}

async function generateVideo(prompt: string): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_IMAGE_API_KEY! });

  let operation = await ai.models.generateVideos({
    model: "veo-3.0-fast-generate-001",
    prompt,
    config: {
      aspectRatio: "9:16",
      numberOfVideos: 1,
    },
  });

  // Poll until done (max 55s)
  const deadline = Date.now() + 55000;
  while (!operation.done) {
    if (Date.now() > deadline) throw new Error("Video generation timed out");
    await new Promise(r => setTimeout(r, 5000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const video = operation.response?.generatedVideos?.[0];
  if (!video?.video?.uri) return null;
  return video.video.uri;
}

async function uploadVideoToStorage(veoUri: string, userId: string, index: number): Promise<string | null> {
  try {
    // Download from Google (requires API key)
    const response = await fetch(`${veoUri}?key=${process.env.GEMINI_IMAGE_API_KEY}`);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();

    const admin = adminClient();
    const ts = Date.now();
    const path = `${userId}/videos/${ts}-clip-${index + 1}.mp4`;
    const { error } = await admin.storage.from("ad-creative").upload(path, buffer, {
      contentType: "video/mp4",
      upsert: true,
    });
    if (error) return null;

    const { data: { publicUrl } } = admin.storage.from("ad-creative").getPublicUrl(path);
    return publicUrl;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { angle, userContext, industry } = await req.json();
  if (!angle || !userContext) return NextResponse.json({ error: "angle and userContext are required" }, { status: 400 });

  // Credit check
  const { data: userData } = await supabase
    .from("user_data")
    .select("credits_remaining")
    .eq("user_id", user.id)
    .single();

  if (!userData || userData.credits_remaining < CREDIT_COST) {
    return NextResponse.json({ error: "No credits remaining", code: "NO_CREDITS" }, { status: 402 });
  }

  try {
    // Step 1 — generate 3 locked prompts
    const prompts = await buildVideoPrompts(angle, userContext, industry || "");

    // Step 2 — generate videos in parallel (returns Veo URIs)
    const veoUris = await Promise.all(prompts.map(p => generateVideo(p).catch(() => null)));

    // Step 3 — upload each to Supabase Storage
    const storedUrls = await Promise.all(
      veoUris.map((uri, i) => uri ? uploadVideoToStorage(uri, user.id, i) : Promise.resolve(null))
    );

    const admin = adminClient();
    const newCredits = userData.credits_remaining - CREDIT_COST;

    // Insert into media_library
    const CLIP_LABELS = ["Clip 1 — Hook", "Clip 2 — Solution", "Clip 3 — CTA"];
    const mediaRows = storedUrls
      .map((url, i) => url ? {
        user_id: user.id,
        type: "video",
        url,
        label: CLIP_LABELS[i],
        angle: angle || null,
      } : null)
      .filter(Boolean);
    if (mediaRows.length > 0) {
      void admin.from("media_library").insert(mediaRows);
    }
    await admin.from("user_data").update({
      credits_remaining: newCredits,
      video_1_url: storedUrls[0] ?? null,
      video_2_url: storedUrls[1] ?? null,
      video_3_url: storedUrls[2] ?? null,
      video_prompts: prompts,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    await admin.from("credit_transactions").insert({
      user_id: user.id,
      type: "use",
      amount: -CREDIT_COST,
      description: "Video ad generation — 3 clips via Veo",
    });

    return NextResponse.json({
      prompts,
      videos: storedUrls,
      creditsRemaining: newCredits,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Video generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
