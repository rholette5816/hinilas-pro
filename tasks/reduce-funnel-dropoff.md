# Task: reduce-funnel-dropoff

## Goal
Add a 5-step progress indicator to the Research and Angles pages, plus pre-action expectation cards and stronger post-action CTAs, to reduce the 47% drop-off at Research and 70% drop-off at Angles.

## Why
Live Supabase data shows: 51 users start Research, 27 reach Angles, 8 reach Copy, 15 reach Creative. Users get stuck because they don't know what they're getting from each step or what comes next. Adding a visible progress bar, a "what you'll get" preview, and a clear next-step banner reduces hesitation and guides the user forward.

## Files to create
- `components/FunnelProgress.tsx` — reusable progress bar component.
  - Exports default `FunnelProgress`.
  - Props: `{ currentStep: 1 | 2 | 3 | 4 | 5 }`.
  - 5 steps with these exact labels (in order):
    1. "Tell us about you"
    2. "Know your market"
    3. "Find your angle"
    4. "Make your ad image"
    5. "Write your ad copy"
  - Visual: horizontal bar, steps shown as numbered circles connected by thin lines.
  - Completed steps (number < currentStep): brand blue (`#2B7EC9`) circle with white checkmark.
  - Active step (number === currentStep): brand orange (`#F5A623`) filled circle with white step number, slight glow.
  - Upcoming steps (number > currentStep): muted gray (`#1E2D45`) circle with `#475569` text.
  - Step label below each circle: white if completed/active, `#475569` if upcoming. Use `text-[10px] font-semibold` for labels.
  - On mobile (< md): show only step numbers + active step's label, hide other labels.
  - Container: full width, `mb-6` bottom margin, no border or background.

## Files to modify
- `app/research/page.tsx`
  - Import and render `<FunnelProgress currentStep={2} />` at the very top of the main content area (above the existing header `<div className="mb-8">`).
  - Add a "What you'll get" preview card BETWEEN the Business summary card and the action buttons (so it shows before the user clicks the button, but disappears once `researchOutput` is truthy).
    - Style: rounded-xl, `background: "#0F172A"`, `border: "1px solid #1E2D45"`, padding `p-4 mb-6`.
    - Heading: "What you'll get" (text-white font-semibold text-sm mb-3).
    - 4 bullet points (use checkmark SVG or `✓` in brand blue):
      - "Who your customer really is"
      - "What stops them from buying"
      - "What competitors are missing"
      - "What makes people buy now"
    - Bullet text: `text-xs` `text-gray-400`, bullets `text-blue-400`.
    - Conditional: only render when `!researchOutput`.
  - After the existing `<AIOutput />`, add a success banner that shows when `researchOutput && !loading`:
    - Banner above/replacing the current secondary "Next: Find Angles" button.
    - Style: rounded-2xl, `background: "rgba(43,126,201,0.08)"`, `border: "1px solid rgba(43,126,201,0.3)"`, `p-6 mt-6`.
    - Content: small green check + "Step 2 done — Now let's find your angle" (white font-semibold).
    - Below: subtitle "Use these insights to craft angles that convert." (`text-xs text-gray-400`).
    - Big primary CTA button: "Next: Find Your Angle →", brand orange `#F5A623`, full width, `py-3.5`, `font-bold`, `text-sm`, `text-black`. Routes to `/angles`.
  - Remove the existing secondary "Next: Find Angles →" button from the action button row. Keep the "Run Research" / "Re-run Research" button as is.

- `app/angles/page.tsx`
  - Import and render `<FunnelProgress currentStep={3} />` at the very top of the main content area, same placement pattern as Research.
  - Find the section that renders after angles output is shown. Add a banner above the angles output (or above the existing select-angle UI) that says: "Pick the angle that feels right. We'll use it for your image and copy." — `text-sm text-white font-semibold`, with subtitle in `text-xs text-gray-400`.
  - After an angle is selected (whatever existing state tracks `selectedAngle`), show a strong CTA button: "Next: Make Your Ad Image →" routing to `/creative`. Brand orange, full width, glowing animation matching existing pattern (`animation: "btnGlowOrange 2s ease-in-out infinite alternate"`).
  - Do NOT change the angle selection logic, only enhance the post-selection CTA.

## Constraints
- Inherits from `AGENTS.md`.
- No em dashes anywhere.
- Use existing brand colors only: `#2B7EC9` (blue), `#F5A623` (orange), `#0B1120` (bg), `#0F172A` (card), `#1E2D45` (border), `#475569` / `#94A3B8` / `#64748B` (gray text).
- No new dependencies. No new env vars. No DB migrations.
- Do not modify the credit deduction logic, AI prompt, or routing flow.
- Do not change the order of steps. Setup → Research → Angles → Creative → Copy is fixed.
- Do not touch `/copy`, `/creative`, `/`, or any unrelated page.

## Reference patterns
- Component file structure: `components/HinilasLogo.tsx`
- Existing button glow: `app/research/page.tsx` line ~101 (`btnGlowBlue` / `btnGlowOrange`).
- Card styling: `app/research/page.tsx` line ~89 (Business summary card).

## Acceptance criteria
- [ ] `components/FunnelProgress.tsx` exists, exports default `FunnelProgress`, accepts `currentStep` prop typed as `1 | 2 | 3 | 4 | 5`.
- [ ] `/research` page shows the progress bar with step 2 highlighted as active (orange) and step 1 as completed (blue with check).
- [ ] `/research` page shows the "What you'll get" preview card with 4 bullets, only when there is no research output.
- [ ] After clicking Run Research and output appears, the success banner with "Next: Find Your Angle" CTA shows below the output.
- [ ] The old small secondary "Next: Find Angles →" button is removed from the action row.
- [ ] `/angles` page shows the progress bar with step 3 active and steps 1, 2 completed.
- [ ] `/angles` page shows the "Pick the angle that feels right" banner.
- [ ] `npx tsc --noEmit` passes.
- [ ] No console errors in browser.
- [ ] No em dash characters in any modified file: run `grep -n "[—–]" app/research/page.tsx app/angles/page.tsx components/FunnelProgress.tsx` returns nothing.

## Out of scope
- Reward system changes, leaderboard updates, referral integration.
- Step completion toasts.
- Reordering of pipeline steps.
- Changes to Setup, Copy, Creative, Campaign Setup, Analyze pages.
- Mobile-specific redesigns beyond what's specified for the progress bar.

## Notes for Codex
- The progress bar is rendered on every step page. For now we only add it to Research and Angles. Other pages can be added in a future task.
- "Make your ad image" comes BEFORE "Write your ad copy" in the labels, even though both are part of the campaign deliverable. This matches the existing pipeline order — Creative is generated first because the copy step uses image context.
- The "Find Your Angle" CTA button is the primary call-to-action, not just a secondary button. Make it visually prominent — the whole point is to reduce drop-off here.
