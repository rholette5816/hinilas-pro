import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "No message" }, { status: 400 });
  if (message.length > 4000) return NextResponse.json({ error: "Message too long" }, { status: 400 });

  const ip = getRequestIp(req);
  const rateLimit = checkRateLimit(`improve-feedback:${user.id}:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a moment." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) },
      }
    );
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Improve this user feedback message. Make it clearer, more specific, and easier to understand — but keep the original meaning and tone. Return only the improved text, nothing else.\n\nFeedback: ${message}`;

  const result = await model.generateContent(prompt);
  const improved = result.response.text().trim();

  return NextResponse.json({ improved });
}
