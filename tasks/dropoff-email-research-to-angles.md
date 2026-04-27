# Task: dropoff-email-research-to-angles

## Goal
Build an automated daily email that nudges users who ran Research but never ran Angles, with deduplication so each user gets the email at most once. Cron-triggered, sends via Resend, logged to a new Supabase `email_log` table.

## Why
The Hinilas Pro funnel has a 47% drop-off between Research and Angles. Every day, users complete Research and never come back. A timely, personal Taglish email from Ken can pull a percentage of them back into the flow. This is the first step in a larger drop-off email automation; we ship this segment first, prove it works, then expand.

## Files to create
- `app/api/cron/dropoff-emails/route.ts`
  - Server route, GET handler.
  - Auth: check `Authorization: Bearer ${process.env.CRON_SECRET}` header. If missing or wrong, return 401.
  - Logic:
    1. Use Supabase admin client (service role key).
    2. Query `credit_transactions` to find user_ids whose latest "Research generation" deduction was at least 24 hours ago AND who have NO row in `credit_transactions` with description like "Angles%" (case-insensitive).
    3. Filter out user_ids that already have a row in `email_log` with `email_type = 'research_to_angles_nudge'`.
    4. For each matching user, fetch their email and name from `auth.users` via `supabase.auth.admin.getUserById(user_id)` (use the service role auth admin API).
    5. Send email via Resend (use `RESEND_API_KEY` env var, already in Vercel).
    6. Insert a row into `email_log` to prevent re-sending.
  - Return JSON: `{ processed: number, skipped: number, errors: string[] }`.
  - `export const maxDuration = 60`.

- `supabase/migrations/<timestamp>_create_email_log.sql` (or describe the table in `tasks/dropoff-email-research-to-angles-migration.sql` if no migrations folder exists)
  - Table: `email_log`
  - Columns:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
    - `email_type TEXT NOT NULL`
    - `sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - Indexes:
    - `CREATE INDEX idx_email_log_user_type ON email_log (user_id, email_type);`
  - Enable Row Level Security on the table. No public policies (only service role accesses it).

- `vercel.json` (create if missing, otherwise modify)
  - Add a cron entry that hits `/api/cron/dropoff-emails` daily at 1 AM UTC (which is 9 AM Philippine time).
  - Schema:
    ```json
    {
      "crons": [
        {
          "path": "/api/cron/dropoff-emails",
          "schedule": "0 1 * * *"
        }
      ]
    }
    ```
  - Vercel cron jobs auto-include the `Authorization: Bearer <CRON_SECRET>` header when `CRON_SECRET` env var is set, but the route must verify it.

## Files to modify
- None. (No existing files need editing.)

## Email content (Taglish, in Ken's voice)

**Subject:** `Ken, you did the hard part. Angles takes 1 minute.`
(Replace `Ken` with the user's first name from their auth profile metadata. If no first name, fall back to `Hi`.)

**HTML body** (use a clean, minimal HTML email — no big headers, no marketing fluff, looks like a personal note):

```
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1F2937;">
  <p style="font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>

  <p style="font-size: 16px; line-height: 1.6;">Pansin ko nag-research ka na sa Hinilas Pro pero hindi ka pa nakakapag-generate ng angles.</p>

  <p style="font-size: 16px; line-height: 1.6;">Sayang yung research mo kung di mo gagamitin. Ang totoo, doon mismo nakatago yung mga winning angles na pwede mong i-launch agad.</p>

  <p style="font-size: 16px; line-height: 1.6;"><strong>1 minuto lang.</strong> Pindutin mo lang yung button at automatic generated yung angles based sa research mo.</p>

  <p style="margin: 32px 0;">
    <a href="https://hinilas.pro/angles" style="display: inline-block; background: #F5A623; color: #000; font-weight: bold; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px;">Generate My Angles →</a>
  </p>

  <p style="font-size: 16px; line-height: 1.6;">Kung may tanong ka, reply ka lang dito. Sagot ko personally.</p>

  <p style="font-size: 16px; line-height: 1.6;">— Ken<br/><span style="color: #6B7280; font-size: 14px;">Founder, Hinilas Pro</span></p>

  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0 16px;" />

  <p style="font-size: 12px; color: #9CA3AF; line-height: 1.5;">You're receiving this because you signed up for Hinilas Pro and haven't completed your campaign workflow. <a href="https://hinilas.pro/home" style="color: #9CA3AF;">Visit your dashboard</a>.</p>
</div>
```

**From:** `Ken from Hinilas Pro <onboarding@resend.dev>` (use existing Resend domain until custom domain is set up).
**Reply-To:** `kevinrholette@gmail.com`

## Constraints
- Inherits from `AGENTS.md`.
- No em dashes anywhere in code, HTML, or text content. Use hyphens or rewrite. (The email body above uses hyphen in "single dash" style.)
- No new dependencies. Resend is already installed.
- Do not modify existing API routes, components, or pages.
- Do not log full email bodies in console. Log only counts and user IDs.
- Use the existing service role admin client pattern: `createClient` from `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY`.
- The cron route must NOT crash if Resend fails for one user. Catch per-user errors, push to the `errors` array, continue.
- The route must be idempotent: running it twice on the same day should not double-send. The `email_log` check handles this.

## Reference patterns
- Existing Resend usage: `app/api/feedback/route.ts` lines 91-110.
- Service role client pattern: `app/api/feedback/route.ts` lines 7-11.

## Acceptance criteria
- [ ] `app/api/cron/dropoff-emails/route.ts` exists with GET handler and CRON_SECRET auth.
- [ ] `email_log` table SQL migration is created (in migrations folder or as a standalone .sql file).
- [ ] `vercel.json` has the cron entry pointing to the route.
- [ ] Route filters users correctly: ran research >24h ago, never ran angles, never received this specific email.
- [ ] Email is sent via Resend with the Taglish body shown above.
- [ ] After sending, a row is inserted into `email_log` with `email_type = 'research_to_angles_nudge'`.
- [ ] Per-user errors don't abort the whole batch.
- [ ] Returns JSON `{ processed, skipped, errors }`.
- [ ] `npx tsc --noEmit` passes.
- [ ] No em dashes in any new file: `grep -n "[—–]" app/api/cron/dropoff-emails/route.ts vercel.json` returns nothing.
- [ ] No new npm dependencies added.

## Out of scope
- Other drop-off segments (Setup never started, Setup never ran Research, etc.) — those are separate tasks.
- Unsubscribe page or unsubscribe link logic (the email shows a static dashboard link, full unsubscribe is a future task).
- Custom email domain setup.
- A/B testing different subject lines or body copy.
- Admin UI for viewing email_log.

## Notes for Codex
- The cron schedule `0 1 * * *` is 1 AM UTC = 9 AM Philippine Time (UTC+8).
- `CRON_SECRET` is an env var the user will add to Vercel. Document this in a comment at the top of the route file: `// Requires CRON_SECRET env var in Vercel`.
- The user's first name is in `user.user_metadata?.full_name` from auth.users. Split on space and take the first chunk. If empty, default to `"Hi"`.
- Resend's `from` field requires a verified domain. The existing feedback route uses `onboarding@resend.dev` which works without a custom domain. Keep that pattern.
- Don't fetch ALL users every run — filter at the SQL level for performance once the user base grows.
- The migration SQL file location: if there's no `supabase/migrations/` folder, create one. Otherwise put the SQL there. If neither works, create a single file `tasks/email_log_migration.sql` and document that the user must run it manually in Supabase SQL editor.
