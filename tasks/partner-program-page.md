# Task: Partner Program Public Page

## Goal

Build a public `/partner` page that pitches the Hinilas Pro Partner Program to prospects. Add a "Partner Program" link in the footer of `app/home/page.tsx`. The page ends with a CTA that goes to `/affiliate` (existing registration page).

---

## What Already Exists (DO NOT REWRITE)

- `app/affiliate/page.tsx` — existing partner registration page
- `app/home/page.tsx` — home page with footer (add link here only)
- Brand colors: `BRAND_ORANGE = "#D97706"`, `BRAND_BLUE = "#1877F2"`
- Dark theme base: `#0F172A`
- Light theme base: `#FFFFFF`, border: `#E4E6EB`, muted: `#64748B`
- Tailwind CSS + dark theme pattern used across app

---

## What This Task Builds

1. **New page:** `app/partner/page.tsx` — full public pitch page
2. **Footer link:** Add "Kumita" or "Partner Program" link in `app/home/page.tsx` footer

---

## Footer Change — `app/home/page.tsx`

Find the footer links section (around line 557-561):
```tsx
<a href="/privacy" ...>Privacy</a>
<a href="/terms" ...>Terms</a>
<a href="/blog" ...>Blog</a>
```

Add one more link after Blog:
```tsx
<a href="/partner" className="transition-colors hover:text-[#1c1e21]">Kumita</a>
```

---

## New Page — `app/partner/page.tsx`

Server component (no "use client" needed — static content only).

Use the home page light theme style: white background, `#1c1e21` headings, `#64748B` muted text, `#E4E6EB` borders.

### Page Structure (top to bottom):

---

### Section 1 — Hero

Full-width section, centered, white background.

```
Headline (large, bold, #1c1e21):
"Kumita Habang Ginagamit Mo ang Tool Na Nagpapalago ng Negosyo Mo"

Subtext (#64748B):
"I-refer ang Hinilas Pro. Kumita ng komisyon sa bawat sale at top-up — direkta sa GCash mo."

Two buttons side by side:
- Primary (orange): "Sumali Bilang Partner" → /affiliate
- Secondary (outline): "Tingnan ang Mga Kita" → scrolls to #income (anchor link)
```

---

### Section 2 — The Problem (gray background #F8FAFC)

Heading: "Bakit Karamihan sa Extra Income Options Hindi Gumagana"

4 cards in a 2x2 grid (mobile: stacked):

| Icon | Title | Description |
|---|---|---|
| 📦 | Reselling / Dropship | Kailangan ng puhunan, stocks, at delivery headaches |
| 🔺 | MLM | Produkto na hindi mo ginagamit, puro recruitment pressure |
| ⏱️ | Freelancing | Time for money. Pag hindi ka nagtrabaho, wala |
| 📱 | Content Creation | Taon bago kumita ng malaki |

Below the grid, bold text centered:
"Lahat ng yan — malaking puhunan o malaking oras. Wala sa atin ang may sobra ng dalawa."

---

### Section 3 — What is Hinilas Pro (white background)

Heading: "Ano ang Hinilas Pro?"

Short paragraph:
"Hinilas Pro is an AI-powered Meta Ads tool para sa mga Filipino business owners. Dito gumawa ng ad angles, sales copy, at ad images in minutes. Ginagamit na ng mga seller, freelancer, at negosyante para pabilisin ang kanilang Facebook ads workflow. Hindi ito phantom product — may output, may resulta."

3 feature pills in a row (orange border, orange text):
- "Ad Angles Generator"
- "Sales Copy Writer"  
- "AI Ad Image Creator"

---

### Section 4 — 3 Ways to Earn (white background)

Heading: "3 Paraan Para Kumita"

**Card 1 — Direct Commission** (orange accent)
Title: "1. Direct Commission"
Subtitle: "Mag-refer, kumita agad sa GCash."

Table inside card:
| Binili Nila | Kikitain Mo |
|---|---|
| Flex Plan ₱499 | ₱250 cash |
| Max Plan ₱1,299 | ₱649 cash |
| Top-up ₱99 | ₱20 |
| Top-up ₱179 | ₱36 |
| Top-up ₱299 | ₱60 |

Footer note on card: "Isang Max sale = ₱649 agad. Wala kang binayarang ads."

---

**Card 2 — Team Override** (blue accent)
Title: "2. Team Override"
Subtitle: "Pag nagtatayo ka ng team, kumikita ka kahit hindi ka nagbe-benta."

Rank ladder (vertical or horizontal list):
| Rank | Referrals | Monthly Override |
|---|---|---|
| Partner | 0 | — |
| Hustler | 3 | — |
| Leader | 10 | 5% ng team top-ups |
| Educator | 25 | 8% ng team top-ups |
| Top Leader | 50 | 12% ng team top-ups |

Footer note: "Direct downline mo lang. 1 level. Buwan-buwan, basta aktibo ang team."

---

**Card 3 — Recruit Through the Tool** (green accent #16A34A)
Title: "3. I-recruit Gamit ang Tool"
Subtitle: "Ang tool mismo ang nagbe-benta para sa iyo."

3 methods as bullet items:
- 📱 **Content Method** — Gumawa ng ad gamit Hinilas Pro. I-post ang resulta. Link sa bio.
- 🎓 **Workshop Method** — Magturo ng Meta Ads. Gamitin ang tool bilang demo.
- 👥 **Direct Method** — Mga kakilala mong may negosyo. "Subukan mo, 30 free credits."

---

### Section 5 — Income Projections (gray background #F8FAFC, id="income")

Heading: "Magkano ang Pwedeng Kitain?"
Subtext: "Realistic projections. Hindi guaranteed — depende sa effort mo."

4 scenario cards in a grid (2x2 desktop, stacked mobile):

**Card 1 — Casual Partner**
Badge: "1-2 oras/linggo"
- 2 Flex sales: ₱500
- 2 Max sales: ₱1,298
- 5 top-up referrals: ₱180
- **Total: ~₱1,978/buwan**
Note: "Katumbas ng isang linggo ng grocery."

**Card 2 — Active Hustler**
Badge: "5-7 oras/linggo"
- 8 Flex sales: ₱2,000
- 3 Max sales: ₱1,947
- 15 top-up referrals: ₱600
- **Total: ~₱4,547/buwan**
Note: "Katumbas ng minimum wage. Extra lang ito."

**Card 3 — Leader**
Badge: "10 referrals"
- Personal sales: ₱2,500
- Direct top-up commissions: ₱400
- Team override: ₱100
- **Total: ~₱3,000/buwan ongoing**
Note: "Hindi nababawasan. Buwan-buwan."

**Card 4 — Top Leader**
Badge: "50 referrals"
- Personal sales: ₱5,000
- Direct commissions: ₱2,000
- Team override: ₱1,200
- **Total: ~₱8,200/buwan**
Note: "Kalahati nito — hindi na kailangan pang ibenta."

Below cards, a simple timeline strip:
Month 1 → Month 2-3 → Month 4-5 → Month 6-12
"First referrals" → "Build content, Hustler" → "Reach Leader" → "System running"

---

### Section 6 — Why This is NOT MLM (white background)

Heading: "Hindi Ito MLM. Eto ang Difference:"

Two-column comparison table:

| MLM | Hinilas Pro Partner |
|---|---|
| Kailangan bumili para mag-qualify | Hindi kailangan. Libre mag-join. |
| Puro recruitment ang pera | Pwede sa direct sales lang kumita |
| Override goes many levels deep | 1 level lang — direct team mo |
| Mahirap ibentang produkto | Tool na ginagamit na ng market |
| Complicated payout | GCash. Agad. |

---

### Section 7 — How to Start (gray background #F8FAFC)

Heading: "Paano Magsimula?"

3 steps horizontal (mobile: stacked):

**Step 1**
Icon: circle with "1"
Title: "Gamitin ang Tool"
Text: "Mag-sign up sa Hinilas Pro. Gamitin sa sarili mong ads. Ma-feel mo mismo ang value."

**Step 2**
Icon: circle with "2"
Title: "I-register ang GCash"
Text: "I-register ang GCash number mo sa Partner dashboard. Libre."

**Step 3**
Icon: circle with "3"
Title: "I-share ang Link"
Text: "Sa grupo, sa friends, sa content. Bawat click na nag-convert — kita mo."

---

### Section 8 — CTA Footer (orange background #D97706)

Large centered section:

Headline (white, bold):
"Dalawa Lang ang Klase ng Tao Dito."

Subtext (white, slightly transparent):
"Yung mag-re-refer ng ibang tao sa tool — at yung mare-refer. Mas maganda kung ikaw yung nasa unang grupo."

Button (white background, orange text, bold):
"Sumali Bilang Partner Ngayon — Libre" → /affiliate

Small text below button (white, small):
"Minimum payout: ₱200 · Payout sa GCash · Walang puhunan"

---

## Acceptance Checks

1. `ls app/partner/page.tsx` — file exists
2. `grep -n "partner" app/home/page.tsx` — footer link added
3. Page loads at `/partner` with no errors
4. "Sumali Bilang Partner" buttons link to `/affiliate`
5. "Tingnan ang Mga Kita" anchor scrolls to income section
6. `npx tsc --noEmit` — zero TypeScript errors

## Notes

- Pure static page — no API calls, no auth required, no useClient
- Use light theme throughout (white/gray sections alternating)
- Mobile responsive — all grids stack on small screens
- No emojis in code — use them only in content text as shown above
- Keep font sizes consistent with home page style
- Do not create any new API routes
