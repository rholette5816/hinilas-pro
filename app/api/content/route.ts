import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { isOwnerUser } from "@/lib/admin";
import { deductCreditsAtomic } from "@/lib/credits";

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

  const ownerMode = isOwnerUser(user);

  if (!ownerMode) {
    const { data: userData } = await supabase
      .from("user_data")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .single();

    if (!userData || userData.credits_remaining < 7) {
      return NextResponse.json(
        { error: "Not enough credits. You need 7 credits to generate the content pack.", code: "NO_CREDITS" },
        { status: 402 }
      );
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not configured." }, { status: 500 });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (moduleName) {
      const usage = result.response.usageMetadata;
      if (usage) {
        const admin = adminClient();
        void admin.from("token_logs").insert({
          user_id: user.id,
          module: moduleName,
          prompt_tokens: usage.promptTokenCount ?? 0,
          completion_tokens: usage.candidatesTokenCount ?? 0,
          total_tokens: usage.totalTokenCount ?? 0,
        });
      }
    }

    if (!ownerMode) {
      const deduction = await deductCreditsAtomic({
        userId: user.id,
        amount: 7,
        description: "Content Pack generation (7 posts)",
      });
      if (!deduction.ok) {
        return NextResponse.json({ error: "Credit deduction failed", code: deduction.code }, { status: 409 });
      }
      return NextResponse.json({ content: text, creditsRemaining: deduction.creditsRemaining });
    }

    return NextResponse.json({ content: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gemini API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
