import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const maxDuration = 120;

const VEO_API_KEY = process.env.GEMINI_IMAGE_API_KEY!;

async function pollOperation(name: string): Promise<{ done: boolean; uri: string | null; error: string | null }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${name}?key=${VEO_API_KEY}`
  );
  if (!res.ok) {
    const text = await res.text();
    return { done: false, uri: null, error: `HTTP ${res.status}: ${text}` };
  }
  const data = await res.json();
  if (!data.done) return { done: false, uri: null, error: null };
  const uri = data.response?.generatedVideos?.[0]?.video?.uri ?? null;
  return { done: true, uri, error: null };
}

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

  const { operationName, clipIndex, sessionTs, angle } = await req.json();
  if (!operationName || clipIndex === undefined) {
    return NextResponse.json({ error: "operationName and clipIndex required" }, { status: 400 });
  }

  // Test mode — return sample video immediately
  if (process.env.TEST_VIDEO_MODE === "true") {
    const testUrls = ["/samples/clip-hook.mp4", "/samples/clip-solution.mp4", "/samples/clip-cta.mp4"];
    return NextResponse.json({ done: true, url: testUrls[clipIndex], error: null });
  }

  if (!operationName || operationName === "undefined" || operationName === "null" || !operationName.includes("/")) {
    return NextResponse.json({ done: true, url: null, error: `Invalid operation name received. Please try generating again.` });
  }

  try {
    const { done, uri, error } = await pollOperation(operationName);

    if (error) return NextResponse.json({ done: false, url: null, error }); // done:false = client retries — correct for transient errors
    if (!done) return NextResponse.json({ done: false, url: null, error: null });
    if (!uri) return NextResponse.json({ done: true, url: null, error: "Veo returned no video URI" });

    const url = await uploadVideoToStorage(uri, user.id, clipIndex, sessionTs);
    if (!url) return NextResponse.json({ done: true, url: null, error: "Upload to storage failed" });

    // Save URL to user_data
    const admin = adminClient();
    const urlField = `video_${clipIndex + 1}_url` as "video_1_url" | "video_2_url" | "video_3_url";
    await admin.from("user_data").update({
      [urlField]: url,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    // Log to media_library
    const CLIP_LABELS = ["Clip 1 — Hook", "Clip 2 — Solution", "Clip 3 — CTA"];
    void admin.from("media_library").insert({
      user_id: user.id,
      type: "video",
      url,
      label: CLIP_LABELS[clipIndex],
      angle: angle || null,
    });

    return NextResponse.json({ done: true, url, error: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ done: false, url: null, error: message });
  }
}
