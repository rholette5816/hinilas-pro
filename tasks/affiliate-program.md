# Task: Affiliate Program — Cash Commissions + Payout System

## Overview

Build a 2-level cash affiliate program for Hinilas Pro. Affiliates earn real money (GCash) when their referrals pay. Anti-spam via unique GCash number per affiliate. Manual payout approval by admin.

---

## Supabase Tables (create these manually or via migration)

### `affiliates`
```sql
create table affiliates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  gcash_number text not null unique,
  gcash_name text not null,
  status text not null default 'active', -- active | suspended
  rank text not null default 'Starter', -- Starter | Hustler | Pro | Elite
  total_paid_referrals int not null default 0,
  joined_at timestamptz not null default now()
);
```

### `affiliate_earnings`
```sql
create table affiliate_earnings (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references affiliates(id) not null,
  from_user_id uuid references auth.users not null,
  type text not null, -- flex_sale | topup_direct | topup_level2
  source_amount numeric not null,
  amount_earned numeric not null,
  status text not null default 'pending', -- pending | paid
  created_at timestamptz not null default now()
);
```

### `affiliate_payouts`
```sql
create table affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references affiliates(id) not null,
  user_id uuid references auth.users not null,
  amount numeric not null,
  gcash_number text not null,
  gcash_name text not null,
  status text not null default 'requested', -- requested | paid
  requested_at timestamptz not null default now(),
  paid_at timestamptz
);
```

---

## Commission Rules

| Event | Commission |
|---|---|
| Direct referral buys Flex ₱499 | ₱250 flat (50%) |
| Direct referral buys any top-up | 20% of amount_paid |
| Level 2 — affiliate's member's member top-ups | 10% of amount_paid |

**Rank bonuses (added on top of base ₱250 Flex commission):**
| Rank | Paid Referrals Required | Bonus per Flex Sale |
|---|---|---|
| Starter | 0 | +₱0 |
| Hustler | 5 | +₱25 |
| Pro | 15 | +₱50 |
| Elite | 30 | +₱75 |

**Payout rules:**
- Minimum payout: ₱200
- 7-day hold: earnings created within last 7 days are not withdrawable
- Payout only to registered GCash number — no changes without admin approval

---

## Fraud Prevention

- `gcash_number` is UNIQUE in `affiliates` table — one GCash = one affiliate account
- Before inserting earnings: check if `affiliate.user_id === from_user_id` — if same, skip (self-referral)
- Payout requires manual admin approval — suspicious patterns caught at this step

---

## Files to Create

---

### 1. `app/api/affiliate/register/route.ts`

POST endpoint. Authenticated. Body: `{ gcashNumber, gcashName }`.

- Get user from supabase auth
- Check if user already has an affiliate row → return error "Already registered"
- Check if gcash_number already exists in affiliates → return error "GCash number already registered to another account"
- Insert into `affiliates` with status "active", rank "Starter"
- Return `{ success: true }`

---

### 2. `app/api/affiliate/stats/route.ts`

GET endpoint. Authenticated.

- Get user from supabase auth
- Get affiliate row for user (if none, return `{ notAffiliate: true }`)
- Get all `affiliate_earnings` for this affiliate
- Get all `affiliate_payouts` for this affiliate
- Get list of direct members (users whose `referred_by` = this user's referral_code) with their username, avatar_url, joined date, and total_paid (sum of their topup amounts)
- Calculate:
  - `totalEarned`: sum of all earnings
  - `totalPaid`: sum of paid payouts
  - `pendingBalance`: totalEarned - totalPaid (only earnings older than 7 days)
  - `holdBalance`: earnings within last 7 days (not yet withdrawable)
  - `rank`: current rank
  - `totalPaidReferrals`: count
  - `nextRank`: next rank name + referrals needed
- Return all of the above plus `earnings[]`, `payouts[]`, `members[]`

---

### 3. `app/api/affiliate/payout/route.ts`

POST endpoint. Authenticated.

- Get user + affiliate row
- Check pendingBalance >= 200 → if not, return error "Minimum payout is ₱200"
- Check no existing payout with status "requested" → if exists, return error "You already have a pending payout request"
- Insert into `affiliate_payouts` with status "requested"
- Send Telegram notification:
  ```
  💸 Affiliate Payout Request
  
  Affiliate: [username] ([email])
  GCash: [gcash_name] - [gcash_number]
  Amount: ₱[amount]
  
  Go to admin to approve.
  ```
- Return `{ success: true }`

Use the existing `sendTelegramNotification` pattern from `app/api/topup/route.ts`.

---

### 4. `app/api/affiliate/payout/approve/route.ts`

POST endpoint. Admin only (`isOwnerUser` check via service role).

Body: `{ payoutId }`

- Verify owner
- Get payout row
- Update status to "paid", set paid_at = now()
- Update all `affiliate_earnings` for this affiliate where status = "pending" and created_at <= (now - 7 days) → set status = "paid"
- Send email to affiliate (use Resend):
  - Subject: "Your Hinilas Pro affiliate payout has been sent"
  - Body: "Napadala na ang ₱[amount] sa iyong GCash ([gcash_number]). Salamat sa pag-refer!"
  - From: `ken@hinilas.pro`
- Return `{ success: true }`

---

### 5. `app/affiliate/page.tsx` — Join Page

Client component. Route: `/affiliate`

**If not yet an affiliate:**
Show join form:
- Heading: "Earn cash with Hinilas Pro"
- Subheading: "Refer someone. Pag nagbayad sila ₱499, ₱250 agad sayo."
- Commission table (3 rows: Flex sale, direct top-up 20%, level 2 top-up 10%)
- Rank table (Starter → Hustler → Pro → Elite with requirements and bonuses)
- Input: GCash Number (numeric, 11 digits)
- Input: GCash Name (full name as it appears on GCash)
- Submit button: "Join Affiliate Program"
- Note: "Your GCash number is used for payouts. Make sure it's correct — it cannot be changed without admin approval."
- On success: show success state + link to /affiliate/dashboard

**If already an affiliate:**
Redirect to `/affiliate/dashboard`

---

### 6. `app/affiliate/dashboard/page.tsx` — Affiliate Dashboard

Client component.

**Header section:**
- Rank badge (Starter/Hustler/Pro/Elite with color)
- Progress to next rank: "X more paid referrals to [NextRank]"
- Referral link with copy button: `https://hinilas.pro/ref/[referral_code]`

**4 stat cards:**
- Total Earned: ₱[totalEarned]
- Available to Withdraw: ₱[pendingBalance]
- On Hold (7 days): ₱[holdBalance]
- Total Paid Out: ₱[totalPaid]

**Payout request section:**
- If pendingBalance >= 200: show "Request Payout — ₱[pendingBalance]" orange button
- If pendingBalance < 200: show "Minimum ₱200 to withdraw. ₱[200 - pendingBalance] more to go."
- If pending payout exists: show yellow banner "Payout of ₱[amount] is being processed."

**Members section:**
- List of direct referrals (username, avatar, joined date, total they've spent)
- Empty state: "No members yet. Share your referral link to start earning."

**Earnings history:**
- Table: date, type (Flex Sale / Top-up / Level 2), from (masked email), amount, status (pending/paid)

**Payouts history:**
- Table: date, amount, GCash, status

---

### 7. `app/api/topup/approve/route.ts` — Wire in affiliate commissions

After credits are granted to the buyer, add this logic:

```ts
// --- AFFILIATE COMMISSION ---
// Check if buyer was referred
const { data: buyerData } = await supabase
  .from("user_data")
  .select("referred_by")
  .eq("user_id", request.user_id)
  .single();

if (buyerData?.referred_by) {
  // Find the referrer's user_id via referral_code
  const { data: referrer } = await supabase
    .from("user_data")
    .select("user_id")
    .eq("referral_code", buyerData.referred_by)
    .single();

  if (referrer) {
    // Find referrer's affiliate row
    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id, rank, total_paid_referrals, status")
      .eq("user_id", referrer.user_id)
      .single();

    if (affiliate && affiliate.status === "active") {
      // Determine commission amount
      let commission = 0;
      let type = "";

      if (request.credits_requested === 150) {
        // Flex sale — flat ₱250 + rank bonus
        const rankBonus: Record<string, number> = { Starter: 0, Hustler: 25, Pro: 50, Elite: 75 };
        commission = 250 + (rankBonus[affiliate.rank] ?? 0);
        type = "flex_sale";

        // Update paid referral count + rank
        const newCount = affiliate.total_paid_referrals + 1;
        const newRank = newCount >= 30 ? "Elite" : newCount >= 15 ? "Pro" : newCount >= 5 ? "Hustler" : "Starter";
        await supabase
          .from("affiliates")
          .update({ total_paid_referrals: newCount, rank: newRank })
          .eq("id", affiliate.id);
      } else {
        // Top-up — 20% of amount paid
        commission = Math.round(Number(amount) * 0.2);
        type = "topup_direct";
      }

      if (commission > 0) {
        await supabase.from("affiliate_earnings").insert({
          affiliate_id: affiliate.id,
          from_user_id: request.user_id,
          type,
          source_amount: Number(amount),
          amount_earned: commission,
          status: "pending",
        });
      }

      // --- LEVEL 2: check if this referrer was also referred by someone ---
      const { data: referrerData } = await supabase
        .from("user_data")
        .select("referred_by")
        .eq("user_id", referrer.user_id)
        .single();

      if (referrerData?.referred_by && type !== "flex_sale") {
        // Level 2 only applies to top-ups, not Flex sale
        const { data: grandReferrer } = await supabase
          .from("user_data")
          .select("user_id")
          .eq("referral_code", referrerData.referred_by)
          .single();

        if (grandReferrer) {
          const { data: grandAffiliate } = await supabase
            .from("affiliates")
            .select("id, status")
            .eq("user_id", grandReferrer.user_id)
            .single();

          if (grandAffiliate && grandAffiliate.status === "active") {
            const level2Commission = Math.round(Number(amount) * 0.1);
            if (level2Commission > 0) {
              await supabase.from("affiliate_earnings").insert({
                affiliate_id: grandAffiliate.id,
                from_user_id: request.user_id,
                type: "topup_level2",
                source_amount: Number(amount),
                amount_earned: level2Commission,
                status: "pending",
              });
            }
          }
        }
      }
    }
  }
}
// --- END AFFILIATE COMMISSION ---
```

---

### 8. `components/Sidebar.tsx`

Add nav item after Campaign Setup:
```ts
{ href: "/affiliate", label: "Affiliate Program", desc: "Earn cash per referral",
  icon: <svg ...money/cash icon...> }
```

---

### 9. Admin Dashboard — Payouts Tab

In `app/admin/AdminDashboardClient.tsx`, add a 5th tab "Payouts" (after Users tab).

Fetch from `affiliate_payouts` joined with affiliate info.

Show a table:
- Affiliate name + email
- GCash name + number
- Amount requested
- Date requested
- Status badge
- "Mark as Paid" button → calls `POST /api/affiliate/payout/approve` with payoutId

---

## Acceptance Checks

1. `grep -n "affiliate_earnings" app/api/topup/approve/route.ts` — commission logic wired in
2. `ls app/affiliate/page.tsx app/affiliate/dashboard/page.tsx` — pages exist
3. `ls app/api/affiliate/register/route.ts app/api/affiliate/stats/route.ts app/api/affiliate/payout/route.ts` — API routes exist
4. `npx tsc --noEmit` — zero TypeScript errors
5. Manual verify:
   - Register as affiliate with a GCash number
   - Try registering same GCash number on different account → should be blocked
   - Approve a Flex topup for a referred user → affiliate_earnings row created with ₱250
   - Approve a top-up → 20% commission logged
   - Request payout with < ₱200 → blocked
   - Admin Payouts tab shows pending requests

## Notes

- Do NOT remove existing referral credit logic from `app/auth/callback/route.ts` — signup credit referral rewards are separate (credits, not cash)
- The `referred_by` field on `user_data` is the referral code string — use it to look up the referrer's user_id via `referral_code` column
- All commission math uses `Number(amount)` to avoid string/numeric type issues
- Telegram notification for payout requests reuses the `sendTelegramNotification` function pattern already in `app/api/topup/route.ts` — copy the pattern
