import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  const { prompt, systemPrompt, images } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured." }, { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
    });

    let content: string | Part[];
    if (images && images.length > 0) {
      const parts: Part[] = [{ text: prompt }];
      for (const img of images as string[]) {
        const [header, data] = img.split(",");
        const mimeType = (header.match(/:(.*?);/)?.[1] || "image/png") as "image/png" | "image/jpeg" | "image/webp";
        parts.push({ inlineData: { mimeType, data } });
      }
      content = parts;
    } else {
      content = prompt;
    }

    const result = await model.generateContent(content);
    const text = result.response.text();

    return NextResponse.json({ content: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gemini API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
