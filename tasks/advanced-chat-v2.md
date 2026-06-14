# Task: Advanced Chat V2 — Streaming, Folders, Pins, Clean UI

## Rules
- Never modify beginner module pages or `/app/api/chat/route.ts`
- All billing goes through `POST /api/credits/use` — do not change that route
- Follow all rules in `CLAUDE.md` and `web-hilas/CLAUDE.md`
- No new npm packages
- Use `createClient` from `@/lib/supabase/server` in API routes, `@/lib/supabase/client` in client components
- No TypeScript errors on completion (`npx tsc --noEmit`)

---

## Step 1: Database Migration

Create `supabase/migrations/20260614_chat_v2.sql`:

```sql
-- Pin support on sessions
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES chat_projects(id) ON DELETE SET NULL;

-- Project folders
CREATE TABLE IF NOT EXISTS chat_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#64748B',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own projects"
  ON chat_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users can insert own projects"
  ON chat_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users can update own projects"
  ON chat_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users can delete own projects"
  ON chat_projects FOR DELETE USING (auth.uid() = user_id);
```

**Do not run this migration. Ken runs it manually in Supabase SQL editor.**

---

## Step 2: New and Updated API Routes

### 2a. Update `app/api/chat/advanced/route.ts` — Streaming

The route has two modes controlled by the `stream` field in the request body.

**Classify mode** (no `confirmed`, no `stream`): returns JSON `{ intent, cost, requiresConfirm }`. No change to existing classify logic.

**Stream mode** (`confirmed: true, stream: true`): deduct credits, then return a `ReadableStream` of plain text tokens.

Replace the `executeAdvancedChat` function return for non-creative intents:

```ts
// After credit deduction succeeds:
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
    } catch {
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
```

For `creative` intent: still returns JSON `{ intent: "creative", cost: 2, renderButton: true, content: "..." }` — no streaming needed.

**Beginner data injection**: Before building the prompt, fetch `user_data` for the current user and extract `research_output`, `angles_output`, `selected_angle`, `copy_output`. Append them to `buildPrompt` as a `# SAVED CONTEXT` section when relevant:
- For `angles` intent: append `research_output` if present
- For `copy` intent: append `angles_output` and `selected_angle` if present
- For `analyze_basic` / `analyze_advanced`: no injection
- For `knowledge` / `smalltalk` / `research`: inject all available outputs so the AI can reference them naturally

Format the injection:
```
# SAVED CONTEXT FROM BEGINNER MODE
(only include fields that are non-empty strings)
Research: <research_output>
Angles: <angles_output>
Selected Angle: <selected_angle>
Copy: <copy_output>
```

The AI should use this context when it helps, and ignore it when it doesn't.

### 2b. Project folder API routes

**`app/api/chat/projects/route.ts`**
- `GET` — list all projects for current user, ordered by `created_at ASC`
- `POST` — create project. Body: `{ name: string, color?: string }`. Returns new project row.

**`app/api/chat/projects/[id]/route.ts`**
- `PATCH` — update name or color. Body: `{ name?: string, color?: string }`
- `DELETE` — delete project. Sessions with this `project_id` will have it set to null automatically (ON DELETE SET NULL).

### 2c. Update `app/api/chat/sessions/[id]/route.ts`

Add support for `pinned` and `project_id` in the PATCH body:
```ts
// Add to existing PATCH handler, alongside messages and title:
if (typeof body.pinned === "boolean") patch.pinned = body.pinned;
if ("project_id" in body) patch.project_id = body.project_id ?? null;
```

Update the GET response and list responses to include `pinned` and `project_id` fields.

Update `app/api/chat/sessions/route.ts` GET to include `pinned` and `project_id` in the select and response.

---

## Step 3: Update `app/chat/page.tsx`

### 3a. Remove all chips
Delete the entire chips state, the `chips` useMemo, all `handleChipTap` logic, and every place chips are rendered. Remove `Chip` type. Remove chip-related imports.

Also remove `sessionResearch`, `sessionAngles` local state and their useEffects. The AI reads beginner data from Supabase directly via the API — the chat page does not need to pass it.

Remove from the `useApp()` destructure: `researchOutput`, `setResearchOutput`, `anglesOutput`, `setAnglesOutput`, `setCopyOutput`, `selectedAngle`, `setSelectedAngle`.

### 3b. Streaming client

Add a `streamingText` state (`string`) and `streamingIntent` state (`string`).

Replace `executeAdvancedChat` client function with a streaming version:

```ts
async function streamGeneration(intent: string, cost: number, message: string, images: string[], sessionId: string, title?: string) {
  setLoading(true);
  setStreamingIntent(intent);
  setStreamingText("");

  const res = await fetch("/api/chat/advanced", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, images, confirmed: true, intent, stream: true, sessionState }),
  });

  if (!res.ok || !res.body) {
    await refreshCredits();
    await appendAssistantText("Something went wrong. Please try again.", chatMessages, sessionId);
    setLoading(false);
    return;
  }

  if (res.headers.get("Content-Type")?.includes("application/json")) {
    // creative or error response
    const data = await res.json();
    await handleAssistantResponse(data, chatMessages, sessionId, title);
    setLoading(false);
    return;
  }

  // Stream plain text tokens
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fullText += decoder.decode(value, { stream: true });
    setStreamingText(fullText);
  }

  // Finalize: save complete message to session
  const streamedIntent = res.headers.get("X-Intent") || intent;
  const streamedCost = Number(res.headers.get("X-Cost") || cost);
  const finalMsg: ChatMessage = {
    id: newId(),
    role: "assistant",
    text: fullText,
    card: PAID_CARDS.includes(streamedIntent) ? streamedIntent as ChatMessage["card"] : "text",
    intent: streamedIntent,
    cost: streamedCost > 0 ? streamedCost : undefined,
    createdAt: new Date().toISOString(),
  };

  const updatedMessages = [...chatMessages, finalMsg];
  const newTitle = title || (chatMessages.length === 0 ? autoTitleFromMessage(message) : undefined);
  await saveChatMessages(sessionId, updatedMessages, newTitle);
  await refreshCredits();
  setStreamingText("");
  setStreamingIntent("");
  setLoading(false);
}
```

### 3c. Render streaming message

In the messages list, after all `chatMessages.map(...)`, add:

```tsx
{streamingText && (
  <div className="flex gap-3 justify-start">
    <div className="w-8 h-8 rounded-lg shrink-0 mt-0.5 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1877F2, #D97706)" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </div>
    <div className="flex-1 min-w-0 text-sm leading-relaxed" style={{ color: "#1c1e21" }}>
      {streamingText}
      <span className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-pulse" style={{ background: "#D97706" }} />
    </div>
  </div>
)}
```

### 3d. Rotating loading phrases

Replace the existing loading indicator with intent-aware rotating phrases.

Add a `loadingPhrase` state (`string`) and a `useEffect` that rotates through phrases every 1800ms while `loading` is true:

```ts
const LOADING_PHRASES: Record<string, string[]> = {
  research: ["Pulling market insights...", "Mapping your target audience...", "Analyzing buyer behavior...", "Reading the market..."],
  angles: ["Finding your strongest hook...", "Building the strategy...", "Crafting your ad angles...", "Thinking through the angles..."],
  copy: ["Writing your caption...", "Crafting the hook...", "Building your copy...", "Putting the words together..."],
  analyze_basic: ["Reading your ad data...", "Checking your metrics...", "Reviewing the numbers..."],
  analyze_advanced: ["Auditing your campaign...", "Going deep on the data...", "Breaking down the results..."],
  creative: ["Generating the visual...", "Building your ad creative...", "Designing the layout..."],
  default: ["Working on it...", "Let me think about this...", "On it..."],
};
```

Replace the loading JSX with:
```tsx
{loading && !streamingText && (
  <div className="flex gap-3 justify-start">
    <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1877F2, #D97706)" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </div>
    <p className="text-sm italic pt-2" style={{ color: "#94A3B8" }}>{loadingPhrase}</p>
  </div>
)}
```

### 3e. Remove credit display from top bar

Remove the credits badge from the slim top bar in the chat page entirely. The credit display already lives in the main app sidebar.

### 3f. Update ConversationSidebar

Add these types:
```ts
type ChatProject = {
  id: string;
  name: string;
  color: string;
  created_at: string;
};
```

Add to `ConversationSession` type: `pinned: boolean`, `project_id: string | null`.

**Sidebar layout (top to bottom):**

1. Header (Hilas AI logo + name + New Chat button) — unchanged

2. **Pinned section** (only shown if any session is pinned):
   - Label: "Pinned" in small uppercase grey text
   - List of pinned sessions, same item style as before
   - Unpin button (📌 icon) on hover

3. **Projects section**:
   - Label: "Projects" in small uppercase grey text + "+" button to create new project
   - Each project: folder icon + name, click to expand/collapse
   - Sessions inside the project indented 12px
   - Project hover: rename (pencil icon) + delete (×) buttons
   - When creating: inline input field replacing the project name

4. **Recent section**:
   - Label: "Recent" in small uppercase grey text (only shown if projects or pinned exist)
   - Sessions not pinned and not in any project

**Session item context menu** (on hover, show action buttons):
- Pin icon (📌) — toggle pinned
- Folder icon — show project picker dropdown (list of projects + "No folder" option)
- Delete (×)

All actions call the appropriate API:
- Pin: `PATCH /api/chat/sessions/[id]` with `{ pinned: true/false }`
- Move to project: `PATCH /api/chat/sessions/[id]` with `{ project_id: "id" | null }`
- Create project: `POST /api/chat/projects` with `{ name }`
- Delete project: `DELETE /api/chat/projects/[id]`
- Rename project: `PATCH /api/chat/projects/[id]` with `{ name }`

Fetch projects on mount: `GET /api/chat/projects`

---

## Step 4: Acceptance Checks

1. Sending a free message streams the response token by token — no full-page reload or flash
2. Sending a paid message shows confirm gate, on confirm streams the response
3. Credits deduct correctly after generation completes
4. Rotating loading phrases appear while waiting, matching the intent being processed
5. No chip buttons anywhere in the chat UI
6. Beginner mode outputs (research, angles, selected angle, copy) are injected into the AI prompt when available
7. Credit counter is removed from the chat top bar
8. Pin a session — it appears in Pinned section above Recent
9. Create a project folder — sessions can be moved into it
10. Project folder expands/collapses in sidebar
11. Session context menu shows pin, move to folder, delete on hover
12. `npx tsc --noEmit` passes with no errors
13. No modifications to `/app/api/chat/route.ts` or any beginner module pages
