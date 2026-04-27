# Task: image-card-three-big-buttons

## Goal
Replace the image-overlay icon buttons (Regenerate top-left, Download top-right) with three big, clearly-labeled buttons stacked in the card footer when an image is generated: Regenerate, Download, Use for Copy. Empty state and loading state are unchanged.

## Why
Current setup has small icon overlays for Regenerate and Download. Users miss them. Ken wants all three primary actions (Regenerate, Download, Use for Copy) as big obvious labeled buttons in the footer with proper visual hierarchy. Glow stays on Use for Copy as the funnel-forward CTA.

## Files to modify
- `web-hilas/app/creative/page.tsx` - the image card rendering inside the 3-card horizontal gallery (the `[ ... ].map((card, i) => (...))` block in the image tab section).

## Files to create
None.

## Files to delete
None.

## Exact change

### Step 1: Remove both icon overlay buttons from the image area

Find this block (the `card.image` truthy branch, currently around lines 670-688):

```tsx
                    ) : card.image ? (
                      <>
                        <img src={card.image} alt={card.label} className="w-full h-full object-contain bg-black" />
                        <button
                          onClick={card.onGen}
                          disabled={card.loading || card.disabled}
                          title="Regenerate (2 credits)"
                          className="absolute top-2 left-2 bg-black/70 hover:bg-black text-white w-7 h-7 rounded-full flex items-center justify-center text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          ↻
                        </button>
                        <button
                          onClick={card.onDl}
                          title="Download"
                          className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white w-7 h-7 rounded-full flex items-center justify-center text-xs"
                        >
                          ⬇
                        </button>
                      </>
                    ) : (
```

Replace with this (image only, no overlays):

```tsx
                    ) : card.image ? (
                      <img src={card.image} alt={card.label} className="w-full h-full object-contain bg-black" />
                    ) : (
```

### Step 2: Replace the footer conditional with 3 stacked buttons when image exists

Find the footer section (currently around the end of each card map, the `{/* Action button — uniform style, glows when image is ready */}` comment block):

```tsx
                  {/* Action button — uniform style, glows when image is ready */}
                  <div className="p-2 border-t border-gray-700">
                    {card.image && !card.loading ? (
                      <button
                        onClick={card.onUse}
                        className="w-full text-white py-2 rounded-lg text-xs font-bold transition-all hover:scale-[1.02] active:scale-95"
                        style={{ background: "linear-gradient(135deg, #ff6a00, #ee0979)", animation: "btnGlowOrange 2s ease-in-out infinite alternate", boxShadow: "0 0 14px #ff6a0090" }}
                      >
                        🔥 Use for Copy
                      </button>
                    ) : (
                      <button
                        onClick={card.onGen}
                        disabled={card.loading || card.disabled}
                        className="w-full text-white py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: card.loading ? "#4B5563" : "#F5A623" }}
                      >
                        {card.loading ? "Generating..." : "Generate - 2 cr"}
                      </button>
                    )}
                  </div>
```

Replace with this:

```tsx
                  {/* Footer actions - 3 big buttons when image exists, single Generate when empty */}
                  <div className="p-2.5 border-t border-gray-700 flex flex-col gap-2">
                    {card.image && !card.loading ? (
                      <>
                        <button
                          onClick={card.onGen}
                          disabled={card.loading || card.disabled}
                          className="w-full text-white py-3 rounded-lg text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: "#F5A623" }}
                        >
                          ↻ Regenerate - 2 cr
                        </button>
                        <button
                          onClick={card.onDl}
                          className="w-full bg-white text-black py-3 rounded-lg text-sm font-bold transition-opacity hover:opacity-90"
                        >
                          ⬇ Download
                        </button>
                        <button
                          onClick={card.onUse}
                          className="w-full text-white py-3 rounded-lg text-sm font-bold transition-all hover:scale-[1.02] active:scale-95"
                          style={{ background: "linear-gradient(135deg, #ff6a00, #ee0979)", animation: "btnGlowOrange 2s ease-in-out infinite alternate", boxShadow: "0 0 14px #ff6a0090" }}
                        >
                          🔥 Use for Copy
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={card.onGen}
                        disabled={card.loading || card.disabled}
                        className="w-full text-white py-3 rounded-lg text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: card.loading ? "#4B5563" : "#F5A623" }}
                      >
                        {card.loading ? "Generating..." : "Generate - 2 cr"}
                      </button>
                    )}
                  </div>
```

## Constraints
- Inherits from `AGENTS.md`.
- Single file edit only.
- All hyphens in any new strings must be ASCII `-`. NO em dashes anywhere.
- Do NOT change the card array literal at the top of the gallery (`[ { label: "Main", ... }, ... ]`).
- Do NOT change handlers `card.onGen` / `card.onDl` / `card.onUse`.
- Do NOT change the loading state (bouncing dots in image area).
- Do NOT change the empty state placeholder ("Not generated" / "Generate Main first").
- Do NOT change the card width, aspect ratio, header, or any state outside the two replacement blocks.
- Use ONLY the existing `btnGlowOrange` animation. Do not introduce new keyframes.
- Keep the same Unicode glyphs already in use: `↻` for Regenerate, `⬇` for Download, `🔥` for Use for Copy.

## Acceptance criteria
- [ ] `grep -n "↻ Regenerate - 2 cr" web-hilas/app/creative/page.tsx` returns at least one match.
- [ ] `grep -n "⬇ Download" web-hilas/app/creative/page.tsx` returns at least one match.
- [ ] `grep -n "🔥 Use for Copy" web-hilas/app/creative/page.tsx` returns at least one match.
- [ ] `grep -n "absolute top-2 left-2" web-hilas/app/creative/page.tsx` returns nothing (Regenerate icon overlay removed).
- [ ] `grep -n "title=\"Regenerate" web-hilas/app/creative/page.tsx` returns nothing (icon overlay removed).
- [ ] `grep -n "title=\"Download\"" web-hilas/app/creative/page.tsx` returns nothing (icon overlay removed).
- [ ] `grep -n "absolute top-2 right-2" web-hilas/app/creative/page.tsx` returns nothing (Download icon overlay removed).
- [ ] `cd web-hilas && npx tsc --noEmit` passes with no new errors.
- [ ] No em dashes added in modified file.

## Out of scope
- Renaming "Use for Copy" to "Use for Caption" (Ken did not confirm yes/no - keep as-is for now).
- Backend or route changes.
- Sample video preview section in the same page.
- Empty state and loading state visuals.
- Tab switching or any state outside the image card map.

## Notes for Codex
- The image area's `card.image` branch currently uses a `<>` fragment with three children (img + 2 overlay buttons). After the change it should be just `<img />` directly (no fragment needed since only one child).
- The footer's `card.image && !card.loading` branch goes from one button to three buttons wrapped in a `<>` fragment.
- The empty/loading state in the footer is preserved as-is - just the `py-2` becomes `py-3` and `text-xs font-semibold` becomes `text-sm font-bold` for sizing consistency with the new 3-button row.
- All three new buttons use `py-3 text-sm font-bold` for visual consistency.
- The `btnGlowOrange` keyframe is already defined in `app/globals.css`. Do not redefine.
