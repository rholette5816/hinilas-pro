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

  const { operationNames, prompts, sessionTs, angle } = await req.json();
  if (!operationNames || !Array.isArray(operationNames)) {
    return NextResponse.json({ error: "operationNames required" }, { status: 400 });
  }

  // Test mode — immediately return sample videos without hitting Veo
  if (process.env.TEST_VIDEO_MODE === "true") {
    const testUrls = ["/samples/clip-hook.mp4", "/samples/clip-solution.mp4", "/samples/clip-cta.mp4"];
    return NextResponse.json({ videos: testUrls, allDone: true, errors: [] });
  }

  const errors: string[] = [];
  const results: (string | null | "pending")[] = await Promise.all(
    operationNames.map(async (name: string | null, i: number) => {
      if (!name) return null; // client already has this URL

      // Invalid operation name — fail fast
      if (name === "undefined" || name === "null" || !name.includes("/")) {
        errors.push(`Clip ${i + 1}: invalid operation name "${name}"`);
        return null;
      }

      try {
        const { done, uri, error } = await pollOperation(name);

        if (error) {
          errors.push(`Clip ${i + 1}: ${error}`);
          return "pending";
        }
        if (!done) return "pending";
        if (!uri) return null;

        const url = await uploadVideoToStorage(uri, user.id, i, sessionTs);
        return url ?? null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Clip ${i + 1}: ${msg}`);
        return "pending";
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

  return NextResponse.json({ videos: results, allDone, errors });
}
