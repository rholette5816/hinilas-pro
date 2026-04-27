# Task: loading-states-and-completion

## Goal
Add cool rotating loading screens with time estimates to Research and Angles, extend the FunnelProgress bar to Creative, Copy, and Campaign Setup pages, and add a "you're on fire" celebration effect when users complete their final step (Copy). All UI must be fully responsive on mobile and desktop.

## Why
Users are dropping off because:
1. They click "Generate" and see a basic spinner with no time expectation, so they assume the app is broken or slow.
2. Pages 4, 5, and the post-funnel Campaign Setup page have no progress bar, so users lose context of where they are in the journey.
3. Reaching the end of the funnel feels anticlimactic. A celebration effect rewards completion and builds momentum to launch.

## Files to create
- `components/AILoadingState.tsx` — reusable loading screen for AI generation steps.
  - Exports default `AILoadingState`.
  - Props: `{ messages: string[]; estimatedTime: string; icon?: string }`.
  - Behavior:
    - Cycles through `messages` array every 2.5 seconds (loop back to first when done).
    - Shows current message with smooth fade-in/out transition.
    - Top banner shows `estimatedTime` text with a clock SVG.
    - Center: large pulsing icon (default `🔍`, override via `icon` prop).
    - Below message: animated progress bar (indeterminate, brand orange `#F5A623`, looping shimmer).
  - Layout: centered vertically and horizontally, padding `py-12`, full width.
  - Responsive: text sizes scale down on mobile (`text-sm md:text-base` for messages, `text-xs md:text-sm` for banner).
  - No external dependencies. Use CSS keyframes inline or in `globals.css` if needed (prefer inline `<style>` in component).

- `components/FireCelebration.tsx` — celebration effect for the final step.
  - Exports default `FireCelebration`.
  - Props: `{ show: boolean }`.
  - Behavior: when `show` is true, render an animated banner with:
    - 🔥 fire emoji that pulses/scales
    - Heading: "You're on fire!" (text-white font-black text-xl md:text-2xl)
    - Subtitle: "Your campaign assets are ready. One more step to launch." (text-xs md:text-sm text-gray-400)
    - Background: gradient from `rgba(245,166,35,0.15)` to `rgba(239,68,68,0.15)` with orange/red border glow.
    - 3-4 small floating fire particles (CSS-only animations, position absolute, randomized delays).
    - Glowing border animation that pulses every 2 seconds.
    - CTA button: "Launch Your Campaign →" routing to `/campaign-setup`. Brand red `#EF4444`, full width on mobile, auto width on desktop, bold text.
  - Container: rounded-2xl, padding `p-5 md:p-8`, full width, `mt-6`.
  - Responsive: stacks vertically on mobile, allows horizontal layout option on desktop if it fits naturally.

## Files to modify
- `app/research/page.tsx`
  - Replace the existing `<AIOutput content={researchOutput} loading={loading} loadingText="Analyzing your market..." />` so that when `loading` is true, render `<AILoadingState />` INSTEAD of the AIOutput's built-in loading state. When not loading, render `<AIOutput />` as normal with the output.
  - Pass these props to `AILoadingState`:
    - `messages={["🔍 Diving into your market...", "Studying your competitors and what they're missing...", "Mapping your customer's pain points...", "Spotting buying triggers in your niche...", "Almost there. Polishing the insights..."]}`
    - `estimatedTime="This usually takes 2-3 minutes. Good research can't be rushed."`
    - `icon="🔍"`

- `app/angles/page.tsx`
  - Same pattern: when angles is generating/loading, render `<AILoadingState />`.
  - Props:
    - `messages={["🎯 Studying your market data...", "Crafting hooks that convert...", "Testing angle variations...", "Finalizing your winning angles..."]}`
    - `estimatedTime="This takes about 1-2 minutes. Sit tight."`
    - `icon="🎯"`

- `app/creative/page.tsx`
  - Add `import FunnelProgress from "@/components/FunnelProgress";` at the top.
  - Render `<FunnelProgress currentStep={4} />` at the top of the main content area, above the existing header.
  - When the AI is generating an image and `loading` (or equivalent state) is true, render `<AILoadingState />`:
    - `messages={["🎨 Sketching your concept...", "Mixing colors and composition...", "Refining details...", "Polishing the final image..."]}`
    - `estimatedTime="This takes about 30-60 seconds."`
    - `icon="🎨"`
  - Match the FunnelProgress placement pattern from `app/research/page.tsx` and `app/angles/page.tsx`.

- `app/copy/page.tsx`
  - Add `import FunnelProgress from "@/components/FunnelProgress";` and `import FireCelebration from "@/components/FireCelebration";`.
  - Render `<FunnelProgress currentStep={5} />` at the top of the main content area.
  - When AI is generating copy/captions and `loading` is true, render `<AILoadingState />`:
    - `messages={["✍️ Studying your angle and image...", "Drafting hooks that grab attention...", "Sharpening your CTA...", "Polishing every line..."]}`
    - `estimatedTime="This takes about 30-60 seconds."`
    - `icon="✍️"`
  - After copy successfully generates (when there is output and not loading), render `<FireCelebration show={true} />` ABOVE the AIOutput.
  - The FireCelebration only shows once copy output is present. If the user re-generates and is loading, hide it again.

- `app/campaign-setup/page.tsx`
  - Add `import FunnelProgress from "@/components/FunnelProgress";`.
  - Render `<FunnelProgress currentStep={5} />` at the top of the main content area.
  - Important: pass `currentStep={5}` so all 5 steps appear as completed (since this page is post-funnel). The FunnelProgress component already styles steps with stepNumber < currentStep as completed. So with currentStep={5}, steps 1-4 are completed (blue check) and step 5 is active (orange).
  - To make this look more like "all complete + ready to launch", ALSO render a small badge below the progress bar:
    - `<div className="mb-6 flex items-center justify-center gap-2 text-xs md:text-sm font-semibold" style={{ color: "#22c55e" }}><span>✓</span><span>All steps complete — Ready to launch your campaign</span></div>`

- `components/FunnelProgress.tsx`
  - Improve mobile responsiveness:
    - On screens smaller than `md`, reduce circle size to `h-7 w-7 text-xs` and reduce gap between steps. Currently it uses `h-9 w-9 text-sm`.
    - Hide connector lines on mobile if they cause cramping. Replace with thinner connectors (`h-px` already, but ensure they don't break flow).
    - Active step's label is shown on mobile; ensure label text wraps correctly (`break-words`, `max-w-[80px]` if needed).
  - Do NOT change the desktop appearance.

## Constraints
- Inherits from `AGENTS.md`.
- No em dashes anywhere. Use hyphens or rewrite the sentence.
- Use existing brand colors only: `#2B7EC9` (blue), `#F5A623` (orange), `#EF4444` (red), `#22c55e` (green), `#0B1120` (bg), `#0F172A` (card), `#1E2D45` (border).
- No new dependencies. No new env vars. No DB migrations.
- All animations: CSS only (keyframes, transitions). No `framer-motion`, no JS animation libraries.
- Loading messages must rotate via `useEffect` + `setInterval`, cleaned up on unmount.
- Do not modify any AI prompt, credit deduction, or routing logic.
- Mobile-first: every new component must work cleanly down to 360px width.
- Test mental model: page should not horizontally scroll on mobile. All buttons reachable. Text legible.

## Reference patterns
- Component structure: `components/FunnelProgress.tsx`
- Glow animation pattern: `app/globals.css` (`@keyframes btnGlowBlue` / `@keyframes btnGlowOrange`)
- Existing button styles: `app/research/page.tsx` action buttons.

## Acceptance criteria
- [ ] `components/AILoadingState.tsx` exists, accepts `messages`, `estimatedTime`, optional `icon` props.
- [ ] `components/FireCelebration.tsx` exists, accepts `show` prop.
- [ ] Research page shows AILoadingState while generating, with 5 rotating messages.
- [ ] Angles page shows AILoadingState while generating, with 4 rotating messages.
- [ ] Creative page has FunnelProgress at top with step 4 active and AILoadingState while generating.
- [ ] Copy page has FunnelProgress at top with step 5 active, AILoadingState while generating, and FireCelebration after output.
- [ ] Campaign Setup page has FunnelProgress (currentStep=5) and "All steps complete" badge below it.
- [ ] FunnelProgress has improved mobile sizing (smaller circles on mobile).
- [ ] FireCelebration has animated fire particles, pulsing glow, and a "Launch Your Campaign" CTA routing to `/campaign-setup`.
- [ ] No horizontal scroll on mobile (test at 360px width mentally).
- [ ] `npx tsc --noEmit` passes.
- [ ] No em dashes in modified files: `grep -n "[—–]" app/research/page.tsx app/angles/page.tsx app/creative/page.tsx app/copy/page.tsx app/campaign-setup/page.tsx components/AILoadingState.tsx components/FireCelebration.tsx components/FunnelProgress.tsx` returns nothing.
- [ ] No new npm dependencies added.

## Out of scope
- Changes to Setup, Analyze, Pricing, Home, Privacy, Terms, Testimonial pages.
- Reward/credit system changes.
- AI prompt changes.
- Reordering of steps.
- Adding sound effects or video.

## Notes for Codex
- The FunnelProgress label "Write your ad copy" matches step 5. Campaign Setup is intentionally NOT a 6th step — instead, we use the "All steps complete" badge to show users they've finished the funnel and are now in launch mode.
- The fire celebration is the emotional payoff. Make it feel earned. Don't go overboard with animation though — it should feel premium, not cheesy. Subtle pulsing fire emoji + glowing border + a few floating particles is enough.
- The loading state's rotating messages are the most important UX win. Users currently see a static "Analyzing..." and assume things are stuck. The rotation reassures them work is happening.
- All responsive breakpoints should use Tailwind's `md:` (768px). Smaller than that = mobile.
