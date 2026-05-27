# Task: Security Hardening — Full Audit Fixes

## Context

A full security audit was completed. This task implements all fixes across CRITICAL, HIGH, and MEDIUM severity issues. Do not skip any item. Do not rewrite files that are not listed here.

---

## What Already Exists (DO NOT REWRITE)

- `lib/admin.ts` — OWNER_EMAILS, isOwnerUser(), deriveTier()
- `lib/affiliate.ts` — commission logic, grantAffiliateCommissions()
- `lib/rate-limit.ts` — existing rate limit helper (copy this pattern for new limits)
- `app/api/topup/approve/route.ts` — topup approval logic
- `app/api/topup/approve-link/route.ts` — link-based approval
- `app/api/affiliate/payout/approve/route.ts` — payout approval
- `app/api/launch/submit/route.ts` — launch submission + Telegram notification
- `app/api/video-generate/route.ts` — video generation (already 25 credits)
- `app/api/image/route.ts` — image generation
- `app/api/content/route.ts` — content generation
- `app/api/cron/` — cron routes
- `vercel.json` — deployment config
- `app/blog/page.tsx` — blog listing page

---

## Fixes To Implement

---

### FIX 1: Payment approval — match by ID not amount (CRITICAL)

**File:** `app/api/topup/approve/route.ts`

The current code matches topup requests by `amount_paid`. Change it to match by unique `id`.

- Find the query that uses `.eq("amount_paid", amount)` or similar amount-based matching
- Replace with `.eq("id", requestId)` where `requestId` comes from the request body
- Make sure the request body accepts and requires `id` field
- Keep all other approval logic (credit grant, affiliate commission, Telegram notification) unchanged

---

### FIX 2: Duplicate approval prevention — atomic status check (CRITICAL + HIGH)

**File:** `app/api/topup/approve/route.ts` and `app/api/topup/approve-link/route.ts`

Add `.eq("status", "pending")` to the update query in both files so only pending requests can be approved. If the request is already approved, return early with a message "Already approved" — do not grant credits again.

Pattern:
```ts
const { data, error } = await adminSupabase
  .from("top_up_requests")
  .update({ status: "approved" })
  .eq("id", requestId)
  .eq("status", "pending") // atomic guard — only succeeds if still pending
  .select()
  .single();

if (!data) return NextResponse.json({ message: "Already approved or not found" }, { status: 200 });
```

---

### FIX 3: Replace webhook secret in Telegram URLs with signed tokens (CRITICAL)

**File:** `app/api/launch/submit/route.ts`

Currently approval URLs embed `TOPUP_WEBHOOK_SECRET` directly. Replace with short-lived signed tokens.

Steps:
1. Create a helper function `generateApprovalToken(id: string): string`:
   - Creates a payload: `{ id, exp: Date.now() + 15 * 60 * 1000 }` (15 min expiry)
   - Signs it using HMAC-SHA256 with `process.env.TOPUP_WEBHOOK_SECRET`
   - Returns base64url-encoded string: `payload.exp.id.signature`

2. Create a helper function `verifyApprovalToken(token: string): string | null`:
   - Decodes token, verifies signature, checks expiry
   - Returns `id` if valid, `null` if invalid or expired

3. In `app/api/launch/submit/route.ts`: replace the raw secret in the Telegram URL with `generateApprovalToken(requestId)`

4. In `app/api/topup/approve-link/route.ts`: replace the raw secret check with `verifyApprovalToken(token)` — if null, return 401

Put both helpers in `lib/approval-token.ts` (new file).

---

### FIX 4: Sanitize user inputs before AI prompts (CRITICAL)

**Files:** `app/api/content/route.ts`, `app/api/chat/route.ts`, `app/api/content-script/route.ts`, `app/api/video-prompts/route.ts`

In each file, before the prompt is sent to Gemini:

1. Trim the input
2. Enforce max length: 5000 characters (reject with 400 if exceeded)
3. Strip any text that looks like prompt injection. Add this sanitizer in `lib/sanitize.ts` (new file):

```ts
export function sanitizePrompt(input: string): string {
  return input
    .trim()
    .slice(0, 5000)
    .replace(/ignore previous instructions?/gi, "")
    .replace(/forget (everything|all|prior)/gi, "")
    .replace(/you are now/gi, "")
    .replace(/act as (a |an )?(?!filipino|philippine)/gi, "") // allow Filipino context, block persona hijacking
    .replace(/system prompt/gi, "")
    .replace(/\[INST\]|\[\/INST\]/g, "") // LLM injection markers
    .replace(/<\|.*?\|>/g, ""); // token-style injections
}
```

Import and apply `sanitizePrompt()` to every user-provided string before it goes into the Gemini prompt.

---

### FIX 5: Harden admin check — OWNER_EMAILS only (HIGH)

**File:** `lib/admin.ts`

The `isOwnerUser()` function currently checks `user.user_metadata?.role` or `is_owner` fields. These are user-modifiable. 

Rewrite `isOwnerUser()` to rely ONLY on the `OWNER_EMAILS` whitelist:

```ts
export function isOwnerUser(user: { email?: string | null }): boolean {
  return OWNER_EMAILS.includes((user.email ?? "").toLowerCase());
}
```

Remove any `user_metadata` checks from this function entirely.

Also update `app/api/affiliate/payout/approve/route.ts`: add a direct email check as the authorization guard:

```ts
if (!OWNER_EMAILS.includes((user.email ?? "").toLowerCase())) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

---

### FIX 6: Rate limiting on expensive routes (HIGH)

**Files:** `app/api/video-generate/route.ts`, `app/api/image/route.ts`, `app/api/content/route.ts`, `app/api/content-script/route.ts`

Add rate limiting at the top of each route handler using the existing pattern from `lib/rate-limit.ts`.

Limits:
- `video-generate`: 3 requests per minute per user
- `image`: 10 requests per minute per user
- `content`: 10 requests per minute per user
- `content-script`: 10 requests per minute per user

If rate limit exceeded, return:
```ts
return NextResponse.json({ error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" }, { status: 429 });
```

Check how `lib/rate-limit.ts` works first and follow the exact same pattern used in `app/api/chat/route.ts`.

---

### FIX 7: Move service role key out of blog page (CRITICAL)

**File:** `app/blog/page.tsx`

If this file uses `SUPABASE_SERVICE_ROLE_KEY` directly, move the data fetch to a new API route `app/api/blog/posts/route.ts` that uses the service role key server-side. Update `app/blog/page.tsx` to fetch from `/api/blog/posts` instead.

If `app/blog/page.tsx` is already a server component and the key is only used server-side (never sent to browser), add a comment confirming this and leave it. Only move if it's in a client component or if the key would be exposed in client bundles.

---

### FIX 8: Atomic referral reward — prevent race condition (MEDIUM)

**File:** `app/api/topup/approve/route.ts`

Find where `referral_rewarded` is set to true. Change the update to use an atomic condition:

```ts
const { data: rewardResult } = await adminSupabase
  .from("user_data")
  .update({ referral_rewarded: true })
  .eq("user_id", buyerId)
  .eq("referral_rewarded", false) // only succeeds if not already rewarded
  .select("user_id")
  .single();

if (!rewardResult) {
  // Already rewarded — skip. Do not grant again.
  return;
}
// Proceed with granting referral commission
```

---

### FIX 9: Security headers in vercel.json (MEDIUM)

**File:** `vercel.json`

Add a `headers` section. If one already exists, append to it. Do not remove existing headers.

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.googleapis.com wss://*.supabase.co; frame-ancestors 'none';"
        }
      ]
    }
  ]
}
```

---

### FIX 10: Cron endpoint deduplication (MEDIUM)

**Files:** All files in `app/api/cron/`

For each cron route:
1. Read when it last ran from a `cron_locks` table (or use a simple in-memory approach with a module-level timestamp)
2. If it ran within the last 60 seconds, return 200 with `{ message: "Already ran recently" }` — do not execute again
3. Create `lib/cron-lock.ts` (new file) with helpers:

```ts
const lastRun: Record<string, number> = {};

export function acquireCronLock(key: string, minIntervalMs = 60_000): boolean {
  const now = Date.now();
  if (lastRun[key] && now - lastRun[key] < minIntervalMs) return false;
  lastRun[key] = now;
  return true;
}
```

Use at the top of each cron handler:
```ts
if (!acquireCronLock("affiliate-overrides")) {
  return NextResponse.json({ message: "Already ran recently" }, { status: 200 });
}
```

---

### FIX 11: Audit logging for admin actions (MEDIUM)

Create a new Supabase table and log all critical admin actions.

**New file: `lib/audit-log.ts`**

```ts
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function logAdminAction(params: {
  adminEmail: string;
  action: string;
  targetId?: string;
  details?: Record<string, unknown>;
}) {
  await admin.from("admin_audit_logs").insert({
    admin_email: params.adminEmail,
    action: params.action,
    target_id: params.targetId ?? null,
    details: params.details ?? null,
    created_at: new Date().toISOString(),
  });
}
```

**SQL to run in Supabase editor (add as a comment in the file, not executed by Codex):**
```sql
-- Run this manually in Supabase SQL editor:
-- create table if not exists admin_audit_logs (
--   id uuid primary key default gen_random_uuid(),
--   admin_email text not null,
--   action text not null,
--   target_id text,
--   details jsonb,
--   created_at timestamptz not null default now()
-- );
```

**Add `logAdminAction()` calls in:**
- `app/api/topup/approve/route.ts` — after successful approval: action `"topup_approved"`, targetId = request ID
- `app/api/topup/approve-link/route.ts` — same
- `app/api/affiliate/payout/approve/route.ts` — action `"payout_approved"`, targetId = payout ID
- `app/api/admin/reset-topups/route.ts` — action `"topups_reset"` if this file exists

---

### FIX 12: Generic error messages to clients (LOW)

**Files:** All files in `app/api/`

Find any error responses that include raw error messages like:
```ts
return NextResponse.json({ error: err.message }, { status: 500 });
```

Replace with:
```ts
console.error("[route-name]", err);
return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
```

Keep `console.error()` for server-side logging. Only sanitize what is returned to the client.

---

## Acceptance Checks

Run these after Codex executes:

1. `grep -rn "amount_paid" app/api/topup/` — should NOT be used as the matching condition
2. `grep -rn "TOPUP_WEBHOOK_SECRET" app/api/launch/` — should NOT appear in URL strings
3. `ls lib/approval-token.ts lib/sanitize.ts lib/audit-log.ts lib/cron-lock.ts` — all 4 new files exist
4. `grep -rn "sanitizePrompt" app/api/content/ app/api/chat/` — appears in each file
5. `grep -rn "user_metadata" lib/admin.ts` — should NOT appear (removed)
6. `grep -rn "RATE_LIMITED" app/api/video-generate/ app/api/image/` — rate limit response exists
7. `grep -n "X-Frame-Options" vercel.json` — security header exists
8. `grep -rn "acquireCronLock" app/api/cron/` — cron lock applied
9. `grep -rn "logAdminAction" app/api/topup/approve/` — audit log called
10. `npx tsc --noEmit` — zero TypeScript errors

## Notes

- Do NOT add `console.log` statements for debugging — use `console.error` for actual errors only
- Do NOT change any UI, pricing, credit amounts, or business logic
- Do NOT create new pages or new Supabase tables (except `admin_audit_logs` which Ken will create manually via SQL editor)
- The `admin_audit_logs` table SQL is provided as a comment only — Codex does not run SQL
- All fixes are backend/API only except Fix 9 (vercel.json) and Fix 5 (lib/admin.ts)
- If a file does not exist (e.g., `app/api/admin/reset-topups/route.ts`), skip that specific sub-step and note it
