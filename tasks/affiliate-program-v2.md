# Task: Affiliate Program V2 — Team Building + Override System

## What Already Exists (DO NOT REWRITE)

- `lib/affiliate.ts` — commission logic, rank helpers, telegram
- `app/api/affiliate/register/route.ts` — join with GCash
- `app/api/affiliate/stats/route.ts` — earnings + members
- `app/api/affiliate/payout/route.ts` — request payout
- `app/api/affiliate/payout/approve/route.ts` — admin approve
- `app/affiliate/page.tsx` — join page
- `app/affiliate/dashboard/page.tsx` — existing dashboard
- `affiliates`, `affiliate_earnings`, `affiliate_payouts` tables — already created
- Commission wired in `app/api/topup/approve/route.ts`

---

## What This Task Adds

1. **Updated rank names and thresholds** in `lib/affiliate.ts`
2. **Override commission logic** in `lib/affiliate.ts` + `grantAffiliateCommissions`
3. **Monthly override cron job** — `app/api/cron/affiliate-overrides/route.ts`
4. **Supabase table** — `affiliate_overrides` (monthly override payouts)
5. **Rebuilt Partner Dashboard** — 3 income streams, team tree, rank progress, recruiting content button
6. **Updated join page** — rebranded as "Partner Program" not "Affiliate"
7. **Admin: Payouts tab update** — show override payouts alongside direct payouts

---

## Updated Rank System

Update these constants in `lib/affiliate.ts`:

```ts
// Replace existing rank types and helpers

export type AffiliateRank = "Partner" | "Hustler" | "Leader" | "Educator" | "Top Leader";

export function getRankForPaidReferrals(count: number): AffiliateRank {
  if (count >= 50) return "Top Leader";
  if (count >= 25) return "Educator";
  if (count >= 10) return "Leader";
  if (count >= 3) return "Hustler";
  return "Partner";
}

export function getNextRank(count: number): { name: string; referralsNeeded: number } {
  if (count < 3) return { name: "Hustler", referralsNeeded: 3 - count };
  if (count < 10) return { name: "Leader", referralsNeeded: 10 - count };
  if (count < 25) return { name: "Educator", referralsNeeded: 25 - count };
  if (count < 50) return { name: "Top Leader", referralsNeeded: 50 - count };
  return { name: "Top Leader", referralsNeeded: 0 };
}

// Override rates per rank — applied to team's monthly top-up revenue
export const OVERRIDE_RATES: Record<AffiliateRank, number> = {
  "Partner": 0,
  "Hustler": 0,
  "Leader": 0.05,       // 5%
  "Educator": 0.08,     // 8%
  "Top Leader": 0.12,   // 12%
};

// Active member = topped up within last 30 days
export const ACTIVE_MEMBER_DAYS = 30;

// Minimum active members required to receive override
export const OVERRIDE_ACTIVE_REQUIRED: Record<AffiliateRank, number> = {
  "Partner": 0,
  "Hustler": 0,
  "Leader": 5,
  "Educator": 10,
  "Top Leader": 20,
};

// Remove RANK_BONUS — no longer used (flat ₱250 for all ranks on Flex sale)
```

Update `grantAffiliateCommissions` in `lib/affiliate.ts`:
- Flex sale commission: always flat **₱250** (remove rank bonus — it's now in override instead)
- Top-up direct commission: **20%** of amount (unchanged)
- Level 2 top-up: **10%** of amount (unchanged) — only for top-ups not Flex

---

## New Supabase Table — Run in SQL editor

```sql
create table if not exists affiliate_overrides (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references affiliates(id) not null,
  month text not null, -- format: "2026-05"
  team_topup_revenue numeric not null default 0,
  active_members int not null default 0,
  override_rate numeric not null default 0,
  amount_earned numeric not null default 0,
  status text not null default 'pending', -- pending | paid
  calculated_at timestamptz not null default now(),
  unique(affiliate_id, month)
);

create index if not exists affiliate_overrides_status_idx
  on affiliate_overrides (status);
```

---

## New File: `app/api/cron/affiliate-overrides/route.ts`

Runs monthly (add to vercel.json cron: `0 0 1 * *` — 1st of every month).

Logic:
1. Get all affiliates with rank "Leader", "Educator", or "Top Leader"
2. For each affiliate:
   a. Get their direct members (users whose `referred_by` = affiliate's referral_code)
   b. Count active members (those who have a topup in last 30 days)
   c. Check active members >= OVERRIDE_ACTIVE_REQUIRED[rank] — if not, skip
   d. Sum total top-up revenue from their direct members in the previous calendar month
   e. Calculate override = total_topup_revenue × OVERRIDE_RATES[rank]
   f. If override > 0: insert into `affiliate_overrides` with month = previous month string
   g. Also insert into `affiliate_earnings` with type = "override", amount_earned = override
3. Send Telegram: "✅ Monthly overrides calculated. X affiliates earned overrides totaling ₱Y."

```ts
export const maxDuration = 60;

export async function GET(req: Request) {
  // Verify cron secret
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  // ... logic above
}
```

---

## Updated `app/affiliate/page.tsx` — Join Page Rebrand

Change all references:
- "Affiliate Program" → "Partner Program"
- "Affiliate" → "Partner"
- Keep GCash registration form identical

Update the commission display section to show all 3 income streams clearly:

**Stream 1 — Direct Commission:**
| Purchase | You Earn |
|---|---|
| Someone pays Flex ₱499 | ₱250 cash |
| Someone tops up ₱99 | ₱20 cash |
| Someone tops up ₱179 | ₱36 cash |
| Someone tops up ₱299 | ₱60 cash |

**Stream 2 — Team Override (Leader rank+):**
| Rank | Override |
|---|---|
| Leader (10 referrals) | 5% of team's monthly top-ups |
| Educator (25 referrals) | 8% of team's monthly top-ups |
| Top Leader (50 referrals) | 12% of team's monthly top-ups |

**Stream 3 — Recruiting Paths:**
Show 3 icons in a row:
- 📱 Content Creation — "Gumawa ng TikTok/Reels gamit ang Hinilas Pro"
- 🎓 Workshops — "Magturo ng Meta Ads. Gamitin ang tool bilang demo."
- 👥 Direct Recruit — "Personal invite sa mga kakilala mong may business"

**Rank ladder** (vertical steps):
Partner → Hustler (3) → Leader (10) → Educator (25) → Top Leader (50)

---

## Rebuilt `app/affiliate/dashboard/page.tsx`

Full rebuild. Fetch from `/api/affiliate/stats`.

### Header
- Rank badge with color:
  - Partner: gray
  - Hustler: blue
  - Leader: orange
  - Educator: purple
  - Top Leader: red/gold
- Referral link with copy button
- "Create Recruiting Content →" button — links to `/?recruiting=true` (see note below)

### Rank Progress Bar
- "X more paid referrals to [NextRank]"
- Visual progress bar from current to next rank
- If Top Leader: "You've reached the top rank 🏆"

### 3 Income Stream Cards (side by side on desktop, stacked mobile)

**Card 1 — Direct Commissions**
- This month: ₱[sum of flex_sale + topup_direct earnings this month]
- All time: ₱[total]
- Sub: "From your [X] direct members"

**Card 2 — Team Override**
- This month: ₱[override earnings this month]
- All time: ₱[total override]
- Sub: If rank < Leader: "Unlocks at Leader rank (10 referrals)"
- Sub: If Leader+: "[X] active members · [rate]% override"

**Card 3 — Wallet**
- Available to withdraw: ₱[pendingBalance — earnings older than 7 days]
- On hold (7 days): ₱[holdBalance]
- Total paid out: ₱[totalPaid]
- "Request Payout" button if >= ₱200, else show how much more needed

### Team Section
Title: "Your Team ([count] members)"

For each direct member show:
- Avatar + username
- Joined date
- Total they've spent (sum of their topups)
- Status badge: "Active" (topped up in 30 days) or "Inactive"
- Their own referral count (how many they've referred) — shows if they're building a team

Empty state: "Wala ka pang team. I-share ang iyong Partner Link para magsimula."

### Earnings History Table
Columns: Date | Type | From | Amount | Status
Types shown as badges:
- "Flex Sale" — green
- "Top-up" — blue
- "Override" — purple

### Payouts History Table
Columns: Date | Amount | GCash | Status

---

## Note: "Create Recruiting Content" Button

When user clicks this button, navigate to `/?recruiting=true`.

In `app/page.tsx` (Setup page), detect `?recruiting=true` query param:
- Pre-fill the setup form with:
  - Business Name: "Hinilas Pro"
  - Product: "AI-powered Meta Ads tool for Filipino business owners"
  - Target Audience: "Filipino business owners, sellers, and entrepreneurs who run Facebook ads"
  - Unique Selling Offer: "Generate ad angles, copy, and images in minutes using AI. Pay once, credits never expire."
  - Market: "Philippines"
  - Language: "Bisaya-English" (or their saved preference)
- Show a blue banner at top: "You're creating content to recruit for Hinilas Pro. Your referral link will be shown at the end."
- After they complete their workflow (angles, copy, creative), show their referral link as a final CTA

Detection: `const searchParams = useSearchParams(); const isRecruiting = searchParams.get("recruiting") === "true";`

---

## Updated `/api/affiliate/stats/route.ts`

Add to the response:
- `overrides[]` — from `affiliate_overrides` table for this affiliate
- `thisMonthEarnings` — sum of earnings created this calendar month
- `thisMonthOverride` — sum of override earnings this calendar month
- `activeMembers` — count of direct members who topped up in last 30 days
- `overrideRate` — OVERRIDE_RATES[rank]
- `overrideActiveRequired` — OVERRIDE_ACTIVE_REQUIRED[rank]
- `membersWithTeams` — for each member, include their `total_paid_referrals` count

Query for active members:
```ts
// Get direct member user_ids
const memberUserIds = members.map(m => m.user_id);

// Check which ones have topped up in last 30 days
const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
const { data: activeTopups } = await supabase
  .from("top_up_requests")
  .select("user_id")
  .in("user_id", memberUserIds)
  .eq("status", "approved")
  .gte("approved_at", since30);

const activeMemberIds = new Set(activeTopups?.map(t => t.user_id) ?? []);
```

---

## Admin Dashboard — Payouts Tab Update

Add a second section under direct payouts: **"Override Payouts"**

Show `affiliate_overrides` where status = "pending":
- Affiliate name + email
- Month
- Active members count
- Team revenue
- Override rate
- Amount earned
- "Mark as Paid" button → calls new endpoint `POST /api/affiliate/override/pay` with overrideId
  - Updates `affiliate_overrides.status` = "paid"
  - Sends Telegram + email to affiliate

---

## Updated `app/api/affiliate/payout/approve/route.ts`

When marking a payout as paid, also mark all `affiliate_overrides` for this affiliate that are status "pending" and included in the payout amount — update their status to "paid".

---

## Vercel Cron Config (`vercel.json`)

Add to existing crons array:
```json
{
  "path": "/api/cron/affiliate-overrides",
  "schedule": "0 0 1 * *"
}
```

---

## Acceptance Checks

1. `grep -n "Top Leader\|Educator\|Leader\|Hustler" lib/affiliate.ts` — updated rank names
2. `grep -n "OVERRIDE_RATES" lib/affiliate.ts` — override rates defined
3. `ls app/api/cron/affiliate-overrides/route.ts` — cron route exists
4. `grep -n "affiliate_overrides" app/api/cron/affiliate-overrides/route.ts` — inserts overrides
5. `grep -n "recruiting=true" app/page.tsx` — recruiting pre-fill exists
6. `grep -n "Create Recruiting Content" app/affiliate/dashboard/page.tsx` — button exists
7. `npx tsc --noEmit` — zero TypeScript errors

## Notes

- DO NOT change `grantAffiliateCommissions` signature — only update internals
- Flex sale = flat ₱250 always, no rank bonus (override replaces rank bonus)
- Level 2 top-up at 10% stays unchanged
- "Partner Program" branding throughout — never use "MLM", "upline", "downline", "matrix"
- Override is calculated monthly by cron, not real-time
- The recruiting pre-fill reuses the existing setup page — no new page needed
