# Task: Light Mode — Secondary Pages Cleanup

## Goal
Five user-facing pages were missed in the first light mode pass. Update them to match the light theme already applied to the core pages. No structural changes. Color updates only.

## Light Theme Reference
- Background: `#F8FAFC`
- Card background: `#FFFFFF`
- Inner section background: `#F1F5F9`
- Border: `#E2E8F0`
- Muted text: `#64748B`
- Body text: `#0F172A`
- Brand blue: `#2B7EC9` (keep unchanged)
- Brand orange: `#F5A623` (keep unchanged)

## Replace These Dark Values Everywhere In The Files Below
- `#0B1120` → `#F8FAFC`
- `#0F172A` (backgrounds only, not text) → `#FFFFFF`
- `#0A0F1A` → `#F1F5F9`
- `#1E2D45` (borders) → `#E2E8F0`
- `#1E2D45` (backgrounds) → `#F1F5F9`
- `#334155` (text) → `#64748B`
- `#94A3B8` (text) → `#64748B`
- `rgba(15,23,42,0.7)` or `rgba(15,23,42,0.8)` → `rgba(248,250,252,0.9)`
- `border-gray-700`, `border-gray-800` → `border-slate-200`
- `bg-gray-800`, `bg-gray-900` → `bg-slate-100`

**IMPORTANT:** Do NOT replace `#0F172A` when it is used as a text/font color (`color:`, `style={{ color:`). Only replace it when used as a background (`background:`, `style={{ background:`, `fill=`).

---

## Files To Update

### 1. `app/community/page.tsx`
- Page background: replace dark bg with `#F8FAFC`
- Chat bubbles from others: replace `#0F172A` bg with `#F1F5F9`
- Input bar background: replace dark with `#FFFFFF`, border `#E2E8F0`
- Top nav bar: replace dark bg with `#FFFFFF`, border `#E2E8F0`

### 2. `app/expert/page.tsx`
- Page background: replace dark with `#F8FAFC`
- Topic/time selection cards: replace dark bg with `#F1F5F9`, selected state keep brand orange tint `rgba(245,166,35,0.1)`
- Any card or section backgrounds: `#FFFFFF`
- Borders: `#E2E8F0`

### 3. `app/library/page.tsx`
- Page background: `#F8FAFC`
- Cards: `#FFFFFF` background, `#E2E8F0` border
- Category badge: replace dark pill with `#F1F5F9` bg, `#64748B` text
- Any inner section: `#F1F5F9`

### 4. `app/loading-screen/page.tsx`
- Page background: replace `#0F172A` with `#F8FAFC`
- Text: ensure it uses `#0F172A` (dark text on light bg)
- Any spinner or card: white or `#F1F5F9`

### 5. `app/pricing/page.tsx`
- Page background: `#F8FAFC`
- Pricing cards: `#FFFFFF` background, `#E2E8F0` border
- Plan comparison table: `#FFFFFF` header rows, `#F1F5F9` alternating
- Any inner dark sections: `#F1F5F9`
- Remove `border-gray-700` — replace with `border: "1px solid #E2E8F0"`

---

## Do NOT Change
- `app/admin/` — owner-only dashboard, keep dark intentionally
- `app/home/` — marketing landing page, keep dark intentionally
- `app/blog/` — public blog, out of scope
- `app/privacy/`, `app/terms/`, `app/data-deletion/` — legal pages, out of scope
- Any files in `lib/`, `api/`, `supabase/`
- Brand colors `#2B7EC9` and `#F5A623`
- Text colors using `#0F172A` — dark text on light bg is correct

---

## Verification
1. `cd web-hilas && npm run dev`
2. Visit `/community` — light background, no dark cards
3. Visit `/expert` — light background, topic cards are light
4. Visit `/library` — light cards, readable text
5. Visit `/loading-screen` — light background
6. Visit `/pricing` — light pricing cards, no dark backgrounds
7. No TypeScript or ESLint errors
