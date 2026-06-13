# Task: Advanced (LLM) Mode — Full Build

## Goal
Add a second interface mode to Hinilas Pro. A Beginner ⇄ Advanced toggle in the Sidebar switches between the current step-by-step flow and a new conversational `/chat` page. The chat page routes natural language to the existing MODULE_PROMPTS — same AI, same output quality, same credit system.

## Rules
- Never modify existing beginner module pages (angles, research, copy, creative, analyze, campaign-setup). Those pages must continue working exactly as they are.
- Never modify `/app/api/chat/route.ts` — beginner pages depend on it.
- All new billing goes through the existing `POST /api/credits/use` route.
- Reuse `buildUserContext` from `lib/context.tsx` and `MODULE_PROMPTS` from `lib/knowledge.ts`.
- No Meta Ads API actions in this build.
- Follow all rules in `CLAUDE.md`.

---

## Step 1: Database Migration

Create file `supabase/migrations/20260614_chat_mode.sql`:

```sql
-- Mode toggle per user
ALTER TABLE user_data ADD COLUMN IF NOT EXISTS ui_mode text DEFAULT 'beginner';

-- Chat session persistence (one rolling session per user)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
```

---

## Step 2: New API Routes

### 2a. `app/api/chat/advanced/route.ts`

This is the main route for Advanced Mode. It does two things depending on the request:

**Phase 1 — classify (no `confirmed` field in body):**
- Auth check (return 401 if no user)
- Rate limit: 30/min per user
- Read `{ message, images?, sessionState }` from body
- Call OpenAI `gpt-4o-mini` with the classifier prompt (see below) to get `{ intent, cost }`
- If `cost === 0`: immediately run the executor (Phase 2 inline) and return `{ intent, cost: 0, content }`
- If `cost > 0`: return `{ intent, cost, requiresConfirm: true }` — do NOT generate yet

**Phase 2 — execute (body includes `confirmed: true`):**
- Auth check
- Read `{ message, images?, sessionState, intent, confirmed }` from body
- Deduct credits: `POST /api/credits/use { amount: cost, description: "Advanced chat: ${intent}" }`
  - If 402: return `{ error: "Not enough credits", code: "NO_CREDITS" }` with status 402
- Build prompt from MODULE_PROMPTS based on intent (see mapping below)
- Call OpenAI `gpt-4o-mini` (or `gpt-image-1` for creative — but creative returns a button directive, not a generated image)
- On success: return `{ intent, cost, content }`
- On generation failure after deduction: call the refund route then return error

**Classifier system prompt (use this exactly):**
```
You are an intent router for Hinilas Pro, a Meta Ads tool for Filipino eCommerce businesses.
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
- Never invent an intent outside the list
```

**Intent → MODULE_PROMPTS mapping:**
```ts
import { MODULE_PROMPTS, HILAS_KNOWLEDGE } from "@/lib/knowledge";
import { buildUserContext } from "@/lib/context";

// sessionState shape: { research?: string; selectedAngle?: string }

switch (intent) {
  case "research":
    prompt = MODULE_PROMPTS.research(userCtx, setup.language);
    break;
  case "angles":
    prompt = MODULE_PROMPTS.angles(userCtx, sessionState?.research || "", setup.language);
    break;
  case "copy":
    prompt = MODULE_PROMPTS.copy(userCtx, sessionState?.selectedAngle || "", setup.language);
    break;
  case "analyze_basic":
    prompt = MODULE_PROMPTS.analyze(userCtx, "");
    // images array passed to the generation call
    break;
  case "analyze_advanced":
    prompt = MODULE_PROMPTS.analyzeAdvanced(userCtx, "") + "\n\n# USER DATA\n" + message;
    break;
  case "knowledge":
  case "smalltalk":
  case "offtopic":
    prompt = MODULE_PROMPTS.chat(userCtx, message);
    break;
  case "creative":
    // Do NOT generate. Return a button directive.
    return NextResponse.json({ intent: "creative", cost: 2, renderButton: true });
  case "select_angle":
    // Extract the angle from the message and return it for the client to save
    return NextResponse.json({ intent: "select_angle", cost: 0, content: message });
}

// Run generation via OpenAI (same pattern as /api/chat/route.ts)
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: HILAS_KNOWLEDGE },
    { role: "user", content: prompt },
  ],
  // if images provided (analyze_basic), include them as vision messages
});
```

Add `export const maxDuration = 60;` at the top.

---

### 2b. `app/api/credits/refund/route.ts`

```ts
// POST { amount, description }
// Auth required. Adds a positive grant transaction to credit_transactions.
// Uses service role key to bypass RLS.
// Same pattern as /api/credits/use but adds credits instead of deducting.
```

---

## Step 3: lib/context.tsx changes

Add to `AppContextType`:
```ts
uiMode: "beginner" | "advanced";
setUiMode: (mode: "beginner" | "advanced") => Promise<void>;
chatMessages: ChatMessage[];
setChatMessages: (msgs: ChatMessage[]) => void;
```

Add `ChatMessage` interface (export it):
```ts
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  intent?: string;
  card?: "research" | "angles" | "copy" | "analyze" | "creative" | "text";
  images?: string[];
  cost?: number;
  renderButton?: boolean;
  createdAt: string;
}
```

In the `useEffect` hydration block, load `ui_mode` and the latest `chat_sessions` row:
```ts
if (data.ui_mode) setUiModeState(data.ui_mode as "beginner" | "advanced");

// Load chat session
const { data: session } = await supabase
  .from("chat_sessions")
  .select("messages")
  .eq("user_id", user.id)
  .maybeSingle();
if (session?.messages) setChatMessagesState(session.messages);
```

Add `setUiMode` function that persists to `user_data`:
```ts
async function setUiMode(mode: "beginner" | "advanced") {
  setUiModeState(mode);
  await persist({ ui_mode: mode });
}
```

Add `setChatMessages` function that persists to `chat_sessions`:
```ts
async function setChatMessages(msgs: ChatMessage[]) {
  setChatMessagesState(msgs);
  if (!userId) return;
  const supabase = createClient();
  await supabase.from("chat_sessions").upsert(
    { user_id: userId, messages: msgs, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
}
```

---

## Step 4: components/Sidebar.tsx changes

At the top of the sidebar (below the logo, above the nav links), add a mode toggle:

```tsx
const { uiMode, setUiMode } = useApp();

<div className="flex rounded-xl overflow-hidden mb-4" style={{ background: "#0F172A", border: "1px solid rgba(217,119,6,0.2)" }}>
  <button
    onClick={() => setUiMode("beginner")}
    className="flex-1 py-2 text-xs font-bold transition-all"
    style={uiMode === "beginner"
      ? { background: "linear-gradient(135deg, #1877F2, #D97706)", color: "#fff" }
      : { color: "#64748B" }}
  >
    Beginner
  </button>
  <button
    onClick={() => setUiMode("advanced")}
    className="flex-1 py-2 text-xs font-bold transition-all"
    style={uiMode === "advanced"
      ? { background: "linear-gradient(135deg, #1877F2, #D97706)", color: "#fff" }
      : { color: "#64748B" }}
  >
    Advanced
  </button>
</div>
```

When `uiMode === "advanced"`, show a simplified nav:
- Chat (`/chat`)
- Library (`/creative` — existing saved images)
- Setup (`/`)
- Pricing (`/pricing`)

When `uiMode === "beginner"`, show the existing full nav (no change).

---

## Step 5: app/chat/page.tsx (new page)

Full chat UI. Three regions: header, message thread, composer.

### Header
```tsx
<div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(217,119,6,0.15)", background: "#0F172A" }}>
  <div>
    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#D97706" }}>Hilas AI</p>
    <p className="text-sm font-black text-white">Advanced Mode</p>
  </div>
  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.25)" }}>
    <span className="text-xs font-bold" style={{ color: "#D97706" }}>⚡ {credits} cr</span>
  </div>
</div>
```

### Message Thread
- User messages: right-aligned bubble, dark background
- Assistant messages: left-aligned, two types:
  - `card === "text"` / `intent === "knowledge"` → plain formatted text bubble
  - All paid intents → a styled card with the deliverable content rendered using `AIOutput` component (already exists), plus action buttons

**Card action buttons by intent:**
- `research`: "Use in Angles" → sets `sessionResearch` state, shows angles chip
- `angles`: individual "Use this angle" button per angle block
- `copy`: "Copy caption" clipboard button
- `analyze_basic` / `analyze_advanced`: "Get Report" → calls existing `downloadHTMLDeck` logic
- `creative`: renders a `[Generate creative — 2 credits]` button that calls `/api/image`

### Confirm Affordance (for paid intents)
When `requiresConfirm: true` is returned, render this in the thread:
```tsx
<div className="rounded-xl p-4 my-2" style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.3)" }}>
  <p className="text-sm text-white font-semibold mb-3">⚡ {actionLabel} — {cost} credit{cost > 1 ? "s" : ""}</p>
  <div className="flex gap-2">
    <button onClick={handleConfirm} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: "#D97706", color: "#000" }}>
      Confirm
    </button>
    <button onClick={handleCancel} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: "rgba(255,255,255,0.08)", color: "#94A3B8" }}>
      Cancel
    </button>
  </div>
</div>
```

### Suggestion Chips
Context-aware chips shown above the composer. Logic:
- No setup complete → `["Set up my business"]` (routes to `/`)
- Setup done, no research → `["Research my market — 1 cr"]`
- Has research, no angles → `["Generate 5 angles — 1 cr"]`
- Has angles, no angle selected → show top 2 angle options
- Has selected angle → `["Write ad copy — 1 cr", "Make creative — 2 cr"]`
- Always show: `["Ask anything (free)"]`

### Composer
```tsx
<div className="px-4 py-3 border-t" style={{ borderColor: "rgba(217,119,6,0.15)", background: "#0F172A" }}>
  {/* suggestion chips row */}
  <div className="flex gap-2 mb-3 overflow-x-auto pb-1 flex-wrap">
    {chips.map(chip => (
      <button key={chip.label} onClick={() => handleChipTap(chip)}
        className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0"
        style={{ background: "rgba(24,119,242,0.12)", border: "1px solid rgba(24,119,242,0.25)", color: "#60A5FA" }}>
        {chip.label}
      </button>
    ))}
  </div>
  {/* image attach preview */}
  {attachedImage && <img src={attachedImage} className="w-16 h-16 rounded-lg object-cover mb-2" />}
  <div className="flex items-end gap-2">
    <label className="cursor-pointer p-2 rounded-xl shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
      <input type="file" accept="image/*" className="hidden" onChange={handleImageAttach} />
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
    </label>
    <textarea
      value={input}
      onChange={e => setInput(e.target.value)}
      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
      placeholder="Ask anything or tell me what to generate..."
      rows={1}
      className="flex-1 resize-none rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(217,119,6,0.15)", maxHeight: "120px" }}
    />
    <button onClick={handleSend} disabled={!input.trim() && !attachedImage || loading}
      className="p-3 rounded-xl disabled:opacity-40 shrink-0"
      style={{ background: "linear-gradient(135deg, #1877F2, #D97706)" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
    </button>
  </div>
</div>
```

### State in the page
```ts
const { setup, credits, refreshCredits, chatMessages, setChatMessages, researchOutput, setResearchOutput, anglesOutput, setAnglesOutput, selectedAngle, setSelectedAngle } = useApp();
const [input, setInput] = useState("");
const [loading, setLoading] = useState(false);
const [attachedImage, setAttachedImage] = useState<string | null>(null);
const [pendingIntent, setPendingIntent] = useState<{ intent: string; cost: number } | null>(null);
const [sessionResearch, setSessionResearch] = useState(researchOutput || "");
const [sessionAngles, setSessionAngles] = useState(anglesOutput || "");
```

### handleSend flow
```ts
async function handleSend() {
  if (!input.trim() && !attachedImage) return;
  if (!setup) { router.push("/"); return; }
  
  const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text: input, images: attachedImage ? [attachedImage] : [], createdAt: new Date().toISOString() };
  const newMessages = [...chatMessages, userMsg];
  setChatMessages(newMessages);
  setInput("");
  setAttachedImage(null);
  setLoading(true);

  try {
    const res = await fetch("/api/chat/advanced", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input,
        images: attachedImage ? [attachedImage] : [],
        sessionState: { research: sessionResearch, selectedAngle },
      }),
    });
    const data = await res.json();

    if (data.requiresConfirm) {
      setPendingIntent({ intent: data.intent, cost: data.cost });
      // Add a confirm card to the thread
      const confirmMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", text: "", intent: data.intent, card: "confirm", cost: data.cost, createdAt: new Date().toISOString() };
      setChatMessages([...newMessages, confirmMsg]);
      return;
    }

    await handleAssistantResponse(data, newMessages);
  } finally {
    setLoading(false);
  }
}
```

### handleConfirm flow
```ts
async function handleConfirm() {
  if (!pendingIntent || !setup) return;
  if (credits < pendingIntent.cost) return;
  setLoading(true);
  
  // Remove the confirm card, replace with loading
  try {
    // Deduct credits
    const deductRes = await fetch("/api/credits/use", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: pendingIntent.cost, description: `Advanced chat: ${pendingIntent.intent}` }),
    });
    if (!deductRes.ok) { setLoading(false); return; }
    await refreshCredits();

    // Execute generation
    const res = await fetch("/api/chat/advanced", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: chatMessages.findLast(m => m.role === "user")?.text || "",
        images: chatMessages.findLast(m => m.role === "user")?.images || [],
        sessionState: { research: sessionResearch, selectedAngle },
        intent: pendingIntent.intent,
        confirmed: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      // Refund
      await fetch("/api/credits/refund", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: pendingIntent.cost, description: `Refund: ${pendingIntent.intent} failed` }) });
      await refreshCredits();
    } else {
      await handleAssistantResponse(data, chatMessages.filter(m => m.card !== "confirm"));
    }
  } finally {
    setPendingIntent(null);
    setLoading(false);
  }
}
```

### handleAssistantResponse
```ts
async function handleAssistantResponse(data: { intent: string; cost: number; content?: string; renderButton?: boolean }, messagesSoFar: ChatMessage[]) {
  const card = data.renderButton ? "creative" :
    (["research", "angles", "copy", "analyze_basic", "analyze_advanced"].includes(data.intent) ? data.intent as ChatMessage["card"] : "text");

  const assistantMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    text: data.content || "",
    intent: data.intent,
    card,
    cost: data.cost,
    createdAt: new Date().toISOString(),
  };

  const updated = [...messagesSoFar, assistantMsg];
  setChatMessages(updated);

  // Update session context for follow-up routing
  if (data.intent === "research" && data.content) { setSessionResearch(data.content); setResearchOutput(data.content); }
  if (data.intent === "angles" && data.content) { setSessionAngles(data.content); setAnglesOutput(data.content); }
}
```

---

## Step 6: Empty State (no setup)

If `!setup`, render:
```tsx
<div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
  <p className="text-white font-bold text-lg mb-2">Set up your business first</p>
  <p className="text-sm mb-6" style={{ color: "#64748B" }}>Advanced mode needs your business profile to generate results.</p>
  <button onClick={() => router.push("/")} className="px-6 py-3 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #1877F2, #D97706)" }}>
    Go to Setup
  </button>
</div>
```

---

## Acceptance Checks

Run these after completing the build:

1. Free message ("how do I set budget?") → answer appears, credits unchanged, no confirm shown
2. "Give me angles" → confirm card appears with cost 1 → Confirm → 1 credit deducted, header updates, angles card renders
3. "Give me angles" with 0 credits → confirm card shows but Confirm is blocked → "Not enough credits"
4. "Make me a creative" → creative button card appears (no auto-generation)
5. Beginner pages (angles, research, copy, creative, analyze) → completely unchanged, still work
6. Switch Beginner → Advanced → sidebar nav changes → switch back → nav restores, credits intact
7. Refresh on `/chat` → previous messages reload from `chat_sessions`
8. Attach screenshot + send → `analyze_basic` intent detected → confirm → analyze card renders

---

## DO NOT

- Do not modify `app/api/chat/route.ts`
- Do not modify any existing module page (angles, research, copy, creative, analyze, campaign-setup)
- Do not add Meta Ads API calls
- Do not use em dashes in any copy or UI text
- Do not add `use*` named functions that are not React hooks
