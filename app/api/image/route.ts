import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

const ASPECT_RATIO_LABELS: Record<string, string> = {
  "1:1": "square (1:1 aspect ratio)",
  "9:16": "vertical portrait (9:16 aspect ratio, taller than wide)",
  "1.91:1": "horizontal landscape banner (1.91:1 aspect ratio, wider than tall)",
};

export async function POST(req: NextRequest) {
  const { prompt, count = 1, aspectRatio = "1:1", referenceImage } = await req.json();

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

  if (!userData || userData.credits_remaining <= 0) {
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

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

    const ratioLabel = ASPECT_RATIO_LABELS[aspectRatio] || aspectRatio;

    const images: string[] = [];

    for (let i = 0; i < count; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = [];

      if (referenceImage) {
        const [header, data] = (referenceImage as string).split(",");
        const mimeType = header.match(/:(.*?);/)?.[1] || "image/png";
        parts.push({ inlineData: { mimeType, data } });
        parts.push({
          text: `This is the reference ad creative. Recreate the same concept, visual style, color palette, typography, layout, and message — adapted for a ${ratioLabel} format. Keep everything consistent: same headline text, same subject, same mood, same brand elements. Only adjust the composition and spacing to fit the new format.`,
        });
      } else {
        parts.push({ text: `${prompt}\n\nGenerate this as a ${ratioLabel} image.` });
      }

      const result = await model.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig: {
          // @ts-expect-error responseModalities is valid but not yet in type definitions
          responseModalities: ["IMAGE", "TEXT"],
        },
      });

      const responseParts = result.response.candidates?.[0]?.content?.parts ?? [];
      for (const part of responseParts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || "image/png";
          images.push(`data:${mimeType};base64,${part.inlineData.data}`);
          break;
        }
      }
    }

    if (images.length === 0) {
      return NextResponse.json({ error: "No image was generated. Try again." }, { status: 500 });
    }

    // Deduct credit after successful generation
    const newCredits = userData.credits_remaining - 1;
    await supabase
      .from("user_data")
      .update({ credits_remaining: newCredits })
      .eq("user_id", user.id);

    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      type: "use",
      amount: -1,
      description: "Image generation",
    });

    return NextResponse.json({ images, creditsRemaining: newCredits });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Image generation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
