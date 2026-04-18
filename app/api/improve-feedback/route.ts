import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "No message" }, { status: 400 });

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Improve this user feedback message. Make it clearer, more specific, and easier to understand — but keep the original meaning and tone. Return only the improved text, nothing else.\n\nFeedback: ${message}`;

  const result = await model.generateContent(prompt);
  const improved = result.response.text().trim();

  return NextResponse.json({ improved });
}
