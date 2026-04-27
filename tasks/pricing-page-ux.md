# Task: pricing-page-ux

## Goal
Three pricing page UX fixes in one task:
1. Sync the Lite credit copy with reality (15 + 15 drip = 30 total, not "20 one-time").
2. Drop the "5 only" image generation cap on Lite - let credits do the work.
3. Replace the single ₱249/50 top-up button with three tiered options: Small (₱99/25), Medium (₱179/50), Large (₱299/100).
4. Update the header copy to reflect the new 30-day tier lock model.

## Why
- Pricing page currently says "20 one-time credits" but the auth callback grants 30. Tier-lock and drip tasks ship the truth: 15 on signup + 15 after first generation = 30 total, with a 30-day tier lock on Flex/Max purchases.
- The "5 only" image gen cap on Lite is redundant noise (20-30 credits already cap images at 10 max naturally). Drop it.
- Top-ups are stuck at ₱249/50 (₱4.98/cr) - too steep with no smaller or better-value option. Tiered top-ups give users a small impulse-buy option (₱99) and a smart-value option (₱299/100 at ₱2.99/cr) without cannibalizing Flex.
- Header copy "tier unlocks automatically based on credits" is now wrong - tier locks for 30 days from Flex/Max purchase.

## DEPENDENCIES
This task assumes BOTH `tier-lock-30-days.md` and `free-tier-credit-drip.md` have already shipped. The pricing copy describes their behavior. Run those two specs first, ship them, then run this one.

## Files to modify
- `web-hilas/app/pricing/page.tsx` - the pricing page UI. Multiple targeted edits described below.

## Files to create
None.

## Files to delete
None.

## Exact changes

### Change 1: Lite tier credit copy

Find this block in `plans` array (currently around lines 56-65):

```ts
    {
      key: "lite",
      name: "Lite",
      tagline: "Get started for free",
      price: "Free",
      credits: "20 one-time credits",
      threshold: "0 - 49 credits",
      color: "#9CA3AF",
      nextAt: `${49 - credits > 0 ? 49 - credits + " more credits" : ""}`,
    },
```

Replace with:

```ts
    {
      key: "lite",
      name: "Lite",
      tagline: "Get started for free",
      price: "Free",
      credits: "30 free credits (15 + 15 after first action)",
      threshold: "0 - 49 credits",
      color: "#9CA3AF",
      nextAt: `${49 - credits > 0 ? 49 - credits + " more credits" : ""}`,
    },
```

### Change 2: Drop "5 only" image gen cap

Find this line in the `FEATURES` array (currently around line 21):

```ts
      { label: "Ad Image Generation", lite: "5 only", flex: true, max: true },
```

Replace with:

```ts
      { label: "Ad Image Generation", lite: true, flex: true, max: true },
```

### Change 3: Header copy update

Find this line (currently around line 98):

```ts
            <p className="text-gray-400 text-sm">Buy credits once - they never expire. Your tier unlocks automatically based on your <span className="text-white font-medium">credits remaining</span>.</p>
```

(It may use an em dash in the live file - if so, use that as the search anchor and replace including the dash.)

Replace with:

```ts
            <p className="text-gray-400 text-sm">Buy credits once. Flex and Max <span className="text-white font-medium">lock your tier for 30 days</span>. After that, tier auto-adjusts based on credits remaining.</p>
```

### Change 4: Replace the single top-up section with three tiered options

Find the top-up section block (currently around lines 281-300, the section that contains "Need more credits?" and the single ₱249/50 button). The exact lines may have shifted but the markers are the heading text "Need more credits?" and the `onClick={() => setGcash({ label: "Top-Up", credits: 50, price: 249, color: BRAND_BLUE })}` button.

Replace the entire "Need more credits?" card (everything from the wrapper `<div>` that contains the heading down to its closing `</div>`) with this:

```tsx
          {/* Top-up tiers */}
          <div className="mt-8 mb-12">
            <div className="mb-4">
              <h3 className="text-white font-bold text-lg mb-1">Need more credits?</h3>
              <p className="text-gray-400 text-sm">Top-up credits never expire. They do not lock a tier - your plan stays as it is.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Small", credits: 25, price: 99, perCredit: "P3.96/cr" },
                { label: "Medium", credits: 50, price: 179, perCredit: "P3.58/cr" },
                { label: "Large", credits: 100, price: 299, perCredit: "P2.99/cr", best: true },
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setGcash({ label: `Top-Up ${opt.label}`, credits: opt.credits, price: opt.price, color: BRAND_BLUE })}
                  className="relative bg-gray-900 border border-gray-700 hover:border-blue-500 rounded-xl p-4 text-left transition-colors"
                >
                  {opt.best && (
                    <span className="absolute -top-2 right-3 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
                      Best value
                    </span>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: BRAND_BLUE }}>{opt.label}</p>
                  <p className="text-white font-bold text-2xl mb-0.5">{opt.credits} <span className="text-sm font-medium text-gray-400">credits</span></p>
                  <p className="text-gray-300 text-sm font-semibold mb-1">P{opt.price}</p>
                  <p className="text-gray-500 text-xs">{opt.perCredit} - never expires</p>
                </button>
              ))}
            </div>
          </div>
```

## Constraints
- Inherits from `AGENTS.md`.
- All hyphens in new strings must be ASCII `-`. NO em dashes anywhere in the new content.
- Use the literal letter `P` followed by the number for peso amounts in display strings (e.g., `P99`, `P3.96/cr`). The Philippine peso glyph rendering can be inconsistent across fonts; the live page already mixes both. Use `P` in the new top-up copy to keep diff clean. Existing peso glyphs elsewhere in the file stay as-is.
- Do NOT modify the `plans` array beyond Change 1 (Lite credits string).
- Do NOT modify the `FEATURES` array beyond Change 2 (Ad Image Generation row).
- Do NOT change the GCashModal props contract or import.
- Do NOT touch the Lite/Flex/Max card rendering, button labels, or any logic outside the four changes above.

## Acceptance criteria
- [ ] `grep -n "30 free credits" web-hilas/app/pricing/page.tsx` returns at least one match.
- [ ] `grep -n "20 one-time credits" web-hilas/app/pricing/page.tsx` returns nothing.
- [ ] `grep -n "5 only" web-hilas/app/pricing/page.tsx` returns nothing.
- [ ] `grep -n "lock your tier for 30 days" web-hilas/app/pricing/page.tsx` returns at least one match.
- [ ] `grep -n "Best value" web-hilas/app/pricing/page.tsx` returns at least one match (Large top-up badge).
- [ ] `grep -n "Top-Up Small\|Top-Up Medium\|Top-Up Large" web-hilas/app/pricing/page.tsx` returns 3 matches (one per tier).
- [ ] `cd web-hilas && npx tsc --noEmit` passes with no new errors.
- [ ] No em dashes added anywhere in modified file.

## Out of scope
- Tier lock backend logic (separate task: tier-lock-30-days).
- Free tier drip backend logic (separate task: free-tier-credit-drip).
- GCashModal component internals.
- Sidebar tier countdown UI.
- Max tier exclusive value (Ken's monthly review, DFY drop) - separate planning needed.

## Notes for Codex
- The pricing page is a single client component. All edits happen in `web-hilas/app/pricing/page.tsx`.
- Read the file first to find exact current line numbers for each change. The line numbers in this spec are approximate and may have drifted.
- The top-up tier card uses `onClick={() => setGcash(...)}` which already exists for the original ₱249 button - the GCashModal supports variable `credits` and `price` props. No GCashModal changes needed.
- If the existing peso glyph in the file is used and renders correctly, you may keep it. The `P` letter substitute in the spec is a safety fallback. Match whatever the rest of the file uses.
- Three top-up tiers replace ONE card. Make sure you don't leave the old single-button card behind.
