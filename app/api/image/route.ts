import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const ASPECT_RATIO_LABELS: Record<string, string> = {
  "1:1": "square (1:1 aspect ratio)",
  "9:16": "vertical portrait (9:16 aspect ratio, taller than wide)",
  "1.91:1": "horizontal landscape banner (1.91:1 aspect ratio, wider than tall)",
};

export async function POST(req: NextRequest) {
  const { prompt, count = 1, aspectRatio = "1:1" } = await req.json();

  const apiKey = process.env.GEMINI_IMAGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_IMAGE_API_KEY not configured." }, { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-image-preview" });

    const ratioLabel = ASPECT_RATIO_LABELS[aspectRatio] || aspectRatio;
    const fullPrompt = `${prompt}\n\nGenerate this as a ${ratioLabel} image.`;

    const images: string[] = [];

    for (let i = 0; i < count; i++) {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        generationConfig: {
          // @ts-expect-error responseModalities is valid but not yet in type definitions
          responseModalities: ["IMAGE", "TEXT"],
        },
      });

      const parts = result.response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
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

    return NextResponse.json({ images });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Image generation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
