# Task: Tier-Based Access Gating + Content Creation Page

## Goal

Enforce Lite / Flex / Max tier access across all tool pages and add the Content Creation page (Flex+).

## Context

- `lib/admin.ts` already has `deriveTier(credits)`: Lite < 50, Flex 50–299, Max ≥ 300
- `lib/context.tsx` already has `credits` and `plan` (which comes from `deriveTier`) in `useApp()`
- `components/Sidebar.tsx` already has a nav item for `/content` (Content Creation)
- Owner email `kevinrholette@gmail.com` has unlimited access — never show lock overlays to owner
- `lib/knowledge.ts` has `MODULE_PROMPTS` — add a `content` prompt there

## Tier Access Rules

| Feature | Lite | Flex | Max |
|---|---|---|---|
| Research Department | ✅ | ✅ | ✅ |
| Strategy Department | ✅ | ✅ | ✅ |
| Creative Department (image) | ✅ | ✅ | ✅ |
| Creative Department (video generation) | 🔒 | 🔒 | ✅ |
| Caption Department | ✅ | ✅ | ✅ |
| Campaign Setup (basic steps) | ✅ | ✅ | ✅ |
| Campaign Setup (Conversion Setup section) | 🔒 | 🔒 | ✅ |
| Audit Department (basic audit) | 🔒 | ✅ | ✅ |
| Audit Department (advanced audit) | 🔒 | 🔒 | ✅ |
| Content Creation | 🔒 | ✅ | ✅ |
| Script Writing (inside Content Creation) | 🔒 | 🔒 | ✅ (Coming Soon teaser) |

## Reusable Lock Overlay Component

Create `components/TierLock.tsx`:

```tsx
"use client";
import { useRouter } from "next/navigation";

interface TierLockProps {
  requiredTier: "Flex" | "Max";
  featureName: string;
}

export default function TierLock({ requiredTier, featureName }: TierLockProps) {
  const router = useRouter();
  const label = requiredTier === "Max" ? "Max Plan" : "Flex Plan";
  const color = requiredTier === "Max" ? "#8B5CF6" : "#1877F2";

  return (
    <div
      className="rounded-2xl border p-8 flex flex-col items-center justify-center text-center gap-4"
      style={{ background: "#FFFFFF", borderColor: "#E4E6EB", minHeight: 200 }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
        style={{ background: `${color}15`, border: `1px solid ${color}40` }}
      >
        🔒
      </div>
      <div>
        <p className="font-bold text-[#1c1e21] text-base mb-1">{featureName}</p>
        <p className="text-sm text-[#64748B]">This feature requires {label} or above.</p>
      </div>
      <button
        onClick={() => router.push("/pricing")}
        className="px-5 py-2.5 rounded-lg text-sm font-bold text-white"
        style={{ background: color }}
      >
        Upgrade to {label}
      </button>
    </div>
  );
}
```

## File Changes

---

### 1. `lib/knowledge.ts`

Add a `content` entry to `MODULE_PROMPTS`. The prompt should generate 7 social media posts (Facebook/Instagram) based on the user's business profile. Each post should have:
- `type`: one of "Problem Hook", "Solution Reveal", "Testimonial Story", "Educational", "Urgency Offer", "Transformation", "Behind the Scenes"
- `caption`: the full post caption in the user's chosen language (Bisaya-English mix if Filipino, otherwise English)
- Hook that stops the scroll in the first line
- Ends with a CTA (comment, message, or click)

Format output as a JSON array of 7 objects: `[{ "type": "...", "caption": "..." }, ...]`

Signature: `content: (userCtx: string, researchOutput?: string, language?: string) => string`

---

### 2. `app/analyze/page.tsx`

At the top of the returned JSX (after the `noCredits` overlay, before `<main>`), add:

```tsx
const { plan } = useApp(); // already imported via useApp
```

- If `plan === "Lite"`: render `<TierLock requiredTier="Flex" featureName="Audit Department" />` inside main, replacing the entire page content after the heading section.
- The "Advanced Analysis" button (2 credits) should additionally check `plan !== "Max"` — if not Max, replace button with a `<TierLock requiredTier="Max" featureName="Advanced Audit" />` inline block (not full page).

Import: `import TierLock from "@/components/TierLock";`

---

### 3. `app/creative/page.tsx`

Find the video generation section (likely gated behind a state or tab). Add:

- If `plan === "Lite" || plan === "Flex"`: render `<TierLock requiredTier="Max" featureName="Video Generation" />` in place of the video generation UI.

Import: `import TierLock from "@/components/TierLock";`

---

### 4. `app/campaign-setup/page.tsx`

Find the "Conversion Setup" section (likely a step or tab). Add:

- If `plan === "Lite" || plan === "Flex"`: render `<TierLock requiredTier="Max" featureName="Conversion Setup" />` in place of that section's content.

Import: `import TierLock from "@/components/TierLock";`

---

### 5. `app/content/page.tsx` (NEW FILE)

Full client component. Use pattern from `app/angles/page.tsx` as reference.

```
"use client"

Imports: useState, useRouter, useApp, buildUserContext, MODULE_PROMPTS, HILAS_KNOWLEDGE, AILoadingState, FunnelProgress, TierLock

Page component: ContentPage

- Get { setup, researchOutput, credits, refreshCredits, plan } from useApp()
- If plan === "Lite": return TierLock for whole page (requiredTier="Flex", featureName="Content Creation")

State:
- loading: boolean
- posts: array of { type: string; caption: string }
- noCredits: boolean
- error: string

generateContent():
  1. if credits < 1: setNoCredits(true); return
  2. deduct 1 credit via POST /api/credits/use { amount: 1, description: "Content creation" }
  3. if deduct fails: setNoCredits(true); return
  4. await refreshCredits()
  5. build prompt: MODULE_PROMPTS.content(buildUserContext(setup), researchOutput, setup.language)
  6. call POST /api/chat { prompt, systemPrompt: HILAS_KNOWLEDGE, module: "content" }
  7. parse JSON from response (try/catch; on fail set error message)
  8. setPosts(parsed)

UI layout (same structure as angles page):
- FunnelProgress currentStep={5} (or wherever content fits in the funnel)
- Badge: "Content Department"
- Heading: "Generate Your Content Pack"
- Subtext: "7 ready-to-post captions based on your business and research."
- Generate button (blue, btnGlowBlue): "Generate Content Pack — 1 credit"
- AILoadingState while loading
- When posts loaded: render 7 post cards
  - Each card shows: type badge (color-coded), caption text, copy button
  - Copy button copies caption to clipboard

Script Writing section (ALWAYS shown at bottom after posts, or even before generate if posts are empty):
- If plan === "Max": show "Coming Soon" teaser card (purple, locked icon, text: "Script Writing — Video scripts powered by AI. Coming soon for Max users.")
- If plan === "Flex": show upgrade teaser (same card but with Upgrade to Max button linking to /pricing)

noCredits modal: same pattern as angles page

If !setup: show "Set up your business profile first" with Go to Setup button
```

---

### 6. `components/Sidebar.tsx`

The `/content` nav item is already there. Add tier lock indicator:

In the nav item render loop, for the `/content` item:
- If `plan === "Lite"`: show a small lock icon `🔒` after the label text (or a small badge "Flex+")

No need to block navigation — the page itself handles the lock.

---

## Acceptance Checks

Run these after Codex executes:

1. `grep -r "TierLock" app/ components/` — should appear in analyze, creative, campaign-setup, content pages
2. `grep "content:" lib/knowledge.ts` — MODULE_PROMPTS.content exists
3. `ls app/content/page.tsx` — file exists
4. TypeScript check: `npx tsc --noEmit` should pass with 0 errors
5. Manual verify:
   - Log in as a Lite user (< 50 credits) → Audit page shows full-page lock, /content shows full-page lock
   - Log in as Flex user (50-299 credits) → Audit page works (basic), advanced button shows inline lock, /content works
   - Log in as Max user (300+ credits) → everything unlocked, script writing shows "Coming Soon" teaser
   - Owner (kevinrholette@gmail.com) → no locks anywhere

## Notes

- Owner check: `isOwnerUser` is only available server-side or via email check. In client components, check `plan` from context (owner always has Max or higher credits). If needed, expose `isOwner` from context (it's already computed in Sidebar.tsx).
- Do not add any new API routes. All gating is client-side UI only.
- Do not block page navigation via middleware — only show lock overlays inside the page.
- Script Writing is "Coming Soon" — no backend needed, just a teaser card in the Content Creation page.
