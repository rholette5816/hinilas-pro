import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizePrompt } from "@/lib/sanitize";
import { buildUserContext, type BuildUserContextSetup } from "@/lib/user-context";
import { HILAS_KNOWLEDGE, MODULE_PROMPTS } from "@/lib/knowledge";

export const maxDuration = 60;

type Intent =
  | "research"
  | "angles"
  | "copy"
  | "analyze_basic"
  | "analyze_advanced"
  | "creative"
  | "knowledge"
  | "select_angle"
  | "smalltalk"
  | "offtopic";

type SessionState = {
  research?: string;
  selectedAngle?: string;
};

type BeginnerContext = {
  research_output?: string | null;
  angles_output?: string | null;
  selected_angle?: string | null;
  copy_output?: string | null;
};

type ExecuteParams = {
  req: NextRequest;
  openai: OpenAI;
  intent: Intent;
  cost: number;
  message: string;
  images: string[];
  sessionState: SessionState;
  savedContext: BeginnerContext;
  setup: BuildUserContextSetup;
  shouldBill: boolean;
  stream: boolean;
};

const INTENT_COST: Record<Intent, number> = {
  research: 1,
  angles: 1,
  copy: 1,
  analyze_basic: 1,
  analyze_advanced: 2,
  creative: 2,
  knowledge: 0,
  select_angle: 0,
  smalltalk: 0,
  offtopic: 0,
};

const CLASSIFIER_SYSTEM_PROMPT = `You are an intent router for Hinilas Pro, a Meta Ads tool for Filipino eCommerce businesses.
Classify the user's latest message into ONE intent. Return JSON only.
Format: { "intent": "<intent>", "cost": <number> }

Intents and costs:
- "research" (cost: 1) — wants market research or buyer profile
- "angles" (cost: 1) — wants ad angles or hooks
- "copy" (cost: 1) — wants ad copy, captions, or sales copy written
- "analyze_basic" (cost: 1) — wants a Meta Ads Manager screenshot analyzed
- "analyze_advanced" (cost: 2) — wants deep analysis, CSV breakdown, or expert audit
- "creative" (cost: 2) — wants an ad image or creative generated
- "knowledge" (cost: 0) — how-to question about ads or the tool, answerable from knowledge
- "select_angle" (cost: 0) — user is picking or locking one of the angles shown
- "smalltalk" (cost: 0) — greeting, thanks, chit-chat
- "offtopic" (cost: 0) — unrelated to Meta Ads or Hinilas Pro

Rules:
- Image attached + evaluation question → analyze_basic
- Mentions CSV/spreadsheet/columns/multiple ad sets → analyze_advanced  
- If unsure between knowledge and a paid module → knowledge (free)
- Never invent an intent outside the list`;

function normalizeIntent(value: unknown): Intent {
  if (typeof value !== "string") return "knowledge";
  if (value in INTENT_COST) return value as Intent;
  return "knowledge";
}

function parseClassifierResult(content: string): { intent: Intent; cost: number } {
  try {
    const parsed = JSON.parse(content) as { intent?: unknown; cost?: unknown };
    const intent = normalizeIntent(parsed.intent);
    return { intent, cost: INTENT_COST[intent] };
  } catch {
    return { intent: "knowledge", cost: 0 };
  }
}

function getCookieHeader(req: NextRequest): HeadersInit {
  const cookie = req.headers.get("cookie");
  return cookie
    ? { "Content-Type": "application/json", cookie }
    : { "Content-Type": "application/json" };
}

async function deductViaCreditRoute(req: NextRequest, amount: number, description: string) {
  const res = await fetch(new URL("/api/credits/use", req.url), {
    method: "POST",
    headers: getCookieHeader(req),
    body: JSON.stringify({ amount, description }),
  });
  if (res.status === 402) {
    return NextResponse.json({ error: "Not enough credits", code: "NO_CREDITS" }, { status: 402 });
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: data.error || "Credit deduction failed", code: data.code || "CREDIT_FAILED" },
      { status: res.status }
    );
  }
  return null;
}

async function refundViaCreditRoute(req: NextRequest, amount: number, description: string) {
  await fetch(new URL("/api/credits/refund", req.url), {
    method: "POST",
    headers: getCookieHeader(req),
    body: JSON.stringify({ amount, description }),
  }).catch(() => null);
}

async function classify(openai: OpenAI, message: string, hasImages: boolean): Promise<{ intent: Intent; cost: number }> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: CLASSIFIER_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Latest message: ${message || "(no text)"}\nImages attached: ${hasImages ? "yes" : "no"}`,
      },
    ],
  });

  return parseClassifierResult(completion.choices[0]?.message?.content || "");
}

async function imageParts(images: string[]): Promise<OpenAI.Chat.ChatCompletionContentPartImage[]> {
  const parts: OpenAI.Chat.ChatCompletionContentPartImage[] = [];
  for (const img of images.slice(0, 4)) {
    if (img.startsWith("data:")) {
      parts.push({ type: "image_url", image_url: { url: img } });
      continue;
    }

    const fetchRes = await fetch(img).catch(() => null);
    if (!fetchRes?.ok) continue;
    const buffer = await fetchRes.arrayBuffer();
    const mimeType = fetchRes.headers.get("content-type") || "image/png";
    const b64 = Buffer.from(buffer).toString("base64");
    parts.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${b64}` } });
  }
  return parts;
}

function cleanContextValue(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function buildSavedContextSection(intent: Intent, savedContext: BeginnerContext) {
  const fields: Array<[string, string]> = [];

  if (intent === "angles") {
    fields.push(["Research", cleanContextValue(savedContext.research_output)]);
  } else if (intent === "copy") {
    fields.push(["Angles", cleanContextValue(savedContext.angles_output)]);
    fields.push(["Selected Angle", cleanContextValue(savedContext.selected_angle)]);
  } else if (intent === "research" || intent === "knowledge" || intent === "smalltalk") {
    fields.push(["Research", cleanContextValue(savedContext.research_output)]);
    fields.push(["Angles", cleanContextValue(savedContext.angles_output)]);
    fields.push(["Selected Angle", cleanContextValue(savedContext.selected_angle)]);
    fields.push(["Copy", cleanContextValue(savedContext.copy_output)]);
  }

  const lines = fields
    .filter(([, value]) => value.length > 0)
    .map(([label, value]) => `${label}: ${value}`);

  if (lines.length === 0) return "";

  return `# SAVED CONTEXT FROM BEGINNER MODE
${lines.join("\n")}

Use this context when it helps, and ignore it when it doesn't.`;
}

function withSavedContext(prompt: string, intent: Intent, savedContext: BeginnerContext) {
  const savedContextSection = buildSavedContextSection(intent, savedContext);
  return savedContextSection ? `${prompt}\n\n${savedContextSection}` : prompt;
}

function buildPrompt(intent: Intent, userCtx: string, setup: BuildUserContextSetup, message: string, sessionState: SessionState, savedContext: BeginnerContext): string {
  let prompt: string;

  switch (intent) {
    case "research":
      prompt = MODULE_PROMPTS.research(userCtx, setup.language);
      break;
    case "angles":
      prompt = MODULE_PROMPTS.angles(userCtx, cleanContextValue(savedContext.research_output) || sessionState.research || "", setup.language);
      break;
    case "copy": {
      const angle = cleanContextValue(savedContext.selected_angle) || sessionState.selectedAngle || message || "Use the strongest angle for this business.";
      prompt = `${MODULE_PROMPTS.copy(userCtx, ["PAS", "AIDA"], setup.language)}

# SELECTED ANGLE
${angle}

# ADVANCED CHAT INSTRUCTION
If no ad image is attached, write the captions from the selected angle and business context.`;
      break;
    }
    case "analyze_basic":
      prompt = MODULE_PROMPTS.analyze(userCtx, "");
      break;
    case "analyze_advanced":
      prompt = `${MODULE_PROMPTS.analyzeAdvanced(userCtx, "")}\n\n# USER DATA\n${message}`;
      break;
    case "knowledge":
    case "smalltalk":
    case "offtopic":
    default:
      prompt = MODULE_PROMPTS.chat(userCtx, message);
      break;
  }

  return withSavedContext(prompt, intent, savedContext);
}

async function executeAdvancedChat({
  req,
  openai,
  intent,
  cost,
  message,
  images,
  sessionState,
  savedContext,
  setup,
  shouldBill,
  stream,
}: ExecuteParams) {
  if (intent === "creative") {
    return NextResponse.json({
      intent: "creative",
      cost: INTENT_COST.creative,
      renderButton: true,
      content: "Ready to generate a creative from your selected angle.",
    });
  }

  if (intent === "select_angle") {
    return NextResponse.json({ intent: "select_angle", cost: 0, content: message });
  }

  let deducted = false;
  if (shouldBill && cost > 0) {
    const creditError = await deductViaCreditRoute(req, cost, `Advanced chat: ${intent}`);
    if (creditError) return creditError;
    deducted = true;
  }

  try {
    const userCtx = buildUserContext(setup, setup.language);
    const prompt = sanitizePrompt(buildPrompt(intent, userCtx, setup, message, sessionState, savedContext));
    const userContent: Array<OpenAI.Chat.ChatCompletionContentPartText | OpenAI.Chat.ChatCompletionContentPartImage> = [
      { type: "text", text: prompt },
    ];

    if (images.length > 0 && (intent === "analyze_basic" || intent === "copy")) {
      userContent.push(...await imageParts(images));
    }

    if (stream) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: HILAS_KNOWLEDGE },
          { role: "user", content: userContent },
        ],
        stream: true,
      });

      const readable = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            for await (const chunk of completion) {
              const token = chunk.choices[0]?.delta?.content || "";
              if (token) controller.enqueue(encoder.encode(token));
            }
          } catch (err) {
            console.error("[advanced-chat] stream error:", err);
            if (deducted) {
              await refundViaCreditRoute(req, cost, `Refund: ${intent} failed`);
            }
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Intent": intent,
          "X-Cost": String(cost),
        },
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: HILAS_KNOWLEDGE },
        { role: "user", content: userContent },
      ],
    });

    return NextResponse.json({
      intent,
      cost,
      content: completion.choices[0]?.message?.content || "",
    });
  } catch (err) {
    console.error("[advanced-chat] generation error:", err);
    if (deducted) {
      await refundViaCreditRoute(req, cost, `Refund: ${intent} failed`);
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message : "";
  const images = Array.isArray(body.images) ? body.images.filter((img: unknown): img is string => typeof img === "string") : [];
  const sessionState = typeof body.sessionState === "object" && body.sessionState
    ? body.sessionState as SessionState
    : {};
  const confirmed = body.confirmed === true;
  const stream = body.stream === true;

  if (!message.trim() && images.length === 0) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }
  if (message.length > 40000) {
    return NextResponse.json({ error: "Message too long." }, { status: 400 });
  }
  if (images.length > 4) {
    return NextResponse.json({ error: "Too many images." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`chat-advanced:${user.id}`, { limit: 30, windowMs: 60_000 });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured." }, { status: 500 });
  }

  const { data: userData } = await supabase
    .from("user_data")
    .select("setup, research_output, angles_output, selected_angle, copy_output")
    .eq("user_id", user.id)
    .single();

  const setup = userData?.setup as BuildUserContextSetup | null;
  if (!setup?.businessName) {
    return NextResponse.json({ error: "Business setup required.", code: "SETUP_REQUIRED" }, { status: 400 });
  }
  const savedContext: BeginnerContext = {
    research_output: cleanContextValue(userData?.research_output),
    angles_output: cleanContextValue(userData?.angles_output),
    selected_angle: cleanContextValue(userData?.selected_angle),
    copy_output: cleanContextValue(userData?.copy_output),
  };

  const openai = new OpenAI({ apiKey });

  if (!confirmed) {
    const classified = await classify(openai, sanitizePrompt(message), images.length > 0);
    return NextResponse.json({ ...classified, requiresConfirm: classified.cost > 0 });
  }

  const intent = normalizeIntent(body.intent);
  const cost = INTENT_COST[intent];
  return executeAdvancedChat({
    req,
    openai,
    intent,
    cost,
    message,
    images,
    sessionState,
    savedContext,
    setup,
    shouldBill: cost > 0 && intent !== "creative",
    stream,
  });
}
