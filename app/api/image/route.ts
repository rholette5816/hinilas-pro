import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { isOwnerUser } from "@/lib/admin";
import { deductCreditsAtomic } from "@/lib/credits";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const maxDuration = 60;

const ASPECT_RATIO_SIZES: Record<string, "1024x1024" | "1024x1536" | "1536x1024"> = {
  "1:1": "1024x1024",
  "9:16": "1024x1536",
  "1.91:1": "1536x1024",
};

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
  const { prompt, aspectRatio = "1:1", referenceImage, logoImage, isVariation = false, variationIndex = 0, angle = "" } = await req.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getRequestIp(req);
  const rateLimit = checkRateLimit(`image:${user.id}:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) },
      }
    );
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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured." }, { status: 500 });
  }

  const size = ASPECT_RATIO_SIZES[aspectRatio] || "1024x1024";
  const ratioLabel = ASPECT_RATIO_LABELS[aspectRatio] || aspectRatio;

  try {
    const openai = new OpenAI({ apiKey });
    let imageBase64: string | null = null;

    if (!referenceImage && !logoImage) {
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: `${prompt}\n\nGenerate this as a ${ratioLabel} image.`,
        size,
        n: 1,
      });
      imageBase64 = response.data?.[0]?.b64_json ?? null;
    } else if (!referenceImage && logoImage) {
      // Main generation with logo reference — use images.edit so model can see the actual logo
      const [logoHeader, logoB64] = (logoImage as string).split(",");
      const logoMime = logoHeader.match(/:(.*?);/)?.[1] || "image/png";
      const logoBuffer = Buffer.from(logoB64, "base64");
      const { toFile } = await import("openai");
      const logoFile = await toFile(logoBuffer, "logo.png", { type: logoMime });
      const response = await openai.images.edit({
        model: "gpt-image-1",
        image: logoFile,
        prompt: `${prompt}\n\nIMPORTANT: The uploaded image is the brand logo. Study its exact colors, font style, and graphic elements. Place this logo accurately in the top corner of the ad. Apply the logo's exact brand colors throughout the design. Generate the full ad as a ${ratioLabel} image.`,
        size,
        n: 1,
      });
      imageBase64 = response.data?.[0]?.b64_json ?? null;
    } else {
      let refBuffer: Buffer;
      let refMime = "image/png";

      if ((referenceImage as string).startsWith("data:")) {
        const [header, b64] = (referenceImage as string).split(",");
        refMime = header.match(/:(.*?);/)?.[1] || "image/png";
        refBuffer = Buffer.from(b64, "base64");
      } else {
        const fetchRes = await fetch(referenceImage as string);
        refBuffer = Buffer.from(await fetchRes.arrayBuffer());
        refMime = fetchRes.headers.get("content-type") || "image/png";
      }

      const { toFile } = await import("openai");
      const imageFile = await toFile(refBuffer, "reference.png", { type: refMime });

      let editPrompt: string;
      if (isVariation) {
        editPrompt = variationIndex === 0
          ? `This is the original ad creative reference. Create Variation 1 - LIFESTYLE / UGC execution in ${ratioLabel} format. Keep the same Filipino Meta Ads brand DNA (typography weight, brand colors, dialect on copy) but flip the framing to lifestyle-first.

PHOTOGRAPHY STANDARD:
- Handheld feel, shot on iPhone 15 Pro or similar — natural imperfection, not staged
- Real ambient light: window light, outdoor sun, warm indoor lamp — no studio strobes
- Shallow depth of field, subject sharp, background softly blurred
- Authentic Filipino skin tones, warm and properly exposed, zero oversaturation
- Natural micro-expressions: real smile, relief, satisfaction — not catalogue stare
- Zero AI artifacts: correct finger count, natural face, no floating objects, no plastic skin

DETECT DIALECT from the original ad copy and write all on-image text in that exact dialect.

LAYOUT - vertical poster, 3 zones:

[TOP 15% - condensed headline strip, white background]
- Brand logo: small, top corner
- ONE bold headline only (4-7 words, all caps, primary brand color). Pulled from the original ad's hook.

[MIDDLE 70% - dominant lifestyle hero photo]
- Real Filipino person actively using, wearing, or experiencing the product in a genuine moment
- Natural environment that matches the product: home, street, kitchen, bedroom, outdoor
- Person is the hero, product is visible but secondary
- Candid energy — feels recorded, not directed

[BOTTOM 15% - thin offer ribbon, primary brand color, white text]
- Single centered offer (pull from original ad if present, default to MESSAGE US TODAY)
- 1-2 CTA chips on the right (COD, FREE SHIPPING). Skip if not relevant.
- No benefit bullets. No trust badges. Keep this band clean and simple.

Match the original's color palette, font weight, and brand elements exactly.

REJECT IF: studio backdrop, posed catalogue model, blurry text, distorted face, extra fingers, plastic skin, cartoon, 3D render, anime, watermark, the words "Before" or "After".

Final output: production-ready Facebook Story / Reels ad in ${ratioLabel} format.`
          : `This is the original ad creative reference. Create Variation 2 - PROBLEM/SOLUTION SPLIT execution in ${ratioLabel} format. Keep the same Filipino Meta Ads brand DNA (3-band structure, typography weight, brand colors, dialect on copy) but reframe the middle band as a visual contrast split.

PHOTOGRAPHY STANDARD:
- Both halves shot at professional commercial quality — Sony A7R V or Canon EOS R5
- LEFT half: dramatic moody lighting — single side key light, deep shadows, desaturated tones
- RIGHT half: bright 3-point studio lighting — soft key, fill, rim light for separation
- Tack-sharp focus on subject both sides, shallow depth of field on backgrounds
- Catchlights in eyes on the RIGHT (bright) side
- Natural Filipino skin tones throughout — no oversaturation, no plastic retouching
- Zero AI artifacts on both sides: correct hands, natural face, no morphing

DETECT DIALECT from the original ad copy and write all on-image text in that exact dialect.

LAYOUT - strict 3-band composition, top to bottom:

[BAND 1 - TOP HEADLINE STRIP, full width, white background, 15% height]
- Brand logo: small, top corner
- Headline split to match the visual below:
  - LEFT half: pain/problem, dark gray, medium weight, 3-5 words in detected dialect
  - RIGHT half: result/solution, BOLD ALL CAPS, primary brand color, 3-5 words

[BAND 2 - MIDDLE SPLIT, 65% height, clean vertical divider]
LEFT HALF: dark, raw, photorealistic — shows the struggle or undesirable state. Muted tones, heavy shadows, tense or defeated body language. Same person identity as original ad.
RIGHT HALF: bright, clean, aspirational photorealistic — shows the outcome, confidence, or success state. Warm vibrant tones, open lighting, positive energy. Same person identity, transformed.

[BAND 3 - BOTTOM RIBBON, full width, primary brand color, white text, 20% height]
- Left: 1-2 trust badges matching original ad's industry (round seal or shield style)
- Center: oversized bold offer text on contrasting dark plate. Pull from original or use MESSAGE US TODAY.
- Right: 2-3 CTA chips matching original ad

Match original's color palette, font weight, logo placement, and brand identity exactly.

HARD RULE: do NOT write "Before" or "After" anywhere. Let the visual contrast carry the meaning.

REJECT IF: blurry text, distorted face, extra fingers, plastic skin, flat lighting, cartoon, anime, 3D render, watermark, the words "Before" or "After".

Final output: production-ready Facebook/Instagram feed ad in ${ratioLabel} format.`;
      } else {
        editPrompt = `This is the reference ad creative. Recreate the same ad at production-ready quality adapted for ${ratioLabel} format.

Keep everything identical: same headline text, same dialect, same subject and person, same brand colors, same typography weight, same mood, same product, same layout structure. Only adjust composition and spacing to fit the new format — wider or taller as needed.

QUALITY STANDARD: commercial advertising photography quality. Sharp text, natural Filipino skin tones, professional lighting, zero AI artifacts (correct fingers, natural face, no floating elements, no plastic skin). Every text element legible at thumbnail size.

REJECT IF: blurry text, changed headline, different subject, color drift, distorted face, extra fingers, cartoon or illustrated style.

Final output: production-ready ${ratioLabel} format ad. Premium quality. No revisions needed.`;
      }

      const response = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt: editPrompt,
        size,
        n: 1,
      });
      imageBase64 = response.data?.[0]?.b64_json ?? null;
    }

    if (!imageBase64) {
      return NextResponse.json({ error: "No image was generated. Try again." }, { status: 500 });
    }

    const imageDataUri = `data:image/png;base64,${imageBase64}`;

    const ts = Date.now();
    const label = !referenceImage
      ? "Main Ad"
      : isVariation
        ? `Variation ${variationIndex + 1}`
        : "Resized";
    const slugLabel = label.toLowerCase().replace(/\s/g, "-");
    const publicUrl = await uploadBase64ToStorage(imageDataUri, user.id, `${ts}-${slugLabel}`);

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

      return NextResponse.json({ images: [publicUrl ?? imageDataUri], creditsRemaining: deduction.creditsRemaining });
    }

    return NextResponse.json({ images: [publicUrl ?? imageDataUri], creditsRemaining: userData?.credits_remaining ?? 0 });
  } catch (err: unknown) {
    console.error("[image] generation error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
