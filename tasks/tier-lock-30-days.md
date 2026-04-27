# Task: tier-lock-30-days

## Goal
Lock a user's plan tier (Lite/Flex/Max) for 30 days from purchase, regardless of credit balance. After 30 days, fall back to the existing credit-based derivation. Top-ups do NOT lock the tier.

## Why
Today, tier is computed purely from `credits_remaining` via `derivePlanFromCredits()`. A user who buys Flex (150 credits) burns down to <50 and silently drops to Lite, losing access to features they paid for (Live Expert Consultation, full image generation). This punishes the most engaged paying users. Locking tier for 30 days from purchase makes Flex/Max behave like a 30-day plan window without auto-charge, and creates a natural re-purchase trigger.

## REQUIRED USER ACTION (before Codex runs)
Ken must run this Supabase SQL migration in the Supabase dashboard before this code change ships:

```sql
ALTER TABLE user_data
  ADD COLUMN IF NOT EXISTS locked_tier text,
  ADD COLUMN IF NOT EXISTS tier_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS user_data_tier_expires_idx
  ON user_data (tier_expires_at)
  WHERE tier_expires_at IS NOT NULL;
```

Codex cannot run this. Ken runs it manually in Supabase SQL editor before merging the code change. Codex's code change is safe to deploy after the migration runs (the column will exist, queries that reference it will work).

## Files to modify
- `web-hilas/lib/admin.ts` - rewrite `derivePlanFromCredits` to a new `deriveTier` function that takes both credits AND optional `lockedTier` + `tierExpiresAt`, with a backward-compat alias.
- `web-hilas/app/api/topup/approve/route.ts` - when a Flex (150 cr) or Max (500 cr) package is approved, set `locked_tier` and `tier_expires_at` on the user. Top-ups (50 cr or any other size) do NOT set these fields.
- `web-hilas/lib/context.tsx` - the global app context that exposes `plan` to client components. Update it to read `locked_tier` and `tier_expires_at` from `user_data` and pass them into the new `deriveTier`. Also expose a new field `tierLockExpiresAt` so UI can show countdowns.
- `web-hilas/app/api/admin/stats/route.ts` - if it currently calls `derivePlanFromCredits`, update the call to use the new `deriveTier` (passing `locked_tier`/`tier_expires_at` from each row).

## Files to create
None. (Migration is run manually by Ken, not via a code file.)

## Files to delete
None.

## Exact replacement for `lib/admin.ts`

Replace the contents of `web-hilas/lib/admin.ts` with this exact code:

```ts
type OwnerLikeUser = {
  email?: string | null;
  user_metadata?: {
    role?: string;
    is_owner?: boolean;
  } | null;
};

export const OWNER_EMAILS = ["kevinrholette@gmail.com"];

export function isOwnerUser(user: OwnerLikeUser | null | undefined) {
  if (!user) return false;

  const email = user.email?.toLowerCase().trim();
  const metadata = user.user_metadata;

  return Boolean(
    (email && OWNER_EMAILS.includes(email)) ||
    metadata?.role === "owner" ||
    metadata?.is_owner === true
  );
}

export type Tier = "Lite" | "Flex" | "Max";

const VALID_LOCKED_TIERS: ReadonlyArray<Tier> = ["Lite", "Flex", "Max"];

function normalizeLockedTier(value: string | null | undefined): Tier | null {
  if (!value) return null;
  const titled = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  return (VALID_LOCKED_TIERS as ReadonlyArray<string>).includes(titled) ? (titled as Tier) : null;
}

function isLockActive(tierExpiresAt: string | Date | null | undefined): boolean {
  if (!tierExpiresAt) return false;
  const expiry = typeof tierExpiresAt === "string" ? new Date(tierExpiresAt) : tierExpiresAt;
  if (Number.isNaN(expiry.getTime())) return false;
  return expiry.getTime() > Date.now();
}

export function deriveTier(
  credits: number,
  lockedTier?: string | null,
  tierExpiresAt?: string | Date | null
): Tier {
  const normalizedLock = normalizeLockedTier(lockedTier ?? null);
  if (normalizedLock && isLockActive(tierExpiresAt ?? null)) {
    return normalizedLock;
  }
  if (credits >= 300) return "Max";
  if (credits >= 50) return "Flex";
  return "Lite";
}

// Backward-compat alias. New code should call deriveTier.
export function derivePlanFromCredits(credits: number) {
  return deriveTier(credits);
}
```

## Exact change for `app/api/topup/approve/route.ts`

Find this block in the route (currently around lines 96-103):

```ts
  const newCredits = userData.credits_remaining + request.credits_requested;
  const newTotal = userData.credits_total + request.credits_requested;

  // Add credits
  await supabase
    .from("user_data")
    .update({ credits_remaining: newCredits, credits_total: newTotal })
    .eq("user_id", request.user_id);
```

Replace it with this block (which conditionally sets `locked_tier` and `tier_expires_at` for Flex/Max packages only):

```ts
  const newCredits = userData.credits_remaining + request.credits_requested;
  const newTotal = userData.credits_total + request.credits_requested;

  // Determine if this purchase locks a tier (Flex 150 or Max 500). Top-ups do not lock tier.
  let lockedTier: "Flex" | "Max" | null = null;
  if (request.credits_requested >= 500) lockedTier = "Max";
  else if (request.credits_requested >= 150) lockedTier = "Flex";

  const tierUpdate = lockedTier
    ? {
        locked_tier: lockedTier,
        tier_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }
    : {};

  // Add credits (and lock tier if applicable)
  await supabase
    .from("user_data")
    .update({
      credits_remaining: newCredits,
      credits_total: newTotal,
      ...tierUpdate,
    })
    .eq("user_id", request.user_id);
```

Do NOT touch any other part of the route file (referral grant, Meta event, Resend email, etc).

## Changes for `lib/context.tsx`

This file currently exposes `plan` to the rest of the app. You need to:
1. Add `locked_tier` and `tier_expires_at` to the SELECT on `user_data` queries.
2. Replace any call to `derivePlanFromCredits(credits)` with `deriveTier(credits, locked_tier, tier_expires_at)`.
3. Expose a new field `tierLockExpiresAt: Date | null` on the context so UI components can show countdowns.

The exact lines depend on the current file contents. Codex must:
- Read `web-hilas/lib/context.tsx` first.
- Find the place where `user_data` is fetched (look for `.from("user_data").select(...)`).
- Add `locked_tier, tier_expires_at` to the select string.
- Find where `plan` is computed/derived. Update to call `deriveTier` with the new fields.
- Add `tierLockExpiresAt` to the context value (parsed `Date` or `null`).
- Update the context's TypeScript type to include `tierLockExpiresAt`.

If `derivePlanFromCredits` is called and only `credits` is in scope, change the import to `deriveTier` and pass the locked tier fields.

## Changes for `app/api/admin/stats/route.ts`

This file references `derivePlanFromCredits` per a grep result. Update the call site:
- If it derives plan per-user, change to `deriveTier(row.credits_remaining, row.locked_tier, row.tier_expires_at)`.
- Make sure the SELECT statement on `user_data` includes `locked_tier, tier_expires_at`.
- Keep all other admin stats logic intact.

## Constraints
- Inherits from `AGENTS.md`.
- DO NOT change credit costs anywhere.
- DO NOT change the welcome credit grant in `app/auth/callback/route.ts` - that is a separate task.
- DO NOT modify the pricing page UI in this task - that is a separate task.
- DO NOT delete the old `derivePlanFromCredits` function. Keep it as a backward-compat alias that calls `deriveTier(credits)`. Existing call sites that don't have access to `locked_tier`/`tier_expires_at` will keep working with the old behavior (credit-based only).
- All hyphens in any new strings must be ASCII `-`. NO em dashes anywhere.
- Use ISO timestamps for `tier_expires_at` (`new Date(...).toISOString()`).
- Tier names use TitleCase ("Lite", "Flex", "Max") since `derivePlanFromCredits` already returns TitleCase. Do NOT change to lowercase.

## Acceptance criteria
- [ ] `grep -n "deriveTier" web-hilas/lib/admin.ts` returns matches (new function exists).
- [ ] `grep -n "derivePlanFromCredits" web-hilas/lib/admin.ts` returns matches (backward-compat alias still present).
- [ ] `grep -n "locked_tier" web-hilas/app/api/topup/approve/route.ts` returns matches.
- [ ] `grep -n "tier_expires_at" web-hilas/app/api/topup/approve/route.ts` returns matches.
- [ ] `grep -n "locked_tier" web-hilas/lib/context.tsx` returns matches (context reads the new fields).
- [ ] `grep -n "tierLockExpiresAt" web-hilas/lib/context.tsx` returns matches (new exposed field).
- [ ] `grep -rn "derivePlanFromCredits" web-hilas/app web-hilas/lib` shows no NEW callers added; existing ones either still call it (compat) OR are migrated to `deriveTier`.
- [ ] `cd web-hilas && npx tsc --noEmit` passes with no new errors.
- [ ] No em dashes added anywhere in modified files.

## Out of scope
- Pricing page UI updates (separate task).
- Lite "5 only" image cap removal (separate task).
- Tiered top-up packages (separate task).
- Free tier credit drip (separate task).
- Welcome credit amount change (separate task).
- Sidebar countdown UI (separate task - we just expose `tierLockExpiresAt`, the UI consumes it later).
- Renaming the `plan` column or migrating any DB casing.

## Notes for Codex
- The Supabase migration that adds `locked_tier` and `tier_expires_at` columns is run by Ken manually before this code is deployed. You can write code that references these columns even though the migration is out-of-band.
- If `lib/context.tsx` is large, read it first, find the relevant sections via grep (`derivePlanFromCredits`, `from("user_data")`, `plan:`), then make targeted edits.
- The `top_up_requests.credits_requested` column drives the lock logic. Threshold is `>= 500` for Max, `>= 150` for Flex, otherwise no lock. This handles future top-up sizes (e.g. 100 cr) without re-touching this code.
- 30 days = `30 * 24 * 60 * 60 * 1000` ms. Always write the literal expression, do not pre-compute.
- After the change, when a user purchases Flex twice in a row, the second purchase RESETS `tier_expires_at` to a new 30-day window from the second purchase moment (not extends from the first). This is intentional - simpler model, easier to explain.
