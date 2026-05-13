# Task: Gen 2 Override Commission + Family Tree Tab

## Context
- Existing affiliate system is in `lib/affiliate.ts`, `app/api/affiliate/stats/route.ts`, `app/affiliate/dashboard/page.tsx`
- Gen 1 override already exists (monthly cron at `app/api/cron/affiliate-overrides/route.ts`)
- This task adds Gen 2 override rates and a Family Tree tab to the partner dashboard
- DO NOT change function signatures — only update internals

---

## Part 1 — Gen 2 Override Rates in `lib/affiliate.ts`

Add alongside existing `OVERRIDE_RATES`:

```ts
export const OVERRIDE_RATES_GEN2: Record<AffiliateRank, number> = {
  "Partner": 0,
  "Hustler": 0,
  "Leader": 0.04,      // 4%
  "Educator": 0.06,    // 6%
  "Top Leader": 0.10,  // 10%
};

export const OVERRIDE_ACTIVE_REQUIRED_GEN2: Record<AffiliateRank, number> = {
  "Partner": 0,
  "Hustler": 0,
  "Leader": 3,
  "Educator": 5,
  "Top Leader": 10,
};
```

---

## Part 2 — Update Monthly Cron `app/api/cron/affiliate-overrides/route.ts`

After calculating Gen 1 override (existing logic), add Gen 2 override calculation:

### Gen 2 Logic (add after Gen 1 block):
1. For each affiliate with rank Leader/Educator/Top Leader:
   a. Get their Gen 2 members — users referred by any of their Gen 1 members
      - Get Gen 1 member referral_codes from `user_data`
      - Find all users whose `referred_by` is in that set
   b. Count active Gen 2 members (topped up in last 30 days)
   c. Check active Gen 2 members >= `OVERRIDE_ACTIVE_REQUIRED_GEN2[rank]` — if not, skip
   d. Sum total top-up revenue from Gen 2 members in the previous calendar month
   e. Calculate gen2Override = gen2_topup_revenue × `OVERRIDE_RATES_GEN2[rank]`
   f. If gen2Override > 0:
      - Insert into `affiliate_overrides` with month = previous month string, a new row with `override_type = "gen2"` (see table update below)
      - Insert into `affiliate_earnings` with type = "override_gen2", amount_earned = gen2Override
2. Update Telegram summary to include both Gen 1 and Gen 2 totals

### Updated `affiliate_overrides` table — add column:
```sql
alter table affiliate_overrides
  add column if not exists override_type text not null default 'gen1';
```
Run this SQL before executing. Values: `"gen1"` | `"gen2"`.

The unique constraint is `(affiliate_id, month)` — change to `(affiliate_id, month, override_type)`:
```sql
alter table affiliate_overrides drop constraint if exists affiliate_overrides_affiliate_id_month_key;
alter table affiliate_overrides add constraint affiliate_overrides_affiliate_id_month_type_key unique (affiliate_id, month, override_type);
```

---

## Part 3 — Update `app/api/affiliate/stats/route.ts`

### Add to response:
- `gen2Members` — map of Gen 1 user_id → array of their recruited members
- `gen2ActiveCount` — total active Gen 2 members across all Gen 1 members
- `gen2OverrideRate` — `OVERRIDE_RATES_GEN2[rank]`
- `thisMonthGen2Override` — sum of override_gen2 earnings this calendar month

### Query for gen2Members:
```ts
// Get referral codes of Gen 1 members
const gen1ReferralCodes = (
  await admin
    .from("user_data")
    .select("user_id, referral_code")
    .in("user_id", memberIds)
).data || [];

const codeToGen1UserId = new Map(
  gen1ReferralCodes.map(r => [r.referral_code, r.user_id])
);
const gen1Codes = gen1ReferralCodes.map(r => r.referral_code).filter(Boolean);

// Find Gen 2 members
const { data: gen2Rows } = await admin
  .from("user_data")
  .select("user_id, username, avatar_url, updated_at, referred_by")
  .in("referred_by", gen1Codes);

// Check which Gen 2 are active
const gen2Ids = (gen2Rows || []).map(r => r.user_id);
const { data: gen2ActiveTopups } = await admin
  .from("top_up_requests")
  .select("user_id, amount_paid")
  .in("user_id", gen2Ids)
  .eq("status", "approved")
  .gte("approved_at", since30);

const activeGen2Ids = new Set(gen2ActiveTopups?.map(t => t.user_id) ?? []);
const gen2TotalPaidByUser = new Map<string, number>();
for (const t of gen2ActiveTopups || []) {
  gen2TotalPaidByUser.set(t.user_id, (gen2TotalPaidByUser.get(t.user_id) || 0) + asMoneyNumber(t.amount_paid));
}

// Build gen2Members map: gen1UserId → array of gen2 member objects
const gen2Members: Record<string, Array<{ user_id: string; username: string | null; avatar_url: string | null; joined_at: string | null; active: boolean; total_paid: number }>> = {};
for (const row of gen2Rows || []) {
  const gen1UserId = codeToGen1UserId.get(row.referred_by);
  if (!gen1UserId) continue;
  if (!gen2Members[gen1UserId]) gen2Members[gen1UserId] = [];
  gen2Members[gen1UserId].push({
    user_id: row.user_id,
    username: row.username || null,
    avatar_url: row.avatar_url || null,
    joined_at: row.updated_at || null,
    active: activeGen2Ids.has(row.user_id),
    total_paid: gen2TotalPaidByUser.get(row.user_id) || 0,
  });
}

const gen2ActiveCount = activeGen2Ids.size;
```

Add `gen2Members`, `gen2ActiveCount`, `gen2OverrideRate: OVERRIDE_RATES_GEN2[rank]`, `thisMonthGen2Override` to the return object.

---

## Part 4 — Family Tree Tab in `app/affiliate/dashboard/page.tsx`

### Add "Family Tree" tab alongside existing sections

Add a tab switcher at the top of the dashboard (after the rank progress bar):

```tsx
type DashTab = "overview" | "tree";
const [dashTab, setDashTab] = useState<DashTab>("overview");
```

Tab buttons:
```tsx
<div className="flex gap-2">
  <button onClick={() => setDashTab("overview")} style={dashTab === "overview" ? { background: "#1877F2", color: "#fff" } : { background: "#F8FAFC", color: "#65676B", border: "1px solid #E4E6EB" }} className="px-4 py-2 rounded-xl text-sm font-bold">
    Overview
  </button>
  <button onClick={() => setDashTab("tree")} style={dashTab === "tree" ? { background: "#1877F2", color: "#fff" } : { background: "#F8FAFC", color: "#65676B", border: "1px solid #E4E6EB" }} className="px-4 py-2 rounded-xl text-sm font-bold">
    Family Tree
  </button>
</div>
```

Wrap existing income cards + team section + earnings/payouts tables in `{dashTab === "overview" && ...}`.

### Family Tree tab content `{dashTab === "tree" && ...}`:

#### Stats strip (4 cards in a row):
- Gen 1 Members: `stats.members.length`
- Gen 2 Members: total count across all gen2Members
- Active Gen 2: `stats.gen2ActiveCount`
- Est. Gen 2 Override this month: `formatPhp(stats.thisMonthGen2Override)` — sub: `${Math.round(stats.gen2OverrideRate * 100)}% of Gen 2 top-ups` (if rank < Leader: "Unlocks at Leader rank")

#### Tree list:

For each Gen 1 member (from `stats.members`):
- Render a collapsible row
- Click to expand/collapse their Gen 2 members
- Use local state: `const [expanded, setExpanded] = useState<Set<string>>(new Set())`

**Gen 1 row:**
```
[Avatar] [Username]          [Rank badge] [X referrals] [Active/Inactive badge]
         Joined [date]       [▼ expand if has gen2]
```

**Gen 2 rows (indented, shown when expanded):**
```
  └── [Avatar] [Username]    [Active/Inactive] [Spent ₱X]
               Joined [date]
```

**Empty Gen 2:** show "Walang team pa si [username]." in muted text, indented.

**Empty Gen 1 state:** "Wala ka pang team. I-share ang iyong Partner Link para magsimula."

#### Rank badge colors (reuse existing RANK_STYLES):
- Partner: gray
- Hustler: blue  
- Leader: orange
- Educator: purple
- Top Leader: red

Use each Gen 1 member's `total_paid_referrals` to compute their rank via `getRankForPaidReferrals` for the badge — import it or compute inline:
```ts
function getRankLabel(referrals: number): string {
  if (referrals >= 50) return "Top Leader";
  if (referrals >= 25) return "Educator";
  if (referrals >= 10) return "Leader";
  if (referrals >= 3) return "Hustler";
  return "Partner";
}
```

#### Update AffiliateStats type to include new fields:
```ts
gen2Members: Record<string, Array<{ user_id: string; username: string | null; avatar_url: string | null; joined_at: string | null; active: boolean; total_paid: number }>>;
gen2ActiveCount: number;
gen2OverrideRate: number;
thisMonthGen2Override: number;
```

---

## Part 5 — Update Join Page `app/affiliate/page.tsx`

In the commission display (Stream 2 — Team Override section), update to show both Gen 1 and Gen 2 rates:

Replace the existing Stream 2 grid with:

| Rank | Gen 1 Override | Gen 2 Override |
|---|---|---|
| Leader (10 refs) | 5% of direct team | 4% of their teams |
| Educator (25 refs) | 8% of direct team | 6% of their teams |
| Top Leader (50 refs) | 12% of direct team | 10% of their teams |

---

## Part 6 — Update Admin Dashboard Override Payouts tab

In `app/admin/AdminDashboardClient.tsx`, the Override Payouts table already shows override rows. Add a "Type" column showing "Gen 1" or "Gen 2" badge.

The `affiliateOverridePayouts` type already exists — add `overrideType: string` field to it.

In `app/api/admin/stats/route.ts`, when fetching `affiliate_overrides`, select `override_type` and map it to `overrideType` in the response.

In the table, add a "Type" column:
```tsx
<span className="px-2 py-1 rounded-full text-xs font-bold" style={override.overrideType === "gen2" ? { background: "#F5F3FF", color: "#7C3AED" } : { background: "#FFF7ED", color: "#D97706" }}>
  {override.overrideType === "gen2" ? "Gen 2" : "Gen 1"}
</span>
```

---

## Acceptance Checks

1. `grep -n "OVERRIDE_RATES_GEN2" lib/affiliate.ts` — gen2 rates defined
2. `grep -n "override_gen2" app/api/cron/affiliate-overrides/route.ts` — gen2 cron logic exists
3. `grep -n "gen2Members" app/api/affiliate/stats/route.ts` — gen2 data in stats
4. `grep -n "Family Tree" app/affiliate/dashboard/page.tsx` — tree tab exists
5. `grep -n "dashTab" app/affiliate/dashboard/page.tsx` — tab state exists
6. `grep -n "Gen 2 Override" app/affiliate/page.tsx` — join page updated
7. `npx tsc --noEmit` — zero TypeScript errors

## Notes
- DO NOT change `grantAffiliateCommissions` signature
- Gen 2 override is monthly (cron only) — not real-time like level 2 topup commission
- Level 2 topup (10% instant) stays unchanged — it's separate from Gen 2 monthly override
- Keep all existing Gen 1 override logic intact — only add Gen 2 alongside it
- Family Tree is read-only display — no actions needed
- Cap tree display at 2 generations — do not recurse further
