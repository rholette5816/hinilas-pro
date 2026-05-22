import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { isOwnerUser } from "@/lib/admin";
import { deductCreditsAtomic } from "@/lib/credits";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { sanitizePrompt } from "@/lib/sanitize";

export const maxDuration = 60;

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const { prompt, module: moduleName } = await req.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }
  if (prompt.trim().length > 5000) {
    return NextResponse.json({ error: "Prompt too long." }, { status: 400 });
  }

  const ip = getRequestIp(req);
  const rateLimit = checkRateLimit(`content-script:${user.id}:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) },
      }
    );
  }

  const ownerMode = isOwnerUser(user);
  const sanitizedPrompt = sanitizePrompt(prompt);

  if (!ownerMode) {
    const { data: userData } = await supabase
      .from("user_data")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .single();

    if (!userData || userData.credits_remaining < 1) {
      return NextResponse.json(
        { error: "Not enough credits. You need 1 credit to generate a talking head script.", code: "NO_CREDITS" },
        { status: 402 }
      );
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not configured." }, { status: 500 });

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: sanitizedPrompt }],
    });
    const text = completion.choices[0]?.message?.content || "";

    if (moduleName) {
      const usage = completion.usage;
      if (usage) {
        const admin = adminClient();
        void admin.from("token_logs").insert({
          user_id: user.id,
          module: moduleName,
          prompt_tokens: usage.prompt_tokens ?? 0,
          completion_tokens: usage.completion_tokens ?? 0,
          total_tokens: usage.total_tokens ?? 0,
        });
      }
    }

    if (!ownerMode) {
      const deduction = await deductCreditsAtomic({
        userId: user.id,
        amount: 1,
        description: "Talking head script generation",
      });
      if (!deduction.ok) {
        return NextResponse.json({ error: "Credit deduction failed", code: deduction.code }, { status: 409 });
      }
      return NextResponse.json({ script: text, creditsRemaining: deduction.creditsRemaining });
    }

    return NextResponse.json({ script: text });
  } catch (err: unknown) {
    console.error("[content-script] OpenAI API error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
