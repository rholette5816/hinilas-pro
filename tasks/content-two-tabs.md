# Task: Content Creation — Two Tabs (1 Week Captions + 1 Week Scripts)

## Goal
Restructure `app/content/page.tsx` into two top-level tabs:
- **1 Week Captions** — existing 7-caption generation flow
- **1 Week Scripts** — new 7-script generation flow using `MODULE_PROMPTS.contentScript()`

---

## Tab UI

Add two tab buttons at the top of the page content (below FunnelProgress, above everything else):

```
[ 1 Week Captions ]  [ 1 Week Scripts ]
```

Style:
- Active tab: background #1877F2, text white, rounded-lg
- Inactive tab: background #f2f3f5, text #374151, border #E4E6EB, rounded-lg
- Both tabs same width, side by side, full row on mobile

---

## Tab 1: 1 Week Captions

### Description (shown below tabs, above language selector)
```
7 ready-to-post Facebook captions, one per content type. Hook, body, and CTA in your dialect. Copy and post directly.
```
Text style: text-sm text-[#65676B] mb-6

### Content
Everything currently in the page stays here:
- Language selector (8 dialect pills, 4-col grid)
- Generate Content Pack button (7 credits) + Preview Mock Data button
- 7 post cards with caption, copy button, image generator

No changes to existing caption logic.

---

## Tab 2: 1 Week Scripts

### Description (shown below tabs, above language selector)
```
7 talking head video scripts for Reels and Stories. Each script follows the viral formula: Hook, Context, Curiosity Loop, Value, CTA. Read straight to camera.
```
Text style: text-sm text-[#65676B] mb-6

### Content

**Language selector** — same 8 dialect pills, 4-col grid (shared `language` state is fine)

**Hook style selector** — one global selector for all 7 scripts (not per-card):
3 pill buttons: Numerical / Commanding / Here's Why
- Selected: background #1877F2, text white
- Unselected: background #f2f3f5, text #374151, border #E4E6EB
- Label above: "Hook Style" in text-xs font-semibold uppercase tracking-wider text-[#64748B]

**Generate Scripts button:**
- Label: `scriptBatchLoading ? "Writing scripts..." : scriptBatch.length > 0 ? "Regenerate 1 Week Scripts — 7 credits" : "Generate 1 Week Scripts — 7 credits"`
- Style: background #7C3AED, text white, full width, rounded-lg, text-sm font-semibold
- Disabled when scriptBatchLoading is true or credits < 7
- Show Spinner when loading

**No credits warning** — same pattern as caption tab (reuse noCredits state or add scriptNoCredits state)

**Error display** — same pattern as caption tab

**Script cards** (shown after generation, one per POST_TYPE):
- 7 cards in a grid (grid-cols-1 lg:grid-cols-2 gap-4)
- Each card:
  - Header: post type label with color dot (same colors as POST_TYPES array)
  - Script body: `<p className="text-[#1c1e21] text-sm leading-relaxed whitespace-pre-wrap">` showing the script
  - Copy Script button: copies script to clipboard, shows "Copied" for 2 seconds
  - Card style: bg-white border border-slate-200 rounded-xl p-5

---

## Script generation logic

### New state (add to existing state block):
```ts
const [scriptBatch, setScriptBatch] = useState<string[]>([])
const [scriptBatchLoading, setScriptBatchLoading] = useState(false)
const [scriptNoCredits, setScriptNoCredits] = useState(false)
const [scriptError, setScriptError] = useState("")
const [globalHookStyle, setGlobalHookStyle] = useState<HookStyle>("numerical")
const [copiedScriptBatchIndex, setCopiedScriptBatchIndex] = useState<number | null>(null)
```

### New function `generateScriptBatch()`:
- If credits < 7, set scriptNoCredits true and return
- Set scriptBatchLoading true, clear scriptError, scriptNoCredits, scriptBatch
- Loop through all 7 POST_TYPES, for each:
  - If researchOutput exists, use it as caption context
  - Otherwise use a generic context string: `"${setup.businessName} sells ${setup.product} to ${setup.targetAudience}"`
  - Build prompt: `MODULE_PROMPTS.contentScript(context, globalHookStyle, language)`
  - POST to `/api/content-script` with `{ prompt, module: "content-script" }`
  - Collect results into array
- Do all 7 fetches sequentially (for loop, await each)
- On success: setScriptBatch(results), refreshCredits()
- On NO_CREDITS error mid-loop: set scriptNoCredits true, break loop
- On other error: set scriptError message
- Always: setScriptBatchLoading(false)

### Credit cost:
- 7 scripts = 7 credits total (1 per script, deducted per API call in existing `/api/content-script` route)
- The existing route already handles 1 credit per call — no changes needed to the API

---

## Remove from per-card UI in Tab 1 (Captions)
The per-card hook style selector and "Write Script" button that Codex previously added to caption cards should be REMOVED. Script writing now lives entirely in Tab 2.

Clean up from caption cards:
- Remove hook style pills per card
- Remove "Write Script — 1 credit" button per card
- Remove script output section per card
- Keep: caption text, copy button, image generator

---

## State cleanup
Remove these states that were added for per-card scripts (now replaced by batch states):
- `scripts` (Record<number, string>)
- `scriptLoading` (Record<number, boolean>)
- `hookStyles` (Record<number, HookStyle>)
- `scriptExpanded` (Record<number, boolean>)
- `copiedScriptIndex`
- `isOwner` + OWNER_EMAILS import (not needed — API handles auth)
- Remove `import { OWNER_EMAILS } from "@/lib/admin"` and `import { createClient } from "@/lib/supabase/client"` if only used for isOwner check
- Remove `generateScript(postIndex, post)` function

Keep: `HookStyle` type, `HOOK_STYLE_OPTIONS` const, `MODULE_PROMPTS` import (still used for contentScript prompt)

---

## Acceptance checks
- `npm run build` passes with no TypeScript errors
- Tab switching works: clicking each tab shows the correct content
- Caption tab: existing generation flow unchanged
- Scripts tab: generates 7 scripts sequentially, shows in cards
- Hook style is global (one selector for all 7 scripts)
- Copy button works per script card
- Credits deducted correctly (7 total for a full batch)
- No leftover per-card script UI in caption cards
