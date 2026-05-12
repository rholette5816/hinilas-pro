# Task: Content Pack Generator

## Goal
Add a new `/content` module to Hinilas Pro that generates 7 ready-to-post Facebook/IG content pieces based on the user's market research output. Each post has a Hook, Body, CTA, and Hashtags. Users can optionally generate an image for each post (2 credits per image). All output is saved to Supabase and restored on next session.

---

## Credit Cost
- Generate all 7 posts: **7 credits** (one API call, deducted atomically)
- Generate image for 1 post: **2 credits** (per-post, optional)
- Owner accounts (OWNER_EMAILS) skip credit checks entirely

---

## Files to Create

### 1. `app/api/content/route.ts`

New API route. Accepts POST with `{ prompt, language, module }`. Uses the same `/api/chat` pattern but deducts 7 credits atomically using `deductCreditsAtomic` from `@/lib/credits`.

```ts
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
  const { prompt, language, module: moduleName } = await req.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerMode = isOwnerUser(user);

  if (!ownerMode) {
    const { data: userData } = await supabase
      .from("user_data")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .single();

    if (!userData || userData.credits_remaining < 7) {
      return NextResponse.json({ error: "Not enough credits. You need 7 credits to generate the content pack.", code: "NO_CREDITS" }, { status: 402 });
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
```

---

### 2. `app/api/content-image/route.ts`

New API route for generating an image for a single content post. Deducts 2 credits. Reuses the same Gemini image generation pattern from `/api/image/route.ts` but simplified (no variations, no reference image). Uploads to Supabase Storage and inserts into `media_library`.

```ts
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

async function uploadBase64ToStorage(base64DataUri: string, userId: string, filename: string): Promise<string | null> {
  try {
    const admin = adminClient();
    const [header, data] = base64DataUri.split(",");
    const mimeType = header.match(/:(.*?);/)?.[1] || "image/png";
    const ext = mimeType.split("/")[1] || "png";
    const buffer = Buffer.from(data, "base64");
    const path = `${userId}/content-images/${filename}.${ext}`;
    const { error } = await admin.storage.from("ad-creative").upload(path, buffer, { contentType: mimeType, upsert: true });
    if (error) return null;
    const { data: { publicUrl } } = admin.storage.from("ad-creative").getPublicUrl(path);
    return publicUrl;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { prompt, aspectRatio = "1:1", postType = "", angle = "" } = await req.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerMode = isOwnerUser(user);

  if (!ownerMode) {
    const { data: userData } = await supabase
      .from("user_data")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .single();
    if (!userData || userData.credits_remaining < 2) {
      return NextResponse.json({ error: "No credits remaining", code: "NO_CREDITS" }, { status: 402 });
    }
  }

  const apiKey = process.env.GEMINI_IMAGE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_IMAGE_API_KEY not configured." }, { status: 500 });

  const ASPECT_RATIO_LABELS: Record<string, string> = {
    "1:1": "square (1:1 aspect ratio)",
    "4:5": "portrait (4:5 aspect ratio)",
    "9:16": "vertical portrait (9:16 aspect ratio)",
  };
  const ratioLabel = ASPECT_RATIO_LABELS[aspectRatio] || aspectRatio;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: `${prompt}\n\nGenerate this as a ${ratioLabel} image.` }] }],
      generationConfig: {
        // @ts-expect-error responseModalities is valid but not yet in type definitions
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    let imageData: string | null = null;
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || "image/png";
        imageData = `data:${mime};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageData) return NextResponse.json({ error: "No image generated. Try again." }, { status: 500 });

    const ts = Date.now();
    const publicUrl = await uploadBase64ToStorage(imageData, user.id, `${ts}-content-post`);

    if (publicUrl) {
      const admin = adminClient();
      void admin.from("media_library").insert({
        user_id: user.id,
        type: "image",
        url: publicUrl,
        label: `Content Post: ${postType}`,
        angle: angle || null,
      });
    }

    if (!ownerMode) {
      const deduction = await deductCreditsAtomic({ userId: user.id, amount: 2, description: `Content post image: ${postType}` });
      if (!deduction.ok) {
        return NextResponse.json({ error: "Credit deduction failed", code: deduction.code }, { status: 409 });
      }
      return NextResponse.json({ imageUrl: publicUrl ?? imageData, creditsRemaining: deduction.creditsRemaining });
    }

    return NextResponse.json({ imageUrl: publicUrl ?? imageData });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Image generation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

---

### 3. `app/content/page.tsx`

Full page component. Follow the exact same structure and style as `app/research/page.tsx` and `app/angles/page.tsx`.

#### Imports needed:
```ts
"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import FunnelProgress from "@/components/FunnelProgress";
import { useApp, buildUserContext } from "@/lib/context";
import { MODULE_PROMPTS } from "@/lib/knowledge";
```

#### Language options (same as other modules):
```ts
const LANGUAGE_OPTIONS = [
  { value: "Taglish", label: "Taglish" },
  { value: "Bisaya-English", label: "Bisaya-English" },
  { value: "Ilocano-English", label: "Ilocano-English" },
  { value: "Pure English", label: "Pure English" },
  { value: "Pure Filipino", label: "Pure Filipino" },
];
```

#### Content post types with colors:
```ts
const POST_TYPES = [
  { type: "Pain Point", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
  { type: "Transformation", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  { type: "Objection Crusher", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  { type: "Social Proof", color: "#10B981", bg: "#ECFDF5", border: "#A7F3D0" },
  { type: "Educational Tip", color: "#1877F2", bg: "#EFF6FF", border: "#BFDBFE" },
  { type: "Urgency/Offer", color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  { type: "Trust Builder", color: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE" },
];
```

#### State:
```ts
const [language, setLanguage] = useState(setup?.language || "Taglish");
const [loading, setLoading] = useState(false);
const [noCredits, setNoCredits] = useState(false);
const [posts, setPosts] = useState<ContentPost[]>(contentOutput?.posts || []);
const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});
const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:5">("1:1");
```

#### Interface:
```ts
interface ContentPost {
  type: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string;
  image?: string;
  language: string;
}
```

#### Generate function:
1. Check `credits < 7` → set `noCredits` state and return
2. Set `loading(true)`, clear posts
3. Build prompt: `MODULE_PROMPTS.content(buildUserContext(setup), researchOutput, language)`
4. POST to `/api/content` with `{ prompt, language, module: "content" }`
5. On success: parse the JSON response (see prompt format below), call `setContentOutput({ posts: parsedPosts, language, generatedAt: new Date().toISOString() })`
6. Set `loading(false)`, call `refreshCredits()`

#### Generate image function (per post):
1. Takes `postIndex: number`, `post: ContentPost`
2. Set `imageLoading[postIndex] = true`
3. Build image prompt from the post hook + body + setup info
4. POST to `/api/content-image` with `{ prompt, aspectRatio, postType: post.type }`
5. On success: update `posts[postIndex].image = imageUrl`, call `setContentOutput` with updated posts
6. Set `imageLoading[postIndex] = false`, call `refreshCredits()`

#### UI layout:
- Top section: business name display + language selector dropdown + "Generate Content Pack — 7 credits" button
- If `!researchOutput`: show a warning card "Run Research first to generate content"
- If `credits < 7` and not loading: show noCredits warning
- Below: 7 post cards in vertical list (or 2-column grid on desktop)
- Each card:
  - Color-coded left border using `POST_TYPES[i].color`
  - Type badge top-left
  - Hook in bold large text
  - Body text
  - CTA pill
  - Hashtags in muted small text
  - Copy button (copies hook + body + cta + hashtags to clipboard)
  - Bottom row: aspect ratio toggle (1:1 / 4:5) + "Generate Image — 2 credits" button
  - If `imageLoading[i]`: spinner in place of button
  - If `post.image`: show image below the card content, full width, with download button
- Loading state: skeleton cards with pulse animation while generating

#### Copy to clipboard helper:
```ts
function copyPost(post: ContentPost) {
  const text = `${post.hook}\n\n${post.body}\n\n${post.cta}\n\n${post.hashtags}`;
  navigator.clipboard.writeText(text);
}
```

---

## Files to Edit

### 4. `lib/knowledge.ts`

Add `content` function to `MODULE_PROMPTS` object after the existing `copy` entry:

```ts
content: (userContext: string, researchContext: string, language: string) => `
You are a Filipino social media content expert specializing in Facebook and Instagram ads.

# USER CONTEXT
${userContext}

# MARKET RESEARCH INSIGHTS
${researchContext || "No research provided. Use the business context above to infer buyer psychology."}

# LANGUAGE
Write ALL post content in ${language}. This applies to the hook, body, cta, and hashtags. Write naturally in this dialect as Filipinos actually speak it.

# TASK
Generate exactly 7 Facebook/Instagram content posts for this business. Each post must be based on the research insights above — use the specific pains, desires, fears, and internal dialogues from the research.

Return your response as a valid JSON array with exactly 7 objects. No markdown, no explanation, just the raw JSON array.

Each object must follow this exact structure:
{
  "type": "<one of: Pain Point | Transformation | Objection Crusher | Social Proof | Educational Tip | Urgency/Offer | Trust Builder>",
  "hook": "<scroll-stopping opening line, 1-2 sentences max, makes them stop scrolling>",
  "body": "<2-4 sentences expanding on the hook, connects emotionally, builds desire or addresses fear>",
  "cta": "<clear call to action, 1 sentence, tells them exactly what to do next>",
  "hashtags": "<6-10 relevant hashtags separated by spaces>"
}

Post type guidelines:
1. Pain Point — Opens with the exact pain or problem. Agitate it. Make them feel seen.
2. Transformation — Before/after story. Show the struggle then the result. Make it specific.
3. Objection Crusher — Address the #1 reason they hesitate. Flip it into a reason to buy.
4. Social Proof — Write as if sharing a customer result or reaction. Testimonial energy.
5. Educational Tip — Teach something useful related to the product/problem. Soft sell at the end.
6. Urgency/Offer — Lead with the offer. Create urgency. Make the value undeniable.
7. Trust Builder — Behind-the-scenes or founder perspective. Build credibility and authenticity.

Rules:
- Each post must feel completely different from the others
- Use conversational ${language} — how real Filipinos talk, not formal
- Hooks must be specific to the research insights, not generic
- Body must connect the product to the research pains/desires
- No em dashes anywhere
- Return ONLY the JSON array, nothing else
`,
```

### 5. `lib/context.tsx`

#### Add interface before `AppContextType`:
```ts
export interface ContentPost {
  type: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string;
  image?: string;
  language: string;
}

export interface ContentOutput {
  posts: ContentPost[];
  language: string;
  generatedAt: string;
}
```

#### Add to `AppContextType` interface:
```ts
contentOutput: ContentOutput | null;
setContentOutput: (c: ContentOutput) => void;
```

#### Add state in `AppProvider`:
```ts
const [contentOutput, setContentOutputState] = useState<ContentOutput | null>(null);
```

#### Load from Supabase in the hydration `useEffect`, inside the `if (data)` block:
```ts
if (data.content_output) setContentOutputState(data.content_output);
```

#### Add setter function:
```ts
function setContentOutput(c: ContentOutput) {
  setContentOutputState(c);
  persist({ content_output: c });
}
```

#### Add to `AppContext.Provider value`:
```ts
contentOutput, setContentOutput,
```

#### Add to `useApp()` destructuring in the page (just use it — no changes needed to the hook itself, context handles it).

### 6. `components/Sidebar.tsx`

Add a new nav item to `NAV_ITEMS` array between Research (index 1) and Strategy/Angles (index 2):

```ts
{
  href: "/content",
  label: "Content Pack",
  desc: "7 posts from research",
  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="3"/></svg>,
},
```

---

## Acceptance Criteria
- [ ] `/content` page loads without errors
- [ ] Language selector defaults to `setup.language`, user can change it
- [ ] "Generate Content Pack — 7 credits" button is disabled if `researchOutput` is empty, shows warning
- [ ] If `credits < 7`, shows "Not enough credits" message and disables button
- [ ] Clicking generate calls `/api/content`, deducts 7 credits, renders 7 post cards
- [ ] Each card shows type badge, hook, body, CTA, hashtags
- [ ] Copy button copies full post text to clipboard
- [ ] Each card has "Generate Image — 2 credits" button with aspect ratio toggle (1:1 / 4:5)
- [ ] Clicking image button calls `/api/content-image`, deducts 2 credits, shows image in card
- [ ] Generated image has a download button
- [ ] All output saves to Supabase `content_output` column and restores on next session
- [ ] Owner accounts skip credit checks on both routes
- [ ] "Content Pack" nav item appears in sidebar between Research and Strategy
- [ ] No TypeScript errors (`npm run build` passes)

---

## Do NOT change
- Any existing API routes
- Auth flow
- Credit system logic in `lib/credits.ts`
- Any other existing pages
- `app/home/page.tsx`
- Supabase table structure (use existing `user_data` JSONB column `content_output` — Supabase handles JSONB automatically)
