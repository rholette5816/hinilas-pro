# Task: UI Light Mode + Accessibility Improvements

## Goal
Switch Hinilas Pro from dark to light theme and improve readability for middle-aged, non-techy Filipino users. No new features. No structural changes. UI polish only.

## Acceptance Criteria
- [ ] App uses a light background throughout (no dark navy)
- [ ] All 9px and 10px text bumped to 12px minimum
- [ ] Form labels are sentence case (no ALL CAPS + tracking-widest)
- [ ] 3 form fields have helper hint text below them
- [ ] Sidebar has a "?" tooltip explaining credit costs
- [ ] Fake live stats removed from sidebar
- [ ] Tutorial reduced to 2 screens max

---

## Change 1: Light Theme (globals.css)

File: `app/globals.css`

Update CSS variables:
```css
:root {
  --background: #F8FAFC;
  --foreground: #0F172A;
  --brand-blue: #2B7EC9;      /* keep unchanged */
  --brand-orange: #F5A623;    /* keep unchanged */
  --brand-dark: #FFFFFF;
}
```

Also update scrollbar color:
```css
* {
  scrollbar-color: #CBD5E1 transparent;
}
```

---

## Change 2: Sidebar Light Theme + Fixes

File: `components/Sidebar.tsx`

### 2a. Remove LiveStats component entirely
Delete the `LiveStats` function (lines 46–66) and remove its usage inside the sidebar JSX.

### 2b. Update inline background colors
Replace all occurrences of these inline style values:
- `"#0F172A"` → `"#FFFFFF"`
- `"#0A0F1A"` → `"#F1F5F9"`
- `"#1E2D45"` → `"#E2E8F0"`
- `"#334155"` → `"#64748B"`
- `"rgba(11,17,32"` → `"rgba(248,250,252"` (backdrop colors)

Update text colors:
- Nav item text: `#0F172A` (dark on light)
- Active nav item background: `rgba(43,126,201,0.1)` (light blue tint)
- Muted labels: `#64748B`

### 2c. Font size fixes
- Credit "Usage" label: `text-[10px]` → `text-xs`
- Credit total labels (the "0" and total numbers): `text-[10px]` → `text-xs`
- Plan badge: `text-[9px]` → `text-xs`

### 2d. Add credit tooltip
Next to the "Usage" label in the credit section, add a small `?` button.
On click/tap, toggle a small tooltip div showing:
```
Research    1 credit
Strategy    1 credit
Caption     1 credit
Image       2 credits
Audit       1–2 credits
```
Tooltip style: white background, `#E2E8F0` border, `text-xs`, shadow, positioned above the credit bar.

---

## Change 3: Setup Form

File: `app/page.tsx`

### 3a. Form label styling
Find all instances of:
```
text-[10px] font-bold tracking-widest uppercase
```
Replace with:
```
text-xs font-semibold
```
Convert label text from ALL CAPS to sentence case. Example:
- `"BUSINESS NAME"` → `"Business name"`
- `"WHAT ARE YOU SELLING?"` → `"What are you selling?"`
- `"TARGET CUSTOMER"` → `"Target customer"`
- `"YOUR CURRENT STAGE"` → `"Your current stage"`
- `"LANGUAGE / DIALECT"` → `"Language / dialect"`

### 3b. Add helper hint text
Below these 3 specific fields, add a `<p>` with `text-xs text-slate-400 mt-1`:

**Business Name field:**
```
Pangalan ng iyong business o brand
```

**What are you selling field:**
```
Describe your product or service in simple words
```

**Target customer field:**
```
Who usually buys from you? Age, gender, location
```

### 3c. Update inline dark colors
Replace inline style values:
- `background: "#0F172A"` → `background: "#FFFFFF"`
- `background: "#1E2D45"` → `background: "#F1F5F9"`
- `border: "1px solid #1E2D45"` → `border: "1px solid #E2E8F0"`
- `color: "#94A3B8"` → `color: "#64748B"`
- Any dark card wrappers: switch to white/light gray

---

## Change 4: Tutorial Overlay

File: `components/TutorialOverlay.tsx`

### 4a. Reduce to 2 screens
Find the `STEPS` array. Keep only 2 steps:

```ts
const STEPS = [
  {
    title: "Welcome to Hinilas Pro!",
    message: "Sa loob ng 5 minuto, makakuha ka ng research, angles, at captions para sa iyong ads. Libre ang una mong kit.",
    highlight: null,
    cta: false,
  },
  {
    title: "Simulan natin.",
    message: "Fill in your business details below so Hinilas Pro can build your Ad Kit.",
    highlight: "Setup",
    cta: true,
  },
];
```

Remove all other steps.

### 4b. Update overlay colors to light
- Backdrop: `rgba(248,250,252,0.85)` with blur
- Card background: `#FFFFFF`
- Card border: `#E2E8F0`
- Text: `#0F172A`
- Progress dots: active = `#2B7EC9`, inactive = `#CBD5E1`

---

## Change 5: Department Pages

Files: `app/research/page.tsx`, `app/angles/page.tsx`, `app/copy/page.tsx`, `app/creative/page.tsx`, `app/analyze/page.tsx`, `app/campaign-setup/page.tsx`

For each file, replace inline dark color values:
- `"#0F172A"` → `"#FFFFFF"`
- `"#0A0F1A"` → `"#F8FAFC"`
- `"#1E2D45"` → `"#E2E8F0"`
- `"#334155"` (text) → `"#64748B"`
- `"#94A3B8"` (text) → `"#64748B"`

Keep `#2B7EC9` (brand blue) and `#F5A623` (brand orange) unchanged.

---

## Do NOT change
- Route structure
- API routes
- Credit logic
- Auth flow
- Component names or prop signatures
- Any file in `lib/`, `supabase/`, or `api/`
- The `home/` landing page (separate marketing page, out of scope)

---

## Verification
1. `cd web-hilas && npm run dev`
2. Open `http://localhost:3000` — should be white/light background
3. Check sidebar — no dark navy, no fake live stats, "?" tooltip works
4. Open setup form — sentence case labels, helper hints visible under 3 fields
5. First-time visit (clear localStorage) — only 2 tutorial screens appear
6. Navigate to `/research` — light background, readable text
7. No TypeScript or ESLint errors
