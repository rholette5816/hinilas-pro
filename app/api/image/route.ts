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
    if (error) {
      console.error("[image-upload] storage error:", error.message, "| path:", path);
      return null;
    }
    const { data: { publicUrl } } = admin.storage.from("ad-creative").getPublicUrl(path);
    return publicUrl;
  } catch (e) {
    console.error("[image-upload] unexpected error:", e);
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
          ? `This is the original ad creative reference. Create Variation 1 - LIFESTYLE / UGC execution in ${ratioLabel} format. Keep the same Filipino Meta Ads brand DNA (typography weight, brand colors, dialect on copy) but flip the framing to lifestyle-first.

DETECT DIALECT from the original ad copy and write all on-image text in that exact dialect.

LAYOUT - vertical poster, 3 zones:

[TOP 15% - condensed headline strip, white background]
- Brand logo: small, top corner.
- ONE bold headline only (no sub-line, no Line 2 stack). 4-7 words, all caps, primary brand color. Pulled from the original ad's hook.

[MIDDLE 70% - dominant lifestyle hero photo]
- Photorealistic candid moment of a real Filipino person actively using, wearing, or experiencing the product.
- Phone-video framing, handheld feel, slight imperfection - NOT a studio shot.
- Natural light, real environment (home, street, kitchen, bedroom, outdoor - whatever fits the angle).
- Authentic emotion - genuine smile, relief, surprise, focus. No posed catalogue stares.
- Subject is the PERSON, product is secondary but visible.
- Skin tones natural, no oversaturation.

[BOTTOM 15% - thin offer ribbon, primary brand color background, white text]
- Single offer block centered (BUY 1 TAKE 1, MURA LANG, FREE SHIPPING, MESSAGE US TODAY - pull from the original ad if present, otherwise default to MESSAGE US TODAY).
- 1-2 small CTA chips on the right (COD, FREE SHIPPING). Skip if not relevant.
- NO benefit bullets in this variation. NO trust badges in this variation. Keep this band clean.

Keep the same brand, product, and subject identity from the original ad. Match the original's color palette and font weight exactly.

NEGATIVE: studio backdrop, posed model, blurry text, distorted face, AI artifacts, cartoon, 3D render, anime, watermark, oversaturated skin, the words "Before" or "After".

Final output: ready-to-upload Facebook Story / Reels ad in ${ratioLabel} format.`
          : `This is the original ad creative reference. Create Variation 2 - PROBLEM/SOLUTION SPLIT execution in ${ratioLabel} format. Keep the same Filipino Meta Ads brand DNA (3-band structure, typography weight, brand colors, dialect on copy) but reframe the middle band as a contrast split.

DETECT DIALECT from the original ad copy and write all on-image text in that exact dialect.

LAYOUT - strict 3-band composition, top to bottom:

[BAND 1 - TOP HEADLINE STRIP, full width, white background, 15% height]
- Brand logo: small, top corner.
- Headline split into TWO halves matching the image split below:
  - LEFT half: pain/problem statement, dark gray or black, medium weight, dialect-matched, 3-5 words.
  - RIGHT half: result/solution statement, BOLD all caps, primary brand color, 3-5 words.

[BAND 2 - MIDDLE PROBLEM/SOLUTION SPLIT, 65% height, vertical divider down the center]
LEFT HALF: dark, moody, raw photorealistic shot. Shows the struggle, frustration, or undesirable situation the target audience faces. Muted tones, heavy shadows, tense body language or visual metaphor for the problem. Same person identity as the original ad.

RIGHT HALF: bright, clean, aspirational photorealistic shot. Shows the outcome, confidence, relief, or success state. Warm or vibrant tones, open natural lighting, positive energy. Same person identity, transformed.

The split line should be clean and subtle - either a thin vertical divider or a natural contrast edge. Both halves are photorealistic.

[BAND 3 - BOTTOM RIBBON, full width, primary brand color background, white text, 20% height]
- Left side: 1-2 trust badges (round seals or shield icons). Pick from FDA APPROVED, AUTHENTIC, HALAL, DOH REGISTERED, BIR REGISTERED, ISO CERTIFIED - only those that fit the industry. Skip badges if none fit.
- Center: bold offer block, oversized text on contrasting plate. Pull offer from original ad if mentioned, otherwise MESSAGE US TODAY.
- Right side: 2-3 small CTA chips (COD CASH ON DELIVERY, FREE SHIPPING, MESSAGE US). Use only ones that fit the angle.

Keep the same brand, product, and subject from the original ad. Match the original's color palette and font weight exactly. Logo placement, badge style, ribbon color must match the original's brand reference.

HARD RULE: do NOT include the words "Before" or "After" anywhere in the image. Let the visual contrast carry the meaning.

NEGATIVE: blurry text, distorted face, extra limbs, watermark, oversaturated skin, horror lighting, cartoon, anime, 3D render, generic stock-photo poses, overlapping text, the words "Before" or "After".

Final output: ready-to-upload Facebook/Instagram feed ad in ${ratioLabel} format.`;
        parts.push({ text: variationText });
      } else {
        parts.push({
          text: `This is the reference ad creative. Recreate the same concept, visual style, color palette, typography, layout, and message - adapted for a ${ratioLabel} format. Keep everything consistent: same headline text, same subject, same mood, same brand elements. Only adjust the composition and spacing to fit the new format.`,
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

    // Insert into media_library
    if (publicUrl) {
      const admin = adminClient();
      const { error: libError } = await admin.from("media_library").insert({
        user_id: user.id,
        type: "image",
        url: publicUrl,
        label,
        angle: angle || null,
      });
      if (libError) console.error("[image-upload] media_library insert error:", libError.message);
    } else {
      console.error("[image-upload] skipping media_library insert — no public URL (storage upload failed)");
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
