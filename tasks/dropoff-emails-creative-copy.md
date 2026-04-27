# Task: dropoff-emails-creative-copy

## Goal
Add the final two drop-off email crons:
1. Creative → Copy: targets users who generated an image but never wrote copy.
2. Copy → Campaign Setup: targets users who wrote copy but never opened campaign setup.

This completes the full funnel email coverage.

## Why
We've already built crons for Research, Angles, and Signup drop-offs. The two remaining gaps are after Creative (users have an image but no copy) and after Copy (users have all assets but never launched). Adding these two crons closes the entire funnel.

## Files to create

### 1. `app/api/cron/dropoff-emails-creative/route.ts`
Mirror `app/api/cron/dropoff-emails-angles/route.ts` exactly. Differences:
- `EMAIL_TYPE = "creative_to_copy_nudge"`
- Latest-step filter: `description = "Image generation"` (this is the description used by the creative page).
- Exclusion filter: users with `description ilike "Copy%"`.
- Throttle 600ms between sends (already in the angles cron).
- Subject: ``${name}, your image is ready. Add the words.``
- CTA link: `https://hinilas.pro/copy`
- Email body (Taglish):

```
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1F2937;">
  <p style="font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>

  <p style="font-size: 16px; line-height: 1.6;">Pansin ko nakapag-generate ka na ng image sa Hinilas Pro pero hindi ka pa nakakapag-write ng copy.</p>

  <p style="font-size: 16px; line-height: 1.6;">Yung image mo, magaganda. Pero kung walang copy, walang dahilan ang customer para mag-message. Yung copy ang nagbibigay ng konteksto at nag-uudyok sa kanila para mag-act agad.</p>

  <p style="font-size: 16px; line-height: 1.6;"><strong>1 minuto lang.</strong> Generate na natin yung copy mo. Naka-base na sa angle at image mo.</p>

  <p style="margin: 32px 0;">
    <a href="https://hinilas.pro/copy" style="display: inline-block; background: #F5A623; color: #000; font-weight: bold; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px;">Write My Copy &rarr;</a>
  </p>

  <p style="font-size: 16px; line-height: 1.6;">Kung may tanong ka, reply ka lang dito. Sagot ko personally.</p>

  <p style="font-size: 16px; line-height: 1.6;">- Ken<br/><span style="color: #6B7280; font-size: 14px;">Founder, Hinilas Pro</span></p>

  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0 16px;" />

  <p style="font-size: 12px; color: #9CA3AF; line-height: 1.5;">You're receiving this because you signed up for Hinilas Pro and haven't completed your campaign workflow. <a href="https://hinilas.pro/home" style="color: #9CA3AF;">Visit your dashboard</a>.</p>
</div>
```

### 2. `app/api/cron/dropoff-emails-copy/route.ts`
Mirror the same pattern. Differences:
- `EMAIL_TYPE = "copy_to_launch_nudge"`
- Latest-step filter: `description = "Copy generation"`.
- Exclusion filter: this one is different. There's no `Campaign Setup generation` credit transaction (campaign setup doesn't deduct credits per step — it has video unlocks at 1 credit each). To approximate "they opened campaign setup," we exclude users who have any `description ilike "Campaign%"` transaction. If they unlocked any campaign setup video, they likely engaged with the page.
- Throttle 600ms between sends.
- Subject: ``${name}, your campaign assets are done. One step left.``
- CTA link: `https://hinilas.pro/campaign-setup`
- Email body (Taglish):

```
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1F2937;">
  <p style="font-size: 16px; line-height: 1.6;">Hi {{first_name}},</p>

  <p style="font-size: 16px; line-height: 1.6;">Tapos na yung research, angles, image, at copy mo. Sobrang lapit mo na sa goal mo - i-launch yung first campaign mo.</p>

  <p style="font-size: 16px; line-height: 1.6;">Yung huling step lang yung kulang: i-set up mo na sa Meta Ads. May step-by-step guide kami para sa Messenger ads - hindi ka mawawala.</p>

  <p style="font-size: 16px; line-height: 1.6;"><strong>15 minuto lang.</strong> Pagkatapos non, live na yung first campaign mo.</p>

  <p style="margin: 32px 0;">
    <a href="https://hinilas.pro/campaign-setup" style="display: inline-block; background: #EF4444; color: #FFFFFF; font-weight: bold; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px;">Launch My Campaign &rarr;</a>
  </p>

  <p style="font-size: 16px; line-height: 1.6;">Pag stuck ka kahit saan, reply ka lang dito. Tutulungan kita personally.</p>

  <p style="font-size: 16px; line-height: 1.6;">- Ken<br/><span style="color: #6B7280; font-size: 14px;">Founder, Hinilas Pro</span></p>

  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0 16px;" />

  <p style="font-size: 12px; color: #9CA3AF; line-height: 1.5;">You're receiving this because you signed up for Hinilas Pro and haven't launched your campaign yet. <a href="https://hinilas.pro/home" style="color: #9CA3AF;">Visit your dashboard</a>.</p>
</div>
```

## Files to modify

- `vercel.json`
  - Add two more cron entries staggered 30 minutes apart, after the existing three.
  - New crons array (final state):
    ```json
    "crons": [
      { "path": "/api/cron/dropoff-emails", "schedule": "0 1 * * *" },
      { "path": "/api/cron/dropoff-emails-angles", "schedule": "30 1 * * *" },
      { "path": "/api/cron/dropoff-emails-signup", "schedule": "0 2 * * *" },
      { "path": "/api/cron/dropoff-emails-creative", "schedule": "30 2 * * *" },
      { "path": "/api/cron/dropoff-emails-copy", "schedule": "0 3 * * *" }
    ]
    ```

## Constraints
- Inherits from `AGENTS.md`.
- No em dashes anywhere.
- No new dependencies. No new env vars. No new tables.
- Reuse existing `email_log` table with new `email_type` values.
- Both routes must throttle 600ms between sends to stay under Resend's 2 req/s rate limit.
- Per-user errors don't abort the batch.
- Must be idempotent.

## Reference patterns
- Mirror `app/api/cron/dropoff-emails-angles/route.ts` for the exact route structure, including the throttle pattern with `firstSend` flag.
- Email HTML styling: same minimal style as existing dropoff emails.

## Acceptance criteria
- [ ] `app/api/cron/dropoff-emails-creative/route.ts` exists, filters Creative→Copy correctly.
- [ ] `app/api/cron/dropoff-emails-copy/route.ts` exists, filters Copy→Campaign Setup correctly.
- [ ] Both routes have 600ms throttle between sends.
- [ ] Both use `from: "Ken from Hinilas Pro <ken@hinilas.pro>"`.
- [ ] Both use `replyTo: "kevinrholette@gmail.com"`.
- [ ] `vercel.json` has all 5 cron entries with the schedules listed above.
- [ ] Both routes return JSON `{ processed, skipped, errors }`.
- [ ] `npx tsc --noEmit` passes.
- [ ] No em dashes: `grep -n "[—–]" app/api/cron/dropoff-emails-creative/route.ts app/api/cron/dropoff-emails-copy/route.ts vercel.json` returns nothing.
- [ ] No new npm dependencies.

## Out of scope
- Refactoring the cron routes into a shared helper.
- Unsubscribe page.
- A/B testing.
- Welcome email changes.

## Notes for Codex
- The Creative page deducts credits with `description: "Image generation"` (you can verify in `app/creative/page.tsx`). Use that exact string for filtering.
- The Copy page uses `description: "Copy generation"`.
- For the Copy→Campaign Setup cron, the exclusion check is approximate. We use any transaction with `description ilike "Campaign%"` as a proxy for "engaged with campaign setup." If they unlocked any video lesson there, they're considered engaged.
- Both routes inherit the throttle pattern: track a `firstSend` boolean, sleep 600ms between sends.
- Verified `from` domain: `ken@hinilas.pro`. Do not use `onboarding@resend.dev`.
