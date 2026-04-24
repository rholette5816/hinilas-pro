import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 60;

const CREDIT_COST = 25;

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

  const { prompt, clipIndex } = await req.json();
  if (!prompt || clipIndex === undefined) {
    return NextResponse.json({ error: "prompt and clipIndex are required" }, { status: 400 });
  }

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
    const sessionTs = Date.now();
    let operationName: string;

    if (process.env.TEST_VIDEO_MODE === "true") {
      operationName = `test/clip-${clipIndex + 1}`;
    } else {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_IMAGE_API_KEY! });
      const operation = await ai.models.generateVideos({
        model: "veo-3.0-fast-generate-001",
        prompt,
        config: { aspectRatio: "9:16", numberOfVideos: 1, resolution: "1080p" },
      });
      operationName = (operation as unknown as { name?: string }).name ?? "";
    }

    // Fail fast if Veo didn't return a valid operation name
    if (!operationName || !operationName.includes("/")) {
      return NextResponse.json({ error: "Veo did not return a valid operation name. Try again." }, { status: 500 });
    }

    // Save operation name for this clip slot
    const admin = adminClient();
    const isTestMode = process.env.TEST_VIDEO_MODE === "true";
    const newCredits = isTestMode ? userData.credits_remaining : userData.credits_remaining - CREDIT_COST;

    const { data: existing } = await admin
      .from("user_data")
      .select("video_operation_names, video_session_ts")
      .eq("user_id", user.id)
      .single();

    const existingNames: (string | null)[] = Array.isArray(existing?.video_operation_names)
      ? existing.video_operation_names
      : [null, null, null];
    const existingTs: number[] = Array.isArray(existing?.video_session_ts)
      ? existing.video_session_ts
      : [0, 0, 0];

    existingNames[clipIndex] = operationName;
    existingTs[clipIndex] = sessionTs;

    await admin.from("user_data").update({
      credits_remaining: newCredits,
      video_operation_names: existingNames,
      video_session_ts: existingTs,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    if (!isTestMode) {
      await admin.from("credit_transactions").insert({
        user_id: user.id,
        type: "use",
        amount: -CREDIT_COST,
        description: `Video Clip ${clipIndex + 1} generation — Veo 3 Fast`,
      });
    }

    return NextResponse.json({ operationName, sessionTs, creditsRemaining: newCredits });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Video generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
