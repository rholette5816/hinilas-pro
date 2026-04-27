# Task: welcome-email

## Goal
Send a welcome email from Ken to every new user immediately after they sign up. Sets expectations, builds connection, reduces ghost users.

## Why
Right now new users sign up via Google OAuth, see the Setup form, and many disappear forever. They never hear from anyone. A personal welcome email from Ken arriving in their inbox 1 minute after signup builds trust, sets a clear next-step expectation, and dramatically reduces signup-to-ghost drop-off. This is the highest-leverage email since it touches every new user.

## Files to modify
- `app/auth/callback/route.ts`
  - Inside `handlePostAuth()`, AFTER the existing `if (isNew) { ... }` block sets up user_data and grants credits, AND AFTER the Meta CAPI event is sent, AND AFTER the referrer reward block — add a call to send the welcome email.
  - Use the existing Supabase admin client (already created in this function).
  - Wrap the email send in a try/catch — if email fails, do NOT crash the auth flow. Log the error to console.
  - Insert a row into `email_log` with `email_type = 'welcome'` after a successful send (deduplication safety in case of edge cases like re-running the callback).
  - Before sending: check `email_log` for an existing row with `user_id` and `email_type = 'welcome'`. If exists, skip. Idempotency.
  - Use `Resend` from the `resend` package (already installed). Initialize inside the function call to avoid top-level imports for this conditional path.
  - From: `Ken from Hinilas Pro <ken@hinilas.pro>`
  - Reply-To: `kevinrholette@gmail.com`

## Email content (Taglish, Ken's voice)

**Subject:** `Welcome to Hinilas Pro, {first_name}. Here's how to start.`
(If no first_name, use `Welcome to Hinilas Pro. Here's how to start.`)

**HTML body** (mirror the style of existing dropoff emails — minimal, personal):

```
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1F2937;">
  <p style="font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>

  <p style="font-size: 16px; line-height: 1.6;">Welcome sa Hinilas Pro. Si Ken ito - yung gumawa ng tool na ginagamit mo ngayon.</p>

  <p style="font-size: 16px; line-height: 1.6;">Binigyan kita ng <strong>30 free credits</strong> para masimulan mo agad. Yan ang panggastos mo sa research, angles, image, at copy generation.</p>

  <p style="font-size: 16px; line-height: 1.6;"><strong>Eto yung 4 na step na susundan mo:</strong></p>

  <ol style="font-size: 16px; line-height: 1.8; padding-left: 20px;">
    <li>Punan mo yung Setup form (1 minuto lang)</li>
    <li>I-run mo yung Market Research (1 credit)</li>
    <li>Pumili ng winning angle (1 credit)</li>
    <li>Generate yung ad image at copy</li>
  </ol>

  <p style="font-size: 16px; line-height: 1.6;">Pag tapos mo yung 4 steps, may complete campaign assets ka na - ready i-launch sa Meta Ads.</p>

  <p style="margin: 32px 0;">
    <a href="https://hinilas.pro" style="display: inline-block; background: #F5A623; color: #000; font-weight: bold; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px;">Start Setup Now &rarr;</a>
  </p>

  <p style="font-size: 16px; line-height: 1.6;">Kung may tanong ka, reply ka lang dito. Sagot ko personally.</p>

  <p style="font-size: 16px; line-height: 1.6;">- Ken<br/><span style="color: #6B7280; font-size: 14px;">Founder, Hinilas Pro</span></p>

  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0 16px;" />

  <p style="font-size: 12px; color: #9CA3AF; line-height: 1.5;">You're receiving this because you signed up for Hinilas Pro at <a href="https://hinilas.pro/home" style="color: #9CA3AF;">hinilas.pro</a>.</p>
</div>
```

## Constraints
- Inherits from `AGENTS.md`.
- No em dashes anywhere in code, HTML, or text.
- No new dependencies. Resend is already installed.
- No new env vars (RESEND_API_KEY already exists).
- No new Supabase tables. Reuse existing `email_log` table.
- The email send must NOT block or fail the auth flow. Wrap in try/catch.
- Idempotent: check `email_log` before sending. If user already received welcome email, skip.
- Do not log full email body. Log only counts and user IDs on errors.
- Do not modify the existing user_data, credit_transactions, or referral logic in this file.

## Reference patterns
- Resend usage and from-domain: `app/api/cron/dropoff-emails/route.ts` (lines 200-210).
- Service role admin client is already created in `handlePostAuth` as `adminSupabase`.
- HTML email styling: match `app/api/cron/dropoff-emails/route.ts` `getEmailHtml()` function.

## Acceptance criteria
- [ ] `app/auth/callback/route.ts` sends a welcome email when a new user is detected (`isNew === true`).
- [ ] Email send is wrapped in try/catch, doesn't crash auth flow on failure.
- [ ] Before sending, checks `email_log` for existing `welcome` email for that user. Skips if found.
- [ ] After sending, inserts `email_log` row with `email_type = 'welcome'`.
- [ ] Email is sent from `ken@hinilas.pro` (verified domain).
- [ ] Email subject and body match the spec above (Taglish, Ken's voice).
- [ ] First name is extracted from `user.user_metadata.full_name` (split on space, take first chunk). Falls back gracefully if missing.
- [ ] `npx tsc --noEmit` passes.
- [ ] No em dashes: `grep -n "[—–]" app/auth/callback/route.ts` returns nothing (or returns only pre-existing dashes that were already there — Codex must not introduce new ones).
- [ ] No new npm dependencies added.

## Out of scope
- Drip sequences (multi-email onboarding flow). Just one email for now.
- Email preview/editing UI.
- Custom unsubscribe page.
- A/B testing variants.
- Sending the welcome email to existing users retroactively. Only new signups going forward.

## Notes for Codex
- The trigger point is INSIDE the `if (isNew) { ... }` block in `handlePostAuth()`. Add the email send near the end of that block, after the referrer reward logic.
- Resend's `from` field requires the verified domain. Use `ken@hinilas.pro`. Do not use `onboarding@resend.dev`.
- Keep the email send tight and fast. The auth callback redirects to `/loading-screen` immediately, so the email send happens in the background. Do NOT await it in a way that blocks the response.
- Actually, re-read the route: the `await response` happens after `await handlePostAuth(...)`. So the email send IS awaited. That's fine for now since Resend is fast (~200-500ms). But wrap in try/catch so a Resend outage doesn't break signups.
- If Resend is down or returns an error, the user still completes signup. The email_log row is only inserted on success, so the next signup attempt (or a future retry mechanism) could pick it up.
