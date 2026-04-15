import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const ASPECT_RATIO_LABELS: Record<string, string> = {
  "1:1": "square (1:1 aspect ratio)",
  "9:16": "vertical portrait (9:16 aspect ratio, taller than wide)",
  "1.91:1": "horizontal landscape banner (1.91:1 aspect ratio, wider than tall)",
};

const IMAGEN_ASPECT_RATIOS: Record<string, string> = {
  "1:1": "1:1",
  "9:16": "9:16",
  "1.91:1": "16:9",
};

export async function POST(req: NextRequest) {
  const { prompt, count = 1, aspectRatio = "1:1", referenceImage, isVariation = false, variationIndex = 0 } = await req.json();

  // --- Credit gate ---
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from("user_data")
    .select("credits_remaining")
    .eq("user_id", user.id)
    .single();

  if (!userData || userData.credits_remaining < 3) {
    return NextResponse.json(
      { error: "No credits remaining", code: "NO_CREDITS" },
      { status: 402 }
    );
  }
  // --- End credit gate ---

  const apiKey = process.env.GEMINI_IMAGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_IMAGE_API_KEY not configured." }, { status: 500 });
  }

  const images: string[] = [];

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    if (!referenceImage) {
      // --- Main generation: use Imagen 3 ---
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const imagenModel = (genAI as any).getImagenModel({ model: "imagen-3.0-generate-001" });
      const imagenAspectRatio = IMAGEN_ASPECT_RATIOS[aspectRatio] || "1:1";

      const result = await imagenModel.generateImages({
        prompt: `${prompt}`,
        numberOfImages: 1,
        aspectRatio: imagenAspectRatio,
        safetyFilterLevel: "block_only_high",
      });

      if (result.images && result.images.length > 0) {
        const imageData = result.images[0].imageData;
        images.push(`data:image/png;base64,${imageData}`);
      }
    } else {
      // --- Variations: use Gemini (supports reference image input) ---
      const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
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
          ? `This is the original ad creative. Create Variation 1 — Story / Reels format (${ratioLabel}). Keep the same brand and product, but reimagine the creative from a human and lifestyle perspective. Show a real person using, wearing, or experiencing the product. Shoot it like a candid moment — natural light, authentic emotion, real environment. The framing should feel like a phone video, not a studio ad. Lead with emotion and human connection, not the product itself. Make the viewer feel something in the first half second.`
          : `This is the original ad creative. Create Variation 2 — Banner Ad format (${ratioLabel}). Keep the same brand and product, but design it as a horizontal billboard-style ad. Use a completely different scene or visual context from the original. Bold, high-contrast composition with the product or brand element anchored on one side and the headline on the other. Think digital billboard — striking, fast-reading, commanding. If the original was warm, go cool. If it was minimal, go dramatic. This should look like a separate campaign concept entirely.`;
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

    // Deduct 3 credits after successful generation
    const newCredits = userData.credits_remaining - 3;
    await supabase
      .from("user_data")
      .update({ credits_remaining: newCredits })
      .eq("user_id", user.id);

    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      type: "use",
      amount: -3,
      description: "Image generation",
    });

    return NextResponse.json({ images, creditsRemaining: newCredits });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Image generation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
