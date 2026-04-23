import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 120;

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function uploadVideoToStorage(veoUri: string, userId: string, index: number, sessionTs: number): Promise<string | null> {
  try {
    const response = await fetch(`${veoUri}?key=${process.env.GEMINI_IMAGE_API_KEY}`);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();

    const admin = adminClient();
    const path = `${userId}/videos/${sessionTs}-clip-${index + 1}.mp4`;
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

  const { operationNames, prompts, sessionTs, angle } = await req.json();
  if (!operationNames || !Array.isArray(operationNames)) {
    return NextResponse.json({ error: "operationNames required" }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_IMAGE_API_KEY! });

  // Check each pending operation (null = already resolved by client)
  const results: (string | null | "pending")[] = await Promise.all(
    operationNames.map(async (name: string | null, i: number) => {
      if (!name) return null; // client already has this URL

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const operation = await ai.operations.getVideosOperation({ operation: { name } as any });

        if (!operation.done) return "pending";

        const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!uri) return null; // truly failed — no video produced

        const url = await uploadVideoToStorage(uri, user.id, i, sessionTs);
        return url ?? null;
      } catch {
        return "pending"; // treat errors as still in progress — retry on next poll
      }
    })
  );

  const allDone = results.every(r => r !== "pending");

  // When all clips are resolved, save final URLs to user_data + media_library
  if (allDone) {
    const urls = results as (string | null)[];
    const admin = adminClient();

    await admin.from("user_data").update({
      video_1_url: urls[0] ?? null,
      video_2_url: urls[1] ?? null,
      video_3_url: urls[2] ?? null,
      video_operation_names: null,
      video_session_ts: null,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    const CLIP_LABELS = ["Clip 1 — Hook", "Clip 2 — Solution", "Clip 3 — CTA"];
    const mediaRows = urls
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
  }

  return NextResponse.json({ videos: results, allDone });
}
