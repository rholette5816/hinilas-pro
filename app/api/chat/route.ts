import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

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
  if (prompt.length > 40000) {
    return NextResponse.json({ error: "Prompt too long." }, { status: 400 });
  }
  if (typeof systemPrompt === "string" && systemPrompt.length > 40000) {
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
        let mimeType: "image/png" | "image/jpeg" | "image/webp" = "image/png";
        let data: string;

        if (img.startsWith("data:")) {
          const [header, b64] = img.split(",");
          mimeType = (header.match(/:(.*?);/)?.[1] || "image/png") as typeof mimeType;
          data = b64;
        } else {
          const fetchRes = await fetch(img);
          if (!fetchRes.ok) continue;
          const buffer = await fetchRes.arrayBuffer();
          const fetched = (fetchRes.headers.get("content-type") || "image/png") as string;
          if (fetched.startsWith("image/jpeg")) mimeType = "image/jpeg";
          else if (fetched.startsWith("image/webp")) mimeType = "image/webp";
          else mimeType = "image/png";
          data = Buffer.from(buffer).toString("base64");
        }

        parts.push({ inlineData: { mimeType, data } });
      }
      content = parts;
    } else {
      content = prompt;
    }

    const result = await model.generateContent(content);
    const text = result.response.text();

    if (module) {
      const usage = result.response.usageMetadata;
      if (usage) {
        const admin = adminClient();
        void admin.from("token_logs").insert({
          user_id: user.id,
          module,
          prompt_tokens: usage.promptTokenCount ?? 0,
          completion_tokens: usage.candidatesTokenCount ?? 0,
          total_tokens: usage.totalTokenCount ?? 0,
        });
      }
    }

    return NextResponse.json({ content: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gemini API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
