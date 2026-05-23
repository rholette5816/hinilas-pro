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
          ? `You are given the original Filipino Meta Ad creative as reference. Create Variation 1 — same brand, same product, same headline copy, but executed as a LIFESTYLE / CANDID shot.

WHAT TO KEEP IDENTICAL from the reference:
- Brand logo: same logo, same position (top corner), same size
- Brand colors: extract the exact primary color from the reference and use it everywhere
- Headline text: copy the exact words from the reference ad, same dialect
- Product: same product must appear in the image
- Offer ribbon at bottom: same offer text and CTA chips as the reference

WHAT CHANGES — the hero photo style only:
- Replace the studio-shot hero with a candid lifestyle moment
- Shot on iPhone 15 Pro: handheld, natural light, real environment (home, kitchen, bedroom, outdoors — match the product context)
- Real Filipino person using or experiencing the product in a genuine unscripted moment
- Natural ambient lighting — window light, sunlight, warm lamp — no studio strobes
- Authentic expression: real smile, relief, confidence — not a catalogue stare
- Shallow depth of field: subject sharp, background naturally blurred
- Warm Filipino skin tones, properly exposed, zero oversaturation
- Zero AI artifacts: correct fingers, natural face proportions, no floating elements, no plastic skin

LAYOUT — same 3-band structure as original, square 1:1:
- Top band: white background, brand logo + same headline text
- Middle band: the lifestyle hero photo (left 55%) + same 3 benefit bullets (right 45%)
- Bottom band: same primary brand color ribbon, same offer and CTAs

REJECT IF: studio backdrop, posed model, blurry text, distorted face, extra fingers, plastic skin, changed headline, different brand colors, cartoon, anime, 3D render, watermark.

Final output: production-ready 1:1 square Facebook/Instagram feed ad.`
          : `You are given the original Filipino Meta Ad creative as reference. Create Variation 2 — same brand, same product, but executed as a BEFORE / AFTER CONTRAST split.

WHAT TO KEEP IDENTICAL from the reference:
- Brand logo: same logo, same size, placed top-center above the split
- Brand colors: extract the exact primary color from the reference, apply to right half accents and bottom ribbon
- Product: same product must be visible, shown on the RIGHT (after) side
- Offer ribbon at bottom: same offer text and CTA chips as the reference

LAYOUT — square 1:1, 3 bands:

[TOP BAND — 15% height, white background]
- Brand logo centered
- Two short labels flanking the center divider line: LEFT says the problem state (2-3 words, dark gray), RIGHT says the solution/result (2-3 words, bold, primary brand color). In the same dialect as the reference ad.

[MIDDLE BAND — 65% height, vertical split down the center]
LEFT HALF — BEFORE state:
- Dark, muted, desaturated tones. Heavy shadows. Single harsh side light.
- Same Filipino person as the original ad looking frustrated, tired, or showing the problem
- Shot on Canon EOS R5, dramatic 1-light setup, cinematic feel
- No product visible on this side

RIGHT HALF — AFTER state:
- Bright, vibrant, warm tones. 3-point studio lighting: key + fill + rim for separation
- Same Filipino person transformed: confident, glowing, happy, showing the result
- Catchlights visible in eyes. Sharp focus. Premium retouching.
- Product clearly visible, held naturally or shown as the cause of transformation

Clean thin vertical divider line between the two halves. No text overlay in the middle band.

[BOTTOM BAND — 20% height, primary brand color background, white text]
- Same trust badges, offer block, and CTA chips as the reference ad

HARD RULE: do NOT write the words "Before" or "After" anywhere — let the visual contrast tell the story.

REJECT IF: blurry text, distorted face, extra fingers, plastic skin, the words "Before" or "After", changed brand colors, missing logo, cartoon, anime, 3D render, watermark.

Final output: production-ready 1:1 square Facebook/Instagram feed ad.`;
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
