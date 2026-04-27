# Task: image-variations-meta-ads-blend

## Goal
Rewrite the two variation prompts inside `app/api/image/route.ts` so Variation 1 (Lifestyle/UGC) and Variation 2 (Problem/Solution Split) blend with the new Filipino Meta Ads 3-band brand DNA shipped in `lib/knowledge.ts`, while still producing visibly different iterations from the main creative.

## Why
The main image prompt was just reworked into a 3-band Filipino Meta Ads layout (top headline strip, hero+benefits split, bottom ribbon with badges/offers). The two variations still use the old prompts that don't reference this brand DNA, so users get an inconsistent campaign set. We want all 3 outputs (Main, V1, V2) to look like alternate executions of the same brand template family.

## Files to modify
- `web-hilas/app/api/image/route.ts` - replace the entire `if (isVariation) { ... } else { ... }` block (currently lines 130 through 139). Only the contents of `parts.push({ text: variationText })` calls and the surrounding ternary change. The conditional structure and `parts.push` calls remain.

## Files to create
None.

## Files to delete
None.

## Exact replacement content

Replace lines 130 through 139 (the entire `if (isVariation) { ... } else { ... }` block that builds and pushes `variationText` and the resize text) with this exact code:

```ts
      if (isVariation) {
        const variationText = variationIndex === 0
          ? `This is the original ad creative reference. Create Variation 1 - LIFESTYLE / UGC execution in ${ratioLabel} format. Keep the same Filipino Meta Ads brand DNA (typography weight, brand colors, dialect on copy) but flip the framing to lifestyle-first.

DETECT DIALECT from the original ad copy and write all on-image text in that exact dialect.

LAYOUT - vertical poster, 3 zones:

[TOP 15% - condensed headline strip, white background]
- Brand logo: small, top corner.
- ONE bold headline only (no sub-line, no Line 2 stack). 4-7 words, all caps, primary brand color. Pulled from the original ad's hook.

[MIDDLE 70% - dominant lifestyle hero photo]
- Photorealistic candid moment of a real Filipino person actively using, wearing, or experiencing the product.
- Phone-video framing, handheld feel, slight imperfection - NOT a studio shot.
- Natural light, real environment (home, street, kitchen, bedroom, outdoor - whatever fits the angle).
- Authentic emotion - genuine smile, relief, surprise, focus. No posed catalogue stares.
- Subject is the PERSON, product is secondary but visible.
- Skin tones natural, no oversaturation.

[BOTTOM 15% - thin offer ribbon, primary brand color background, white text]
- Single offer block centered (BUY 1 TAKE 1, MURA LANG, FREE SHIPPING, MESSAGE US TODAY - pull from the original ad if present, otherwise default to MESSAGE US TODAY).
- 1-2 small CTA chips on the right (COD, FREE SHIPPING). Skip if not relevant.
- NO benefit bullets in this variation. NO trust badges in this variation. Keep this band clean.

Keep the same brand, product, and subject identity from the original ad. Match the original's color palette and font weight exactly.

NEGATIVE: studio backdrop, posed model, blurry text, distorted face, AI artifacts, cartoon, 3D render, anime, watermark, oversaturated skin, the words "Before" or "After".

Final output: ready-to-upload Facebook Story / Reels ad in ${ratioLabel} format.`
          : `This is the original ad creative reference. Create Variation 2 - PROBLEM/SOLUTION SPLIT execution in ${ratioLabel} format. Keep the same Filipino Meta Ads brand DNA (3-band structure, typography weight, brand colors, dialect on copy) but reframe the middle band as a contrast split.

DETECT DIALECT from the original ad copy and write all on-image text in that exact dialect.

LAYOUT - strict 3-band composition, top to bottom:

[BAND 1 - TOP HEADLINE STRIP, full width, white background, 15% height]
- Brand logo: small, top corner.
- Headline split into TWO halves matching the image split below:
  - LEFT half: pain/problem statement, dark gray or black, medium weight, dialect-matched, 3-5 words.
  - RIGHT half: result/solution statement, BOLD all caps, primary brand color, 3-5 words.

[BAND 2 - MIDDLE PROBLEM/SOLUTION SPLIT, 65% height, vertical divider down the center]
LEFT HALF: dark, moody, raw photorealistic shot. Shows the struggle, frustration, or undesirable situation the target audience faces. Muted tones, heavy shadows, tense body language or visual metaphor for the problem. Same person identity as the original ad.

RIGHT HALF: bright, clean, aspirational photorealistic shot. Shows the outcome, confidence, relief, or success state. Warm or vibrant tones, open natural lighting, positive energy. Same person identity, transformed.

The split line should be clean and subtle - either a thin vertical divider or a natural contrast edge. Both halves are photorealistic.

[BAND 3 - BOTTOM RIBBON, full width, primary brand color background, white text, 20% height]
- Left side: 1-2 trust badges (round seals or shield icons). Pick from FDA APPROVED, AUTHENTIC, HALAL, DOH REGISTERED, BIR REGISTERED, ISO CERTIFIED - only those that fit the industry. Skip badges if none fit.
- Center: bold offer block, oversized text on contrasting plate. Pull offer from original ad if mentioned, otherwise MESSAGE US TODAY.
- Right side: 2-3 small CTA chips (COD CASH ON DELIVERY, FREE SHIPPING, MESSAGE US). Use only ones that fit the angle.

Keep the same brand, product, and subject from the original ad. Match the original's color palette and font weight exactly. Logo placement, badge style, ribbon color must match the original's brand reference.

HARD RULE: do NOT include the words "Before" or "After" anywhere in the image. Let the visual contrast carry the meaning.

NEGATIVE: blurry text, distorted face, extra limbs, watermark, oversaturated skin, horror lighting, cartoon, anime, 3D render, generic stock-photo poses, overlapping text, the words "Before" or "After".

Final output: ready-to-upload Facebook/Instagram feed ad in ${ratioLabel} format.`;
        parts.push({ text: variationText });
      } else {
        parts.push({
          text: `This is the reference ad creative. Recreate the same concept, visual style, color palette, typography, layout, and message - adapted for a ${ratioLabel} format. Keep everything consistent: same headline text, same subject, same mood, same brand elements. Only adjust the composition and spacing to fit the new format.`,
        });
      }
```

## Constraints
- Inherits from `AGENTS.md`.
- Single file edit only - `app/api/image/route.ts`.
- Do NOT touch `lib/knowledge.ts`, do NOT touch any other route, page, or component.
- Do NOT change the function signature, the `parts` array structure, or the credit deduction logic.
- Do NOT add imports or dependencies.
- All hyphens in the new prompt content must be ASCII `-`. NO em dashes (`-`) or en dashes anywhere in the new content.
- Preserve existing indentation matching the surrounding code (the block is inside a `try` and inside `else` of `if (!referenceImage)`).

## Acceptance criteria
- [ ] `grep -c "isVariation" web-hilas/app/api/image/route.ts` returns at least 2 (the parameter and the conditional both still exist).
- [ ] `grep -n "Variation 1 - LIFESTYLE" web-hilas/app/api/image/route.ts` returns exactly one match.
- [ ] `grep -n "Variation 2 - PROBLEM/SOLUTION SPLIT" web-hilas/app/api/image/route.ts` returns exactly one match.
- [ ] `grep -n "Story / Reels format" web-hilas/app/api/image/route.ts` returns nothing (old V1 phrasing removed).
- [ ] `grep -n "Split format" web-hilas/app/api/image/route.ts` returns nothing (old V2 phrasing removed).
- [ ] `grep -n "Before" web-hilas/app/api/image/route.ts` returns matches only inside a "do NOT include the words" or similar negative rule context (the hard rule is preserved, the literal word use is not).
- [ ] `cd web-hilas && npx tsc --noEmit` passes with no new errors.
- [ ] No em dashes added in the new prompt content. Run: `grep -c "[-]" web-hilas/app/api/image/route.ts` - count should not increase from before this edit.

## Out of scope
- Do NOT modify `MODULE_PROMPTS.creative` in `lib/knowledge.ts`.
- Do NOT modify the main image generation branch (the `if (!referenceImage)` block).
- Do NOT change credit costs, aspect ratio handling, storage upload, or media_library logging.
- Do NOT touch the resize ternary branch logic - only the prompt text inside the `else` of the resize fallback can stay or be lightly polished, but the `else` clause must remain functionally identical.

## Notes for Codex
- The block to replace starts at the line `if (isVariation) {` and ends just before `const result = await geminiModel.generateContent({` (the next call after the conditional).
- The `parts.push({ inlineData: { mimeType, data } });` call BEFORE the conditional must remain untouched.
- The closing `}` of the outer `else` (the `referenceImage` branch) must remain - we are only replacing the inner `if/else` that builds the variation/resize text.
- After the replacement, the next code that runs is `const result = await geminiModel.generateContent({...})`. Do not modify that or anything after it.
- Use ASCII hyphens (`-`) only in all new prompt content. No em dashes.
