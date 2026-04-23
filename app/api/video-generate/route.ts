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

  const prompt = `You are a video ad director. Based on this marketing angle and business context, create 3 short video ad prompts for Meta Ads.

BUSINESS CONTEXT:
${userContext}

MARKETING ANGLE:
${angle}

INDUSTRY: ${industry || "general"}

RULES — all 3 prompts must be LOCKED TOGETHER:
- Same character (describe once, reuse exactly): gender, age, skin tone, outfit, hair
- Same environment: location, background, props
- Same color palette and lighting style
- Same brand energy and mood
- Different ACTION per clip: clip 1 = problem/hook, clip 2 = product/solution, clip 3 = result/CTA

Output ONLY a JSON array of exactly 3 strings. No explanation. No markdown. Just the JSON.
Each prompt must be self-contained, cinematic, 6-8 seconds, vertical 9:16 format for Reels/Stories.
Each prompt under 500 characters.

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
    model: "veo-2.0-generate-001",
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

    // Step 4 — insert into media_library
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

    // Step 5 — deduct credits and persist URLs to user_data
    const newCredits = userData.credits_remaining - CREDIT_COST;
    const admin = adminClient();
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
