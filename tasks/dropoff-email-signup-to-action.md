# Task: dropoff-email-signup-to-action

## Goal
Send a daily email to users who signed up at least 24 hours ago but have never used a single credit. Pulls back ghost users who signed up out of curiosity and never started.

## Why
Welcome email reaches every new user immediately. But many still don't take action. This cron catches the ghosts: users who signed up >24h ago, never used any of their 30 free credits, never even ran Research. They're the largest invisible leak in the funnel. A second nudge from Ken pulls some back.

## Files to create
- `app/api/cron/dropoff-emails-signup/route.ts`
  - Server route, GET handler.
  - Auth: check `Authorization: Bearer ${process.env.CRON_SECRET}` header. If missing or wrong, return 401.
  - Logic:
    1. Use Supabase admin client (service role).
    2. Get all users from `auth.users` (via `supabase.auth.admin.listUsers()`) whose `created_at` is at least 24 hours ago.
    3. For each user, check if they have ANY row in `credit_transactions` with `type = 'use'`. Skip users who have any such row.
    4. Filter out users who already have an `email_log` row with `email_type = 'signup_to_action_nudge'`.
    5. For each remaining user, send email via Resend.
    6. Insert a row into `email_log` with `email_type = 'signup_to_action_nudge'`.
  - `export const maxDuration = 60`.
  - From: `Ken from Hinilas Pro <ken@hinilas.pro>`
  - Reply-To: `kevinrholette@gmail.com`
  - Return JSON: `{ processed, skipped, errors }`.
  - Catch per-user errors, push to errors array, continue batch.
  - Pagination: `auth.admin.listUsers` returns up to 1000 by default. Loop with `page` parameter to handle larger user bases.

## Files to modify
- `vercel.json`
  - Add a third cron entry, staggered another 30 minutes after the second.
  - Schedule: `0 2 * * *` (2:00 AM UTC = 10:00 AM PH).
  - Final crons array:
    ```json
    "crons": [
      { "path": "/api/cron/dropoff-emails", "schedule": "0 1 * * *" },
      { "path": "/api/cron/dropoff-emails-angles", "schedule": "30 1 * * *" },
      { "path": "/api/cron/dropoff-emails-signup", "schedule": "0 2 * * *" }
    ]
    ```

## Email content (Taglish, Ken's voice)

**Subject:** `{first_name}, hindi mo pa nasimulan yung 30 free credits mo.`
(If no first_name, use `Hindi mo pa nasimulan yung 30 free credits mo.`)

**HTML body** (mirror style of existing emails — minimal, personal, single CTA):

```
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1F2937;">
  <p style="font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>

  <p style="font-size: 16px; line-height: 1.6;">Pansin ko nag-sign up ka sa Hinilas Pro pero hindi mo pa nasisimulan yung 30 free credits mo.</p>

  <p style="font-size: 16px; line-height: 1.6;">Madali lang. 1 minuto para sa Setup form, then automatic na yung research, angles, image, at copy mo. Generated ng AI base sa business mo.</p>

  <p style="font-size: 16px; line-height: 1.6;"><strong>Yung 30 credits mo - bonus yan.</strong> Hindi mo na kailangan magbayad para malaman kung anong angles ang pwedeng kumita sa product mo.</p>

  <p style="margin: 32px 0;">
    <a href="https://hinilas.pro" style="display: inline-block; background: #F5A623; color: #000; font-weight: bold; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px;">Start Setup Now &rarr;</a>
  </p>

  <p style="font-size: 16px; line-height: 1.6;">Kung may tanong ka or stuck ka kahit saan, reply ka lang dito. Sagot ko personally.</p>

  <p style="font-size: 16px; line-height: 1.6;">- Ken<br/><span style="color: #6B7280; font-size: 14px;">Founder, Hinilas Pro</span></p>

  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0 16px;" />

  <p style="font-size: 12px; color: #9CA3AF; line-height: 1.5;">You're receiving this because you signed up for Hinilas Pro and haven't started using your credits. <a href="https://hinilas.pro/home" style="color: #9CA3AF;">Visit your dashboard</a>.</p>
</div>
```

## Constraints
- Inherits from `AGENTS.md`.
- No em dashes anywhere in code, HTML, or text.
- No new dependencies. Resend is already installed.
- No new env vars (CRON_SECRET, RESEND_API_KEY already exist).
- No new Supabase tables. Reuse existing `email_log` table.
- Do not modify the existing two cron routes. Build separately.
- The cron must NOT crash if Resend fails for one user. Catch per-user errors, push to the `errors` array, continue.
- Must be idempotent.

## Reference patterns
- Mirror `app/api/cron/dropoff-emails/route.ts` and `app/api/cron/dropoff-emails-angles/route.ts` structure.
- Key difference: this one uses `supabase.auth.admin.listUsers()` to get the user list (not `credit_transactions`), then filters to those with no usage.
- For pagination of `auth.admin.listUsers`, follow the Supabase docs pattern: pass `{ page, perPage }` and loop until the returned array is shorter than `perPage`.

## Acceptance criteria
- [ ] `app/api/cron/dropoff-emails-signup/route.ts` exists, follows the same auth and structure pattern.
- [ ] Filters users correctly: signed up >24h ago, no credit_transactions with type='use', not previously emailed.
- [ ] `email_log` insert uses `email_type = 'signup_to_action_nudge'`.
- [ ] `vercel.json` has all three cron entries with the schedules listed above.
- [ ] Returns JSON `{ processed, skipped, errors }`.
- [ ] Per-user errors don't abort the batch.
- [ ] Pagination works for `auth.admin.listUsers` (handles >1000 users).
- [ ] `npx tsc --noEmit` passes.
- [ ] No em dashes: `grep -n "[—–]" app/api/cron/dropoff-emails-signup/route.ts vercel.json` returns nothing.
- [ ] No new npm dependencies.

## Out of scope
- Other drop-off segments (Setup→Research is overlapping, Creative→Copy, Copy→Campaign Setup — separate tasks).
- A/B testing variants.
- Unsubscribe page.
- Refactoring the three cron routes into a shared helper. Duplicate is fine for now.

## Notes for Codex
- Use `supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })` and loop pages until `users.length < perPage`.
- Filter the user list in memory by `user.created_at <= cutoffIso`. The auth admin API doesn't support filtering by created_at on the server side, so do it in code.
- For checking if a user has any `credit_transactions` row with type='use': do a single query getting all distinct user_ids who have used credits, build a Set, then test membership for each candidate. Avoids N+1 queries.
- The verified `from` domain is `ken@hinilas.pro`. Do not use `onboarding@resend.dev`.
- This email is intentionally generic about Setup vs Research — it just says "start your credits". The CTA points to the Setup page. If a user has filled Setup already, they land on a pre-filled form and can click "Generate Strategy" to move forward.
