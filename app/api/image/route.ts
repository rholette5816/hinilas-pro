import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prompt, count = 1, aspectRatio = "1:1" } = await req.json();

  const apiKey = process.env.GEMINI_IMAGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_IMAGE_API_KEY not configured." }, { status: 500 });
  }

  try {
    const images: string[] = [];

    for (let i = 0; i < count; i++) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio,
              safetyFilterLevel: "block_only_high",
              personGeneration: "allow_adult",
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errMsg = data.error?.message || "Imagen API error";
        return NextResponse.json({ error: errMsg }, { status: 500 });
      }

      const b64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (b64) {
        images.push(`data:image/png;base64,${b64}`);
      }
    }

    return NextResponse.json({ images });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Image generation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
