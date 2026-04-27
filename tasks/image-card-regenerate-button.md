# Task: image-card-regenerate-button

## Goal
Add a Regenerate icon button to each generated image card in the creative page so users can re-roll an image after generation without losing the "Use for Copy" CTA.

## Why
Today, once a Main / Variation 1 / Variation 2 image is generated, the card footer button switches from "Generate - 2 cr" to "🔥 Use for Copy". There is no way to regenerate the image without first using it for copy. After Ken changes angles or wants a different rendering, he is stuck with the existing image. We need a Regenerate path that lives on every generated card and is clearly distinct from Download and Use for Copy.

## Files to modify
- `web-hilas/app/creative/page.tsx` - the image card rendering inside the 3-card horizontal gallery (the `[ ... ].map((card, i) => (...))` block in the image tab section).

## Files to create
None.

## Files to delete
None.

## Exact change

Find the image area block inside the card JSX. It currently looks like this (the `card.image` truthy branch with the Download button overlay):

```tsx
                    ) : card.image ? (
                      <>
                        <img src={card.image} alt={card.label} className="w-full h-full object-contain bg-black" />
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

Replace that whole `card.image ?` truthy branch with this (adds a Regenerate icon button on the top-left of the image):

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

## Constraints
- Inherits from `AGENTS.md`.
- Single file edit.
- All hyphens in any new strings must be ASCII `-`. NO em dashes.
- Do NOT change the footer button logic (`Use for Copy` / `Generate - 2 cr` switch).
- Do NOT change the bouncing dots loading state.
- Do NOT change any `card.onGen` / `card.onDl` / `card.onUse` mappings in the array literal at the top of the gallery.
- The Regenerate button MUST call `card.onGen` (same handler used by the empty-state Generate button). It will trigger the same paid regeneration path - 2 credits - which is correct.
- Place the Regenerate icon at `top-2 left-2`. Place the Download icon at `top-2 right-2`. Both styled identically (black/70 background, 28x28 round, white text).
- Use `↻` (Unicode `↻` clockwise open circle arrow) as the Regenerate glyph. Do not import an icon library.

## Acceptance criteria
- [ ] `grep -n "title=\"Regenerate" web-hilas/app/creative/page.tsx` returns exactly one match.
- [ ] `grep -n "title=\"Download\"" web-hilas/app/creative/page.tsx` still returns one match (existing Download button preserved).
- [ ] `grep -n "↻" web-hilas/app/creative/page.tsx` returns at least one match.
- [ ] `cd web-hilas && npx tsc --noEmit` passes with no new errors.
- [ ] No em dashes added in modified file.

## Out of scope
- Backend image route changes (none needed - regenerate uses existing onGen handler).
- Changes to Generate or Use for Copy buttons.
- Confirmation modal before regeneration (not requested - users see the credit balance and the title tooltip warns "2 credits").
- Animation or hover effects beyond what's already specified.

## Notes for Codex
- The card array inside the gallery already wires `onGen: generateMain` for Main and `onGen: () => generateIteration(0/1)` for the variations. The Regenerate button just needs to call `card.onGen`.
- The Variation cards have `disabled: !mainImage`. Since variations only render when `card.image` is truthy (i.e., already generated, which means Main also exists), the disabled state will rarely fire - but include the `disabled={card.loading || card.disabled}` guard for safety in case state ordering ever changes.
- The empty-state placeholder ("Not generated" / "Generate Main first") and bouncing dots loading state are unchanged. Only the `card.image` truthy branch gets the new button.
