import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

const TEXT_LIMITS: Record<string, number> = {
  lite: 10,
  flex: 50,
  max: 150,
};

export async function POST(req: NextRequest) {
  const { prompt, systemPrompt, images } = await req.json();

  // --- Rate limit gate ---
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: userData } = await supabase
      .from("user_data")
      .select("plan, text_calls_today, text_calls_reset_at")
      .eq("user_id", user.id)
      .single();

    if (userData) {
      const now = new Date();
      const resetAt = userData.text_calls_reset_at ? new Date(userData.text_calls_reset_at) : null;
      const isExpired = !resetAt || (now.getTime() - resetAt.getTime()) > 12 * 60 * 60 * 1000;

      let callsToday = isExpired ? 0 : (userData.text_calls_today ?? 0);

      if (isExpired) {
        await supabase
          .from("user_data")
          .update({ text_calls_today: 0, text_calls_reset_at: now.toISOString() })
          .eq("user_id", user.id);
      }

      const plan = userData.plan ?? "lite";
      const limit = TEXT_LIMITS[plan] ?? TEXT_LIMITS.lite;

      if (callsToday >= limit) {
        return NextResponse.json({ error: "You've reached your daily limit. Your generations will refresh in 12 hours." }, { status: 429 });
      }

      // Increment after check — fire and forget
      supabase
        .from("user_data")
        .update({ text_calls_today: callsToday + 1 })
        .eq("user_id", user.id)
        .then(() => {});
    }
  }
  // --- End rate limit gate ---

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
