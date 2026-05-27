# Task: Rate Limiting — All Remaining API Routes

## Context

`lib/rate-limit.ts` already exists with `checkRateLimit()` and `getRequestIp()`. The pattern is already used in `app/api/chat/route.ts`, `app/api/image/route.ts`, `app/api/video-generate/route.ts`, and `app/api/content/route.ts`.

This task applies rate limiting to all remaining public-facing routes that are missing it.

Do NOT touch:
- `app/api/admin/*` — owner-only, already protected by auth
- `app/api/cron/*` — already protected by cron secret + acquireCronLock
- `app/api/meta/event/route.ts` — CAPI internal
- `app/api/facebook-data-deletion/route.ts` — platform callback
- `app/api/blog/route.ts` — public read, low risk
- Any route already confirmed to have rate limiting (chat, image, video-generate, content, content-script, improve-feedback)

---

## How to Apply Rate Limiting

Follow this exact pattern used in `app/api/chat/route.ts`:

```ts
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

// Inside the handler, before any logic:
const ip = getRequestIp(request);
const rl = checkRateLimit(`route-name:${ip}`, { limit: X, windowMs: 60_000 });
if (!rl.ok) {
  return NextResponse.json(
    { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
    { status: 429 }
  );
}
```

For authenticated routes where `user.id` is available, key by user ID instead of IP:
```ts
const rl = checkRateLimit(`route-name:${user.id}`, { limit: X, windowMs: 60_000 });
```

Use user ID keying when the route already fetches the authenticated user early. Use IP keying for public routes with no auth.

---

## Routes and Limits

Apply rate limiting to each route below. Limits are per minute unless noted.

---

### GROUP 1 — Credit & Payment Routes (aggressive limits)

**`app/api/credits/use/route.ts`**
- Key: user ID
- Limit: 30 per minute
- Reason: Core credit deduction. Spam = credit drain.

**`app/api/credits/check/route.ts`**
- Key: user ID
- Limit: 60 per minute
- Reason: Read-only but called frequently. Cap to prevent scraping.

**`app/api/topup/route.ts`** (submit topup request)
- Key: user ID
- Limit: 5 per minute
- Reason: Payment submission. No reason to submit more than 5 times per minute.

**`app/api/topup/approve/route.ts`**
- Key: IP
- Limit: 10 per minute
- Reason: Admin action but still needs protection against replay attacks.

**`app/api/topup/approve-link/route.ts`**
- Key: IP
- Limit: 10 per minute
- Reason: Link-based approval. Cap replay attempts.

---

### GROUP 2 — Affiliate Routes

**`app/api/affiliate/register/route.ts`**
- Key: IP
- Limit: 3 per minute
- Reason: Fake affiliate signups. Very low legitimate need to register multiple times.

**`app/api/affiliate/payout/route.ts`** (request payout)
- Key: user ID
- Limit: 5 per minute
- Reason: Payout request spam prevention.

**`app/api/affiliate/payout/approve/route.ts`**
- Key: IP
- Limit: 10 per minute
- Reason: Admin action. Cap replay attempts.

**`app/api/affiliate/override/pay/route.ts`**
- Key: IP
- Limit: 10 per minute
- Reason: Admin action.

**`app/api/affiliate/stats/route.ts`**
- Key: user ID
- Limit: 30 per minute
- Reason: Data read. Prevent scraping.

---

### GROUP 3 — Referral Routes

**`app/api/referral/route.ts`**
- Key: user ID
- Limit: 20 per minute
- Reason: Referral actions. Moderate cap.

**`app/api/referral/stats/route.ts`**
- Key: user ID
- Limit: 30 per minute
- Reason: Read-only stats. Prevent scraping.

**`app/api/referral/leaderboard/route.ts`**
- Key: IP
- Limit: 20 per minute
- Reason: Public leaderboard. Prevent scraping.

---

### GROUP 4 — Video Pipeline Routes

**`app/api/video-prompts/route.ts`**
- Key: user ID
- Limit: 10 per minute
- Reason: Calls Gemini. Already credits-gated but add rate limit as second layer.

**`app/api/video-resume/route.ts`**
- Key: user ID
- Limit: 20 per minute
- Reason: Polling route. Cap to prevent aggressive polling.

**`app/api/video-status/route.ts`**
- Key: user ID
- Limit: 30 per minute
- Reason: Status check polling. Higher limit but still capped.

**`app/api/video-rewards/route.ts`**
- Key: user ID
- Limit: 10 per minute
- Reason: Reward grants. Low legitimate need.

---

### GROUP 5 — Content & Feedback Routes

**`app/api/content-image/route.ts`**
- Key: user ID
- Limit: 10 per minute
- Reason: Image generation pipeline. Gemini API cost.

**`app/api/feedback/route.ts`**
- Key: user ID
- Limit: 5 per minute
- Reason: Feedback grants credits. Spam = free credit farming.

**`app/api/feedback-trigger-check/route.ts`**
- Key: user ID
- Limit: 30 per minute
- Reason: Internal check. Moderate cap.

**`app/api/consultations/route.ts`**
- Key: user ID (or IP if no auth)
- Limit: 5 per minute
- Reason: Form submission. No reason to submit more than 5 times per minute.

**`app/api/testimonial/route.ts`**
- Key: user ID (or IP if no auth)
- Limit: 5 per minute
- Reason: Submission form.

---

### GROUP 6 — Launch Routes

**`app/api/launch/submit/route.ts`**
- Key: user ID
- Limit: 5 per minute
- Reason: Launch submission spam. Very low legitimate need.

**`app/api/launch/approve/route.ts`**
- Key: IP
- Limit: 10 per minute
- Reason: Admin approval action.

**`app/api/launch/leaderboard/route.ts`**
- Key: IP
- Limit: 20 per minute
- Reason: Public read. Prevent scraping.

---

### GROUP 7 — Utility Routes

**`app/api/proxy-image/route.ts`**
- Key: IP
- Limit: 30 per minute
- Reason: Bandwidth abuse prevention.

---

## Acceptance Checks

Run these after Codex executes:

1. `grep -rn "checkRateLimit" app/api/credits/` — appears in use and check routes
2. `grep -rn "checkRateLimit" app/api/topup/` — appears in all 3 topup routes
3. `grep -rn "checkRateLimit" app/api/affiliate/` — appears in all affiliate routes
4. `grep -rn "checkRateLimit" app/api/referral/` — appears in all referral routes
5. `grep -rn "checkRateLimit" app/api/video-prompts/ app/api/video-resume/ app/api/video-status/ app/api/video-rewards/` — all 4 present
6. `grep -rn "checkRateLimit" app/api/content-image/ app/api/feedback/ app/api/launch/` — all present
7. `npx tsc --noEmit` — zero TypeScript errors

## Notes

- Do NOT change any business logic, credit amounts, or response structures
- Rate limit check must be the FIRST thing in the handler before any DB calls
- Always return `{ error: "...", code: "RATE_LIMITED" }` with status 429
- If a route has no authenticated user available at the top, use IP keying
- Do not add rate limiting to routes not listed in this spec
