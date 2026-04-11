import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  const { prompt, systemPrompt } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured." }, { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ content: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gemini API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
