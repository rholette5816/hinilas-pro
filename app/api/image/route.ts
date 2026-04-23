import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { isOwnerUser } from "@/lib/admin";
import { deductCreditsAtomic } from "@/lib/credits";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const maxDuration = 60;

const ASPECT_RATIO_LABELS: Record<string, string> = {
  "1:1": "square (1:1 aspect ratio)",
  "9:16": "vertical portrait (9:16 aspect ratio, taller than wide)",
  "1.91:1": "horizontal landscape banner (1.91:1 aspect ratio, wider than tall)",
};

async function uploadBase64ToStorage(
  base64DataUri: string,
  userId: string,
  filename: string
): Promise<string | null> {
  try {
    const admin = adminClient();
    const [header, data] = base64DataUri.split(",");
    const mimeType = header.match(/:(.*?);/)?.[1] || "image/png";
    const ext = mimeType.split("/")[1] || "png";
    const buffer = Buffer.from(data, "base64");
    const path = `${userId}/images/${filename}.${ext}`;
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
  const { prompt, aspectRatio = "1:1", referenceImage, isVariation = false, variationIndex = 0, angle = "" } = await req.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerMode = isOwnerUser(user);

  const { data: userData } = await supabase
    .from("user_data")
    .select("credits_remaining")
    .eq("user_id", user.id)
    .single();

  if (!ownerMode && (!userData || userData.credits_remaining < 2)) {
    return NextResponse.json(
      { error: "No credits remaining", code: "NO_CREDITS" },
      { status: 402 }
    );
  }

  const apiKey = process.env.GEMINI_IMAGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_IMAGE_API_KEY not configured." }, { status: 500 });
  }

  const images: string[] = [];

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    if (!referenceImage) {
      const geminiMain = new GoogleGenerativeAI(apiKey);
      const mainModel = geminiMain.getGenerativeModel({ model: "gemini-2.5-flash-image" });
      const ratioLabelMain = ASPECT_RATIO_LABELS[aspectRatio] || aspectRatio;

      const result = await mainModel.generateContent({
        contents: [{ role: "user", parts: [{ text: `${prompt}\n\nGenerate this as a ${ratioLabelMain} image.` }] }],
        generationConfig: {
          // @ts-expect-error responseModalities is valid but not yet in type definitions
          responseModalities: ["IMAGE", "TEXT"],
        },
      });

      const responseParts = result.response.candidates?.[0]?.content?.parts ?? [];
      for (const part of responseParts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || "image/png";
          images.push(`data:${mime};base64,${part.inlineData.data}`);
          break;
        }
      }
    } else {
      const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });
      const ratioLabel = ASPECT_RATIO_LABELS[aspectRatio] || aspectRatio;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = [];

      let mimeType = "image/png";
      let data: string;

      if ((referenceImage as string).startsWith("data:")) {
        const [header, b64] = (referenceImage as string).split(",");
        mimeType = header.match(/:(.*?);/)?.[1] || "image/png";
        data = b64;
      } else {
        const fetchRes = await fetch(referenceImage as string);
        const buffer = await fetchRes.arrayBuffer();
        mimeType = fetchRes.headers.get("content-type") || "image/png";
        data = Buffer.from(buffer).toString("base64");
      }

      parts.push({ inlineData: { mimeType, data } });

      if (isVariation) {
        const variationText = variationIndex === 0
          ? `This is the original ad creative. Create Variation 1 — Story / Reels format (${ratioLabel}). Keep the same brand and product, but reimagine the creative from a human and lifestyle perspective. Show a real person using, wearing, or experiencing the product. Shoot it like a candid moment — natural light, authentic emotion, real environment. The framing should feel like a phone video, not a studio ad. Lead with emotion and human connection, not the product itself. Make the viewer feel something in the first half second. Include the headline text from the original ad but adapt it for vertical format — position it at the top or bottom full width, larger and bolder, suited for a Stories viewer. All colors and fonts follow the brand reference from the original.`
          : `This is the original ad creative. Create Variation 2 — Split format (${ratioLabel}). Divide the image into two halves with a clean subtle split line or natural contrast. LEFT HALF — dark, moody, raw — show the struggle, frustration, or undesirable situation the target audience relates to, muted tones, heavy shadows, tense body language or visual metaphor for the problem. RIGHT HALF — bright, clean, aspirational — show the outcome, confidence, relief, success, or the desirable end state, warm or vibrant tones, open lighting, positive energy. Do not include the words "Before" or "After" anywhere in the image. HEADLINE: left side shows pain/problem statement in dark tone medium weight, right side shows result/solution statement in primary brand color bold, both pulled from the original ad's angle and message, all colors and fonts follow the brand reference from the original. Keep the same brand, product, and subject from the original. Logo centered at the bottom or bottom right, medium size with subtle glow. Final output must look like a ready-to-run Facebook link ad.`;
        parts.push({ text: variationText });
      } else {
        parts.push({
          text: `This is the reference ad creative. Recreate the same concept, visual style, color palette, typography, layout, and message — adapted for a ${ratioLabel} format. Keep everything consistent: same headline text, same subject, same mood, same brand elements. Only adjust the composition and spacing to fit the new format.`,
        });
      }

      const result = await geminiModel.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig: {
          // @ts-expect-error responseModalities is valid but not yet in type definitions
          responseModalities: ["IMAGE", "TEXT"],
        },
      });

      const responseParts = result.response.candidates?.[0]?.content?.parts ?? [];
      for (const part of responseParts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || "image/png";
          images.push(`data:${mime};base64,${part.inlineData.data}`);
          break;
        }
      }
    }

    if (images.length === 0) {
      return NextResponse.json({ error: "No image was generated. Try again." }, { status: 500 });
    }

    // Upload to storage with timestamped path
    const ts = Date.now();
    const label = !referenceImage
      ? "Main Ad"
      : isVariation
        ? `Variation ${variationIndex + 1}`
        : "Resized";
    const slugLabel = label.toLowerCase().replace(/\s/g, "-");
    const publicUrl = await uploadBase64ToStorage(images[0], user.id, `${ts}-${slugLabel}`);

    // Insert into media_library (fire and forget — don't block response)
    if (publicUrl) {
      const admin = adminClient();
      void admin.from("media_library").insert({
        user_id: user.id,
        type: "image",
        url: publicUrl,
        label,
        angle: angle || null,
      });
    }

    try {
      const admin = adminClient();
      void admin.from("token_logs").insert({
        user_id: user.id,
        module: "creative",
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      });
    } catch {
      // ignore
    }

    if (!ownerMode) {
      const deduction = await deductCreditsAtomic({
        userId: user.id,
        amount: 2,
        description: "Image generation",
      });

      if (!deduction.ok) {
        if (deduction.code === "NO_CREDITS") {
          return NextResponse.json({ error: "No credits remaining", code: "NO_CREDITS" }, { status: 402 });
        }
        return NextResponse.json({ error: "Credit update failed", code: deduction.code }, { status: 409 });
      }

      // Return public URL (falls back to base64 if upload failed)
      return NextResponse.json({ images: [publicUrl ?? images[0]], creditsRemaining: deduction.creditsRemaining });
    }

    return NextResponse.json({ images: [publicUrl ?? images[0]], creditsRemaining: userData?.credits_remaining ?? 0 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Image generation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
