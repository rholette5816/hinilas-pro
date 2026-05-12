import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { isOwnerUser } from "@/lib/admin";
import { deductCreditsAtomic } from "@/lib/credits";

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

export async function POST(req: NextRequest) {
  const { prompt, aspectRatio = "1:1", postType = "", angle = "" } = await req.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const apiKey = process.env.GEMINI_IMAGE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_IMAGE_API_KEY not configured." }, { status: 500 });

  const ASPECT_RATIO_LABELS: Record<string, string> = {
    "1:1": "square (1:1 aspect ratio)",
    "4:5": "portrait (4:5 aspect ratio)",
    "9:16": "vertical portrait (9:16 aspect ratio)",
  };
  const ratioLabel = ASPECT_RATIO_LABELS[aspectRatio] || aspectRatio;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: `${prompt}\n\nGenerate this as a ${ratioLabel} image.` }] }],
      generationConfig: {
        // @ts-expect-error responseModalities is valid but not yet in type definitions
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    let imageData: string | null = null;
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || "image/png";
        imageData = `data:${mime};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageData) return NextResponse.json({ error: "No image generated. Try again." }, { status: 500 });

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
    const message = err instanceof Error ? err.message : "Image generation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
