import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { isOwnerUser } from "@/lib/admin";
import { deductCreditsAtomic } from "@/lib/credits";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function uploadBase64ToStorage(base64DataUri: string, userId: string, filename: string): Promise<string | null> {
  try {
    const admin = adminClient();
    const [header, data] = base64DataUri.split(",");
    const mimeType = header.match(/:(.*?);/)?.[1] || "image/png";
    const ext = mimeType.split("/")[1] || "png";
    const buffer = Buffer.from(data, "base64");
    const path = `${userId}/content-images/${filename}.${ext}`;
    const { error } = await admin.storage.from("ad-creative").upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
    });
    if (error) return null;
    const { data: { publicUrl } } = admin.storage.from("ad-creative").getPublicUrl(path);
    return publicUrl;
  } catch {
    return null;
  }
}

const ASPECT_RATIO_SIZES: Record<string, "1024x1024" | "1024x1536" | "1536x1024"> = {
  "1:1": "1024x1024",
  "4:5": "1024x1024",
  "9:16": "1024x1536",
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`content-image:${user.id}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const { prompt, aspectRatio = "1:1", postType = "", angle = "" } = await req.json();

  if (typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const ownerMode = isOwnerUser(user);

  if (!ownerMode) {
    const { data: userData } = await supabase
      .from("user_data")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .single();

    if (!userData || userData.credits_remaining < 2) {
      return NextResponse.json({ error: "No credits remaining", code: "NO_CREDITS" }, { status: 402 });
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not configured." }, { status: 500 });

  const size = ASPECT_RATIO_SIZES[aspectRatio] || "1024x1024";

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size,
      n: 1,
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) return NextResponse.json({ error: "No image generated. Try again." }, { status: 500 });

    const imageData = `data:image/png;base64,${b64}`;
    const ts = Date.now();
    const publicUrl = await uploadBase64ToStorage(imageData, user.id, `${ts}-content-post`);

    if (publicUrl) {
      const admin = adminClient();
      void admin.from("media_library").insert({
        user_id: user.id,
        type: "image",
        url: publicUrl,
        label: `Content Post: ${postType}`,
        angle: angle || null,
      });
    }

    if (!ownerMode) {
      const deduction = await deductCreditsAtomic({
        userId: user.id,
        amount: 2,
        description: `Content post image: ${postType}`,
      });
      if (!deduction.ok) {
        return NextResponse.json({ error: "Credit deduction failed", code: deduction.code }, { status: 409 });
      }
      return NextResponse.json({ imageUrl: publicUrl ?? imageData, creditsRemaining: deduction.creditsRemaining });
    }

    return NextResponse.json({ imageUrl: publicUrl ?? imageData });
  } catch (err: unknown) {
    console.error("[content-image] image generation error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
