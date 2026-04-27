# Task: dropoff-email-angles-to-copy

## Goal
Add a second drop-off email automation that targets users who ran Angles but never ran Copy. Same pattern as the existing `/api/cron/dropoff-emails` route, with a new email type and matching filter logic.

## Why
After the Research-to-Angles cron, the next biggest funnel leak is Angles to Copy: 70% drop-off. Of 27 users who reach Angles, only 8 continue to Copy. A targeted Taglish email from Ken can recover a percentage of these users.

## Files to create
- `app/api/cron/dropoff-emails-angles/route.ts`
  - Server route, GET handler.
  - Same auth pattern as `app/api/cron/dropoff-emails/route.ts`: check `Authorization: Bearer ${process.env.CRON_SECRET}` header.
  - Logic:
    1. Use Supabase admin client (service role).
    2. Find user_ids whose latest "Angles generation" deduction is at least 24 hours ago.
    3. Filter out users who have any "Copy generation" transaction.
    4. Filter out users who already have an `email_log` row with `email_type = 'angles_to_copy_nudge'`.
    5. For each remaining user, fetch email/name from `auth.users`, send email via Resend, insert into `email_log`.
  - `export const maxDuration = 60`.
  - `from`: `"Ken from Hinilas Pro <ken@hinilas.pro>"` (verified domain).
  - `replyTo`: `kevinrholette@gmail.com`.
  - Return JSON: `{ processed, skipped, errors }`.
  - Catch per-user errors, push to errors array, continue batch.

## Files to modify
- `vercel.json`
  - Add a second cron entry alongside the existing one. New schedule: `30 1 * * *` (1:30 AM UTC = 9:30 AM PH). Stagger by 30 minutes so they don't run simultaneously.
  - Final crons array should look like:
    ```json
    "crons": [
      { "path": "/api/cron/dropoff-emails", "schedule": "0 1 * * *" },
      { "path": "/api/cron/dropoff-emails-angles", "schedule": "30 1 * * *" }
    ]
    ```

## Email content (Taglish, Ken's voice)

**Subject:** `{first_name}, you found your angle. Time to write the copy.`
(If no first name, use `Hi`.)

**HTML body** (mirror the style of the existing dropoff email — minimal, personal, single CTA):

```
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1F2937;">
  <p style="font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>

  <p style="font-size: 16px; line-height: 1.6;">Pansin ko nakapag-generate ka na ng angles sa Hinilas Pro pero hindi ka pa nakakapag-write ng copy.</p>

  <p style="font-size: 16px; line-height: 1.6;">Yung angle mo, walang silbi kung walang copy na pumupukaw. Yung copy ang nagiging dahilan kung bakit tumitigil ang scroll, at kung bakit nag-message yung customer.</p>

  <p style="font-size: 16px; line-height: 1.6;"><strong>1 minuto lang.</strong> I-generate na natin yung copy para sa angle mo. Ready na yung output mo bago ka pa makapag-coffee.</p>

  <p style="margin: 32px 0;">
    <a href="https://hinilas.pro/copy" style="display: inline-block; background: #F5A623; color: #000; font-weight: bold; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px;">Write My Copy &rarr;</a>
  </p>

  <p style="font-size: 16px; line-height: 1.6;">Kung may tanong ka, reply ka lang dito. Sagot ko personally.</p>

  <p style="font-size: 16px; line-height: 1.6;">- Ken<br/><span style="color: #6B7280; font-size: 14px;">Founder, Hinilas Pro</span></p>

  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0 16px;" />

  <p style="font-size: 12px; color: #9CA3AF; line-height: 1.5;">You're receiving this because you signed up for Hinilas Pro and haven't completed your campaign workflow. <a href="https://hinilas.pro/home" style="color: #9CA3AF;">Visit your dashboard</a>.</p>
</div>
```

## Constraints
- Inherits from `AGENTS.md`.
- No em dashes anywhere in code, HTML, or text.
- No new dependencies. Resend already installed.
- No new Supabase tables. Reuse existing `email_log` table with a new `email_type` value.
- Do not modify the existing `/api/cron/dropoff-emails/route.ts`. The new route is separate.
- The cron route must NOT crash if Resend fails for one user. Catch per-user errors, push to the `errors` array, continue.
- The route must be idempotent: running it twice on the same day must not double-send.

## Reference patterns
- Mirror `app/api/cron/dropoff-emails/route.ts` almost exactly. Only differences:
  - Filter on description = `"Angles generation"` for the latest-step query.
  - Exclusion filter: users with `description ilike "Copy%"`.
  - `EMAIL_TYPE` constant = `"angles_to_copy_nudge"`.
  - Email subject and body content.
  - CTA link goes to `https://hinilas.pro/copy`.

## Acceptance criteria
- [ ] `app/api/cron/dropoff-emails-angles/route.ts` exists and follows the same structure as the existing dropoff-emails route.
- [ ] Auth check uses `CRON_SECRET` (no new env var needed).
- [ ] Filters users correctly: ran Angles >24h ago, never ran Copy, never received this specific email.
- [ ] `email_log` insert uses `email_type = 'angles_to_copy_nudge'`.
- [ ] `vercel.json` has both cron entries, second one staggered at 1:30 AM UTC.
- [ ] Returns JSON `{ processed, skipped, errors }`.
- [ ] `npx tsc --noEmit` passes.
- [ ] No em dashes: `grep -n "[—–]" app/api/cron/dropoff-emails-angles/route.ts vercel.json` returns nothing.
- [ ] No new npm dependencies.

## Out of scope
- Other drop-off segments (e.g. Copy to Creative, Setup never reached).
- Refactoring the existing route into a shared helper. Duplicate is fine for now.
- Unsubscribe page logic.
- A/B testing variants.

## Notes for Codex
- The existing `/api/cron/dropoff-emails/route.ts` is the reference implementation. Copy its structure, change only what's listed above.
- The verified `from` domain is `ken@hinilas.pro`. Do not use `onboarding@resend.dev` — that only works for the owner's own email.
- Keep the same paging logic (`PAGE_SIZE = 1000`) for `credit_transactions` and `email_log` queries.
- The 30-minute stagger between the two crons gives Resend room to breathe and makes Vercel logs cleaner.
