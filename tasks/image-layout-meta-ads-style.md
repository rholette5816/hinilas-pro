# Task: image-layout-meta-ads-style

## Goal
Replace the layout directive inside `MODULE_PROMPTS.creative` in `lib/knowledge.ts` so generated images match Filipino Meta Ads template style (top headline band, hero+benefits split, bottom ribbon with badges/offers).

## Why
Current prompt forces "person on right, headline on left" with a "no badges, no frames" rule. Reference ads (Dr. Vita, DoSolarph) follow a completely different formula: full-width top headline, hero photo + 3 benefit bullets in the middle, full-width bottom ribbon with trust badges and offers. The angle still drives the copy and emotion, but the layout DNA must change.

## Files to modify
- `web-hilas/lib/knowledge.ts` - replace lines 561 through 620 (the entire `creative:` arrow function body, from the line starting `creative: (userContext` to the closing `};` of the function). Keep the function signature, all parameters, all variables, and how it returns the template literal. Only the prompt content inside the template literal changes.

## Files to create
None.

## Files to delete
None.

## Exact replacement content

Replace the entire `creative:` function (lines 561-620) with this exact code:

```ts
  creative: (userContext: string, angle: string, extraDetails: string, logoDesc: string, productDesc: string, format: string, industry?: string) => {
    const layers = MODULE_PROMPTS.getIndustryLayers(industry || "");
    return `
Filipino Meta Ads creative. Square or vertical poster-style layout. Photorealistic hero, bold typographic design. Agency-grade. High-converting.

BUSINESS: ${userContext}
MARKETING ANGLE: ${angle}
FORMAT: ${format}

DETECT DIALECT from the angle (Tagalog, Bisaya, Taglish, English) and write ALL on-image copy in that exact dialect. Match the slang and tone of the angle word-for-word.

LAYOUT - strict 3-band composition, top to bottom:

[BAND 1 - TOP HEADLINE STRIP, full width, white background]
- Brand logo: small, top-left or top-right corner.
- Line 1: heavy bold black or dark green sans-serif, 3-5 words, slight italic or condensed face. Pulled from angle as a hook line in detected dialect.
- Line 2: BIGGER, BOLDER, all caps, primary brand color. 2-4 words. Punchline or emotional payoff from the angle.
- Sub-headline below: thin/medium weight, dark gray or black, ONE line of supporting copy in detected dialect.

[BAND 2 - MIDDLE HERO + BENEFITS SPLIT]
LEFT 55-60%: photorealistic hero image.
${layers.person}
${layers.environment}
${layers.lighting}
Natural skin tones. Sharp focus. Subject framed naturally - using the product, reacting to it, or product hero shot if no person fits the angle.

RIGHT 40-45%: stack of exactly 3 benefit bullets, vertically centered.
- Each bullet = circle icon (filled, primary brand color, white pictogram inside) + 2 lines of text.
- Line A: bold all-caps benefit (2-3 words) in primary brand color.
- Line B: smaller medium-weight black supporting copy (1 line, 4-7 words).
- Pull the 3 benefits directly from the angle's value proposition. Translate to detected dialect.

[BAND 3 - BOTTOM RIBBON, full width, primary brand color background, white text]
- Left side: 1-2 trust badges (round seals or shield icons). Pick from: FDA APPROVED, AUTHENTIC, HALAL, DOH REGISTERED, BIR REGISTERED, ISO CERTIFIED - only those that realistically fit the industry/angle. Skip badges if none fit.
- Center: bold offer block, oversized text on contrasting plate. Pull offer from angle if mentioned (BUY 1 TAKE 1, 50% OFF, FREE SHIPPING, MURA LANG, etc). If no offer in angle, use a soft CTA like MESSAGE US TODAY.
- Right side: 2-3 small CTA chips (icon + label): COD CASH ON DELIVERY, FREE SHIPPING, MESSAGE US, MGA SLOT NA LANG, etc. Use only ones that fit the angle/industry.

${logoDesc ? `BRAND REFERENCE: ${logoDesc}\n- Follow exactly: brand colors, font style, font weight, graphic style.\n- Apply brand colors to: Line 2 of headline, benefit icon fills, benefit Line A text, bottom ribbon background.` : "BRAND PALETTE: pick 1 primary saturated color (red, green, blue, or orange) + black + white. Apply consistently across headline accent, icons, and ribbon."}
${productDesc ? `HERO PRODUCT: ${productDesc} - must appear visibly in hero image, dominant focal point on the right edge of the hero photo.` : ""}
${extraDetails ? `CREATIVE DIRECTION: ${extraDetails}` : ""}

STYLE RULES:
- High saturation, vibrant, scroll-stopping.
- Strong contrast - every text element must be legible at thumbnail size.
- White or near-white background in top band only. Avoid muddy mid-tones.
- All typography is heavy, bold, condensed or chunky. NO thin fonts.
- Filipino Meta Ads aesthetic: direct, busy-but-organized, sells immediately.
- Photorealistic hero only - no AI artifacts, no cartoon, no 3D render, no anime.

NEGATIVE: blurry text, distorted face, extra limbs, watermark, oversaturated skin, horror lighting, cartoon, anime, 3D render, generic stock-photo poses, overlapping text, cropped headlines, empty wasted space.

Final output: ready-to-upload Facebook/Instagram feed ad in the requested ${format} format.
`;
  },
```

## Constraints
- Inherits from `AGENTS.md`.
- Only edit the single function block. Do not touch any other entry in `MODULE_PROMPTS`, do not change `getIndustryLayers`, do not add imports, do not change types.
- Function signature must remain exactly: `creative: (userContext: string, angle: string, extraDetails: string, logoDesc: string, productDesc: string, format: string, industry?: string) =>`
- Must still return a template literal string.
- Closing `};` of `MODULE_PROMPTS` object (currently line 621) must remain.

## Acceptance criteria
- [ ] `grep -n "creative: (userContext" web-hilas/lib/knowledge.ts` returns exactly one match.
- [ ] `grep -c "MODULE_PROMPTS.getIndustryLayers" web-hilas/lib/knowledge.ts` returns at least 1 (the call inside `creative` is preserved).
- [ ] `grep -n "Person on RIGHT" web-hilas/lib/knowledge.ts` returns nothing (old layout directive removed).
- [ ] `grep -n "BAND 1 . TOP HEADLINE STRIP" web-hilas/lib/knowledge.ts` returns exactly one match (new layout in place; the dot matches whatever hyphen char Codex writes).
- [ ] `grep -n "No badges, callouts, borders, frames" web-hilas/lib/knowledge.ts` returns nothing (old negative rule removed).
- [ ] `cd web-hilas && npx tsc --noEmit` passes with no new errors.
- [ ] No em dashes anywhere in the file (`grep -n "[-]" web-hilas/lib/knowledge.ts` returns only matches that already existed before this edit - note: the new prompt uses ASCII hyphens only, so total em-dash count should stay the same or decrease).

## Out of scope
- Do NOT modify `app/api/image/route.ts`.
- Do NOT modify any other route, component, or page.
- Do NOT change credit costs, aspect ratio handling, or variation logic.
- Do NOT add new dependencies.
- Do NOT touch `getIndustryLayers` or any other `MODULE_PROMPTS` entry.

## Notes for Codex
- The replacement spans roughly lines 561 to 620 inclusive.
- After the replacement, the next line should be `};` (the closing brace of the `MODULE_PROMPTS` object at the original line 621).
- Use ASCII hyphens (`-`) only in the new prompt content. No em dashes (`-`) or en dashes (`–`).
- The template literal contains backticks-safe content. No nested template literals or backtick characters inside.
- Preserve exact 2-space indentation matching the rest of `MODULE_PROMPTS`.
