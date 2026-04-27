# Task: free-tier-credit-drip

## Goal
Split the existing 30-credit signup grant into a 15+15 drip: 15 on signup, 15 more granted automatically after the user's first successful credit deduction (any module). Total free credits stays at 30.

## Why
Today, new users get 30 credits all at once on signup. Many sign up, never generate anything, and the credits sit unused. By gating the second 15 behind a real action, we filter signup-and-leave accounts and force engagement. Active users get the full 30; ghost accounts only cost us 15 worth of API budget. Engagement signals also help us qualify which signups become buyers.

## REQUIRED USER ACTION (before Codex runs)
Ken must run this Supabase SQL migration in the Supabase dashboard before this code change ships:

```sql
ALTER TABLE user_data
  ADD COLUMN IF NOT EXISTS welcome_drip_granted boolean NOT NULL DEFAULT false;
```

Codex cannot run this. Ken runs it manually in Supabase SQL editor before merging the code change.

## Files to modify
- `web-hilas/app/auth/callback/route.ts` - change the new-user signup grant from 30 to 15. Update the welcome email body to say "15 free credits to start, plus 15 more after your first generation" instead of "30 free credits".
- `web-hilas/lib/credits.ts` - inside `deductCreditsAtomic`, after a successful deduction + transaction insert, check if `welcome_drip_granted` is false. If so, grant 15 credits via `grantCreditsAtomic` and flip the flag to true. This must be best-effort - if the drip grant fails, the original deduction still succeeds. Do not block the deduction on the drip outcome.

## Files to create
None.

## Files to delete
None.

## Exact changes

### `app/auth/callback/route.ts`

Find this block (currently around lines 80-90):

```ts
    await adminSupabase.from("user_data").upsert({
      user_id: user.id,
      credits_remaining: 30,
      credits_total: 30,
      plan: "lite",
      referral_code: referralCode,
      referred_by: referredBy,
      referral_rewarded: false,
      username,
      avatar_url,
    }, { onConflict: "user_id" });

    await adminSupabase.from("credit_transactions").insert({
      user_id: user.id,
      type: "grant",
      amount: 30,
      description: "Welcome credits — 30 free credits on signup",
    });
```

Replace with:

```ts
    await adminSupabase.from("user_data").upsert({
      user_id: user.id,
      credits_remaining: 15,
      credits_total: 15,
      plan: "lite",
      referral_code: referralCode,
      referred_by: referredBy,
      referral_rewarded: false,
      welcome_drip_granted: false,
      username,
      avatar_url,
    }, { onConflict: "user_id" });

    await adminSupabase.from("credit_transactions").insert({
      user_id: user.id,
      type: "grant",
      amount: 15,
      description: "Welcome credits - 15 free credits on signup (15 more after first generation)",
    });
```

Also find the welcome email line (currently around line 204):

```
      <p style="font-size: 16px; line-height: 1.6;">Binigyan kita ng <strong>30 free credits</strong> para masimulan mo agad. Yan ang panggastos mo sa research, angles, image, at copy generation.</p>
```

Replace with:

```
      <p style="font-size: 16px; line-height: 1.6;">Binigyan kita ng <strong>15 free credits</strong> para masimulan mo agad. Pag nag-generate ka ng kahit ano (research, angle, copy, o image), automatic na may dagdag pang <strong>15 credits</strong> - total 30 free credits para sa simula mo.</p>
```

Do NOT change anything else in the file (referral grant, Meta event, email subject, etc).

### `lib/credits.ts`

Find the success-return block at the end of `deductCreditsAtomic` (currently around lines 78-79):

```ts
    return { ok: true, creditsRemaining: nextCredits };
  }

  return { ok: false, code: "CONFLICT" };
}
```

Replace with:

```ts
    // Drip second-half welcome credits if this is the user's first successful deduction.
    void maybeGrantWelcomeDrip(userId);

    return { ok: true, creditsRemaining: nextCredits };
  }

  return { ok: false, code: "CONFLICT" };
}

async function maybeGrantWelcomeDrip(userId: string): Promise<void> {
  try {
    const admin = adminClient();
    const { data, error } = await admin
      .from("user_data")
      .select("welcome_drip_granted")
      .eq("user_id", userId)
      .single();

    if (error || !data) return;
    if (data.welcome_drip_granted) return;

    // Atomically flip the flag. If another concurrent call won the race, our update returns no row and we skip.
    const { data: flipped, error: flipError } = await admin
      .from("user_data")
      .update({ welcome_drip_granted: true })
      .eq("user_id", userId)
      .eq("welcome_drip_granted", false)
      .select("user_id")
      .maybeSingle();

    if (flipError || !flipped) return;

    await grantCreditsAtomic({
      userId,
      amount: 15,
      description: "Welcome drip - 15 bonus credits unlocked after first generation",
    });
  } catch {
    // Drip failure must not affect the deduction outcome.
  }
}
```

Do NOT change `deductCreditsAtomic` body itself (the read/update/transaction insert logic). Only add the call to `maybeGrantWelcomeDrip` at the success branch and the new helper function below.

## Constraints
- Inherits from `AGENTS.md`.
- All hyphens in new strings must be ASCII `-`. NO em dashes.
- The drip grant is fire-and-forget (`void` prefix) - do not `await` it inside `deductCreditsAtomic`. The deduction result must return promptly even if the drip is slow.
- Use `grantCreditsAtomic` from the same file - do NOT inline manual credit math.
- The welcome email update is in the Tagalog `getWelcomeEmailHtml` function. Do not change other parts of the HTML.
- Do NOT modify the welcome email subject, the welcome_email_log behavior, or the email_log insert.
- Welcome credits go to the `user_data.welcome_drip_granted` boolean. The migration adds this column with default `false`. Existing users without this column being explicitly set will have `welcome_drip_granted = false`, which would trigger a drip on their next deduction. To prevent giving 15 free credits to existing users on their next action, Ken will run a one-time UPDATE after the migration to mark all existing users as `welcome_drip_granted = true`. (This update is run by Ken manually, NOT by Codex.)

## Acceptance criteria
- [ ] `grep -n "credits_remaining: 15" web-hilas/app/auth/callback/route.ts` returns at least one match.
- [ ] `grep -n "amount: 15" web-hilas/app/auth/callback/route.ts` returns at least one match (the welcome grant log).
- [ ] `grep -n "credits_remaining: 30" web-hilas/app/auth/callback/route.ts` returns nothing (old 30 grant gone).
- [ ] `grep -n "welcome_drip_granted: false" web-hilas/app/auth/callback/route.ts` returns at least one match.
- [ ] `grep -n "maybeGrantWelcomeDrip" web-hilas/lib/credits.ts` returns at least 2 matches (definition + call site).
- [ ] `grep -n "welcome_drip_granted" web-hilas/lib/credits.ts` returns matches.
- [ ] `cd web-hilas && npx tsc --noEmit` passes with no new errors.
- [ ] No em dashes added in modified files.

## Out of scope
- Pricing page UI/copy changes (separate task: pricing-page-ux).
- Tier lock 30 days (separate task: tier-lock-30-days).
- Tiered top-up packages (separate task: pricing-page-ux).
- Backfilling existing users (Ken does this manually after migration).
- Changing other welcome email content beyond the credit-amount line.

## Notes for Codex
- The drip helper must be defined in the same `lib/credits.ts` file. Do NOT create a new file.
- The deliberate concurrency guard (`.eq("welcome_drip_granted", false)` in the UPDATE) ensures only one of N concurrent first-deductions flips the flag. The losers see `flipped = null` and skip the grant. This prevents double-grants under load.
- After this task ships, Ken will run a one-time SQL update to mark all current users as `welcome_drip_granted = true` so they don't get bonus 15 credits on their next deduction. Document this in the commit message body.
- Email copy uses Tagalog. Keep the brand tone informal and direct.
