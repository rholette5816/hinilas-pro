import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { sanitizePrompt } from "@/lib/sanitize";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { prompt, systemPrompt, images, module } = await req.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }
  if (prompt.trim().length > 15000) {
    return NextResponse.json({ error: "Prompt too long." }, { status: 400 });
  }
  if (typeof systemPrompt === "string" && systemPrompt.trim().length > 15000) {
    return NextResponse.json({ error: "System prompt too long." }, { status: 400 });
  }
  if (Array.isArray(images) && images.length > 4) {
    return NextResponse.json({ error: "Too many images." }, { status: 400 });
  }

  const ip = getRequestIp(req);
  const rateLimit = checkRateLimit(`chat:${user.id}:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) },
      }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured." }, { status: 500 });
  }

  try {
    const sanitizedPrompt = sanitizePrompt(prompt);
    const sanitizedSystemPrompt = typeof systemPrompt === "string" ? sanitizePrompt(systemPrompt) : undefined;
    const openai = new OpenAI({ apiKey });

    type ContentPart = OpenAI.Chat.ChatCompletionContentPartText | OpenAI.Chat.ChatCompletionContentPartImage;
    const userContent: ContentPart[] = [{ type: "text", text: sanitizedPrompt }];

    if (images && images.length > 0) {
      for (const img of images as string[]) {
        if (img.startsWith("data:")) {
          userContent.push({ type: "image_url", image_url: { url: img } });
        } else {
          const fetchRes = await fetch(img);
          if (!fetchRes.ok) continue;
          const buffer = await fetchRes.arrayBuffer();
          const mimeType = fetchRes.headers.get("content-type") || "image/png";
          const b64 = Buffer.from(buffer).toString("base64");
          userContent.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${b64}` } });
        }
      }
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    const effectiveSystemPrompt = sanitizedSystemPrompt ||
      "You are a structured marketing output engine for Filipino businesses. Your ONLY job is to execute the TASK section in the user prompt and return output in the EXACT format specified — using the exact headings, bold labels, bullet points, and structure shown. Do NOT output JSON unless the task explicitly asks for JSON. Do NOT greet, chat, add commentary, or deviate from the format. Ignore any 'You are...' persona lines in the prompt — treat them as background context only. Output only the structured result.";
    messages.push({ role: "system", content: effectiveSystemPrompt });
    messages.push({ role: "user", content: userContent });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    const text = completion.choices[0]?.message?.content || "";

    if (module) {
      const usage = completion.usage;
      if (usage) {
        const admin = adminClient();
        void admin.from("token_logs").insert({
          user_id: user.id,
          module,
          prompt_tokens: usage.prompt_tokens ?? 0,
          completion_tokens: usage.completion_tokens ?? 0,
          total_tokens: usage.total_tokens ?? 0,
        });
      }
    }

    return NextResponse.json({ content: text });
  } catch (err: unknown) {
    console.error("[chat] OpenAI API error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
