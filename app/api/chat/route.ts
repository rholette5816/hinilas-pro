import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { prompt, systemPrompt, images, module } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured." }, { status: 500 });
  }

  // Get user for token logging (non-blocking — don't fail if auth fails)
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // ignore
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

    // Log token usage (fire and forget)
    if (module) {
      const usage = result.response.usageMetadata;
      if (usage) {
        const admin = adminClient();
        admin.from("token_logs").insert({
          user_id: userId,
          module,
          prompt_tokens: usage.promptTokenCount ?? 0,
          completion_tokens: usage.candidatesTokenCount ?? 0,
          total_tokens: usage.totalTokenCount ?? 0,
        }).then(() => {}).catch(() => {});
      }
    }

    return NextResponse.json({ content: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gemini API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
