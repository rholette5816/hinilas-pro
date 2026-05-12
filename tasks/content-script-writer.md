# Task: Content Script Writer

## Goal
Add a talking head script generator to each post card in `/content` page. Each post card already shows a caption. This feature adds a "Write Script" button that generates a 5-part talking head video script based on that post's caption.

## Files to create/modify

### 1. CREATE `app/api/content-script/route.ts`

New API route. Pattern: copy structure from `app/api/content/route.ts`.

- Auth check: require logged-in user
- Owner check: use `isOwnerUser(user)` from `@/lib/admin`
- Credit check (non-owners only): require `credits_remaining >= 1`
- Call Gemini 2.5 Flash (`gemini-2.5-flash`) with the prompt from `MODULE_PROMPTS.contentScript()`
- Credit deduction (non-owners only): deduct 1 credit via `deductCreditsAtomic` with description `"Talking head script generation"`
- Return: `{ script: string, creditsRemaining?: number }`
- Set `export const maxDuration = 60`

Request body fields:
- `prompt` (string) — the full Gemini prompt
- `module` (string) — `"content-script"` for token logging

---

### 2. ADD to `lib/knowledge.ts`

Add a new key `contentScript` to the `MODULE_PROMPTS` object (alongside existing keys like `content`, `copy`, etc.).

```ts
contentScript: (caption: string, hookStyle: "numerical" | "commanding" | "hereswhy", language: string) => `...`
```

Prompt instructions:
- You are a Filipino social media scriptwriter for talking head videos
- Language: write the entire script in ${language} — natural, conversational, how real Filipinos speak it
- Source material: the caption below is the content idea. Use its angle, pain point, and CTA as the basis.
- Hook style:
  - numerical: start with a number ("3 reasons bakit...", "2 things na hindi mo alam...")
  - commanding: start with a direct command ("Tigilan mo na ito.", "Gawin mo ito ngayon.")
  - hereswhy: start with "Here's why..." or "Eto ang dahilan kung bakit..."
- Formula — output exactly these 5 labeled parts, nothing else:

**[HOOK]**
One punchy opening line matching the selected hook style. Must stop the scroll in the first 2 seconds.

**[CONTEXT]**
2-3 sentences. Set up the problem or situation. Make them feel seen.

**[CURIOSITY LOOP]**
1-2 sentences. Tease what's coming. Make them want to keep watching. ("And here's the part most people miss...", "Pero eto ang hindi sinasabi ng iba...")

**[VALUE]**
3-5 sentences. Deliver the actual insight, tip, or offer. This is the meat. Be specific, not generic.

**[CTA]**
1 sentence. Tell them exactly what to do. ("Comment 'INFO' sa baba.", "I-follow para sa part 2.", "DM mo ko ng 'READY'.")

Rules:
- No hashtags
- No em dashes
- Write in ${language} throughout
- Keep it under 90 seconds when spoken aloud (roughly 200-250 words total)
- Return ONLY the 5 labeled sections, no intro, no explanation

CAPTION SOURCE:
${caption}

---

### 3. MODIFY `app/content/page.tsx`

#### A. Add state per post card for script
Add state: `const [scripts, setScripts] = useState<Record<number, string>>({})` 
Add state: `const [scriptLoading, setScriptLoading] = useState<Record<number, boolean>>({})`
Add state: `const [hookStyles, setHookStyles] = useState<Record<number, "numerical" | "commanding" | "hereswhy">>({})` 
Add state: `const [scriptExpanded, setScriptExpanded] = useState<Record<number, boolean>>({})`

#### B. Add `generateScript(postIndex, post)` function
- If credits < 1, set noCredits true and return
- Set scriptLoading[postIndex] = true
- Build prompt via `MODULE_PROMPTS.contentScript(post.caption, hookStyle, post.language)`
- POST to `/api/content-script` with `{ prompt, module: "content-script" }`
- On success: set `scripts[postIndex]` = response script, set `scriptExpanded[postIndex]` = true
- On NO_CREDITS error: set noCredits = true
- Always: set scriptLoading[postIndex] = false, call refreshCredits()

#### C. Add UI inside each post card (after the caption `<p>`, before the image section)

**Hook style selector** (3 pill buttons, shown always):
```
[Numerical]  [Commanding]  [Here's Why]
```
- Default selected: "numerical" for that card index
- Selected style: background #1877F2, text white
- Unselected: background #f2f3f5, text #374151, border #E4E6EB

**Write Script button** (below hook style pills):
- Label: `scriptLoading[index] ? "Writing script..." : scripts[index] ? "Rewrite Script — 1 credit" : "Write Script — 1 credit"`
- Disabled when scriptLoading[index] is true
- Style: background #7C3AED, text white, full width, rounded-lg, text-sm font-semibold
- Show a simple spinner (reuse existing Spinner component) when loading

**Script output** (shown only when scripts[index] exists, collapsible):
- Toggle button: "Hide Script" / "Show Script" (small, gray text link style)
- When expanded: show the script text in a `<pre>` or `<p className="whitespace-pre-wrap">` inside a light gray rounded box
- Background: #F8FAFC, border: 1px solid #E2E8F0, rounded-xl, p-4
- Text: text-sm text-[#1c1e21] leading-relaxed
- Copy Script button at the bottom of the script box: copies scripts[index] to clipboard

---

## Acceptance checks
- `npm run build` passes with no errors
- No TypeScript errors
- Button shows on every post card
- Hook style selection is per-card (not global)
- Script output is collapsible
- Credits deducted correctly (check via Supabase or credit counter in UI)
- Owner account (kevinrholette@gmail.com) is exempt from credit deduction
