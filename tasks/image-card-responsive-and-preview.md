# Task: image-card-responsive-and-preview

## Goal
Three UI improvements to the image card gallery on the creative page:
1. Remove the small ratio labels (e.g. "1:1 Feed", "9:16 Story", "1.91:1 Landscape") under each card title.
2. Make the 3-card row stack vertically on mobile and sit horizontally on desktop, with button text never wrapping.
3. Add a click-to-enlarge preview modal: clicking a generated image opens it at full size in a dark overlay.

## Why
- Ratio labels are visual noise. Users do not need to see "9:16 Story" - they care about the content of the variation, not its dimensions.
- On phone screens the 3 cards squeeze into ~100px each so button labels get cramped or wrap unprofessionally. Should stack on mobile.
- The image area is small (about 1/3 viewport on desktop, smaller on mobile). Users want to see their generated ad clearly. A click-to-enlarge modal solves this without changing the gallery layout.

## Files to modify
- `web-hilas/app/creative/page.tsx` - the image card rendering inside the 3-card horizontal gallery (the `[ ... ].map((card, i) => (...))` block in the image tab section), plus a new preview modal at the end of the tab.

## Files to create
None.

## Files to delete
None.

## Exact changes

### Change 1: Remove ratio labels from card array

Find the array literal at the start of the gallery (currently has objects with `label`, `ratio`, `emoji`, `image`, ... fields). The objects look like this:

```ts
                { label: "Main", ratio: "1:1 Feed", emoji: "🎨", image: mainImage, ... },
                { label: "Variation 1", ratio: "9:16 Story", emoji: "📱", image: iterations[0], ... },
                { label: "Variation 2", ratio: "1.91:1 Landscape", emoji: "🖼️", image: iterations[1], ... },
```

Remove the `ratio` field from each of the 3 objects. Keep all other fields.

Also remove the line in the card header that renders the ratio:

```tsx
                    <p className="text-gray-500 text-[10px] leading-tight">{card.ratio}</p>
```

Delete that whole `<p>` line. Keep the `{card.label}` line.

### Change 2: Mobile-responsive card layout + nowrap buttons

Find the gallery container. It currently looks like:

```tsx
            <div className="flex gap-3">
              {[...].map((card, i) => (
                <div key={i} className="flex-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex flex-col">
```

Replace those two lines with:

```tsx
            <div className="flex flex-col md:flex-row gap-3">
              {[...].map((card, i) => (
                <div key={i} className="w-full md:flex-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex flex-col">
```

(The `[...].map(...)` part is symbolic - keep the actual array literal contents.)

Also, on EACH of the three big footer buttons (Regenerate, Download, Use for Copy) AND on the empty-state Generate button, add `whitespace-nowrap` to the className list so labels never break to a second line.

For example, this:

```tsx
                          className="w-full text-white py-3 rounded-lg text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
```

becomes:

```tsx
                          className="w-full whitespace-nowrap text-white py-3 rounded-lg text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
```

Apply `whitespace-nowrap` to all four button classNames in this section (Regenerate gold, Download white, Use for Copy gradient, and the empty-state Generate button).

### Change 3: Click-to-enlarge preview modal

#### 3a. Add new state at the top of the component (near the other useState calls):

```tsx
  const [previewImage, setPreviewImage] = useState<string | null>(null);
```

Place it next to the other image-related state hooks, e.g. right after `const [mainImage, ...]` or near `setIterations`.

#### 3b. Make the rendered image clickable

Find the image render inside the card (the `card.image ?` truthy branch). It currently looks like:

```tsx
                    ) : card.image ? (
                      <img src={card.image} alt={card.label} className="w-full h-full object-contain bg-black" />
                    ) : (
```

Replace with:

```tsx
                    ) : card.image ? (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(card.image)}
                        className="w-full h-full block cursor-zoom-in"
                        aria-label={`Enlarge ${card.label}`}
                      >
                        <img src={card.image} alt={card.label} className="w-full h-full object-contain bg-black" />
                      </button>
                    ) : (
```

#### 3c. Add a useEffect that closes the modal on Escape key

Add this useEffect near the other useEffect calls in the component:

```tsx
  useEffect(() => {
    if (!previewImage) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPreviewImage(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewImage]);
```

#### 3d. Render the preview modal

Add this JSX block AT THE END of the image tab section, just before the closing tag of the image tab wrapper. The image tab block starts after `{activeTab === "image" && <>` and ends with `</>}`. Place the modal right before the `</>` that closes the image tab fragment.

```tsx
          {/* Click-to-enlarge preview */}
          {previewImage && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
              onClick={() => setPreviewImage(null)}
              role="dialog"
              aria-modal="true"
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                aria-label="Close preview"
              >
                {"×"}
              </button>
              <img
                src={previewImage}
                alt="Preview"
                onClick={(e) => e.stopPropagation()}
                className="max-w-[90vw] max-h-[90vh] object-contain"
              />
            </div>
          )}
```

The `{"×"}` evaluates to the multiplication sign × used as a close icon. Pure ASCII source, no encoding risk.

## Constraints
- Inherits from `AGENTS.md`.
- Single file edit.
- All hyphens in any new strings must be ASCII `-`. NO em dashes anywhere.
- Use `{"×"}` for the close icon. Do NOT type the literal × character. (Avoid mojibake risk.)
- Do NOT change the existing button glyphs (`{"↻"}`, `{"⬇"}`, `{"🔥"}`) - they already use the safe JSX string literal pattern.
- Do NOT change handlers `card.onGen` / `card.onDl` / `card.onUse` or the card array structure beyond removing the `ratio` field.
- Do NOT change the loading state, empty state placeholder, or download/regenerate logic.
- The preview modal must close when the user clicks the dark backdrop OR the close button OR presses Escape.
- The image inside the modal must NOT close on click (the `onClick` with `stopPropagation` handles this).

## Acceptance criteria
- [ ] `grep -n "ratio:" web-hilas/app/creative/page.tsx` returns nothing in the image card array (the field is removed). It is acceptable if `ratio` appears elsewhere in the file unrelated to image cards.
- [ ] `grep -n "1:1 Feed" web-hilas/app/creative/page.tsx` returns nothing.
- [ ] `grep -n "9:16 Story" web-hilas/app/creative/page.tsx` returns nothing.
- [ ] `grep -n "1.91:1 Landscape" web-hilas/app/creative/page.tsx` returns nothing.
- [ ] `grep -n "card.ratio" web-hilas/app/creative/page.tsx` returns nothing.
- [ ] `grep -n "flex flex-col md:flex-row" web-hilas/app/creative/page.tsx` returns at least one match (the responsive container).
- [ ] `grep -n "w-full md:flex-1" web-hilas/app/creative/page.tsx` returns at least one match (each card responsive width).
- [ ] `grep -c "whitespace-nowrap" web-hilas/app/creative/page.tsx` returns at least 4 (one per button).
- [ ] `grep -n "previewImage" web-hilas/app/creative/page.tsx` returns at least 4 matches (state, setter, click handler, modal render).
- [ ] `grep -n "cursor-zoom-in" web-hilas/app/creative/page.tsx` returns at least one match.
- [ ] `grep -n "max-w\[90vw\]" web-hilas/app/creative/page.tsx` returns at least one match (preview modal sizing).
- [ ] `cd web-hilas && npx tsc --noEmit` passes with no new errors.
- [ ] No em dashes added in modified file.

## Out of scope
- Video tab section (untouched).
- Backend or API route changes.
- Modal animations or transitions beyond the existing tailwind defaults.
- Pinch-to-zoom or panning inside the preview - just static enlargement.
- Renaming any buttons.

## Notes for Codex
- The `useState` import is already present at the top of the file.
- The `useEffect` import is already present.
- The image tab is wrapped in `{activeTab === "image" && <>...</>}` - the modal goes inside that fragment so it only renders when the image tab is active. (Alternative: place outside the fragment to be globally accessible. Prefer inside the image tab for scope simplicity.)
- The card array literal is rebuilt every render (it's defined inline in the JSX), so removing the `ratio` field everywhere is the only required change.
- Mobile breakpoint: Tailwind `md:` = 768px. Below that, cards stack vertically.
