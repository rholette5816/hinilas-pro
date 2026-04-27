# Task: feedback-auto-prompt

## Goal
Automatically open the FloatingFeedback modal once for a user after their 3rd successful paid generation in any module. Show it only ONCE per user (whether they submit, dismiss, or close). Users who already submitted feedback never see it. Owner accounts (Ken) never see it.

## Why
Feedback collection is slow because the modal only opens when users click the sidebar button themselves. By auto-prompting after 3 successful generations, we catch users at the peak "wow" moment when they've experienced the full value and have an honest opinion to share. One-shot trigger respects the user - never nag.

## REQUIRED USER ACTION (before Codex runs)
Ken must run this Supabase SQL migration in the Supabase SQL editor before this code change ships:

```sql
ALTER TABLE user_data
  ADD COLUMN IF NOT EXISTS feedback_prompt_shown_at timestamptz;
```

Codex cannot run this. Ken runs it manually. Confirm the column exists before deploying the code change.

## Files to modify
- `web-hilas/components/Sidebar.tsx` - add a useEffect on mount that calls the new feedback-trigger-check endpoint and auto-opens the FloatingFeedback modal if the response says so.

## Files to create
- `web-hilas/app/api/feedback-trigger-check/route.ts` - new GET route that decides whether to auto-show feedback for the current user. Idempotent within a user (marks shown the first time it returns true).

## Files to delete
None.

## Exact content for the new route file

Create `web-hilas/app/api/feedback-trigger-check/route.ts` with this exact content:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { isOwnerUser } from "@/lib/admin";

const TRIGGER_THRESHOLD = 3;

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ shouldShow: false });

  // Owner accounts never get the auto-prompt
  if (isOwnerUser(user)) return NextResponse.json({ shouldShow: false });

  const admin = adminClient();

  // Skip if user has already submitted feedback
  const { data: existingFeedback } = await admin
    .from("feedbacks")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existingFeedback) return NextResponse.json({ shouldShow: false });

  // Skip if we have already shown the prompt before
  const { data: userRow } = await admin
    .from("user_data")
    .select("feedback_prompt_shown_at")
    .eq("user_id", user.id)
    .single();
  if (userRow?.feedback_prompt_shown_at) return NextResponse.json({ shouldShow: false });

  // Count paid usage events
  const { count } = await admin
    .from("credit_transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("type", "use");

  if ((count ?? 0) < TRIGGER_THRESHOLD) {
    return NextResponse.json({ shouldShow: false });
  }

  // Atomically mark prompt as shown so the next call returns false even if
  // the user closes the modal without submitting.
  const { data: flipped } = await admin
    .from("user_data")
    .update({ feedback_prompt_shown_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("feedback_prompt_shown_at", null)
    .select("user_id")
    .maybeSingle();

  if (!flipped) return NextResponse.json({ shouldShow: false });

  return NextResponse.json({ shouldShow: true });
}
```

## Exact change in `Sidebar.tsx`

Find the existing useEffect that checks `canEarnFromFeedback` (currently around lines 100-119). DO NOT modify that effect. Add a NEW useEffect right after it that handles the auto-open trigger.

Add this useEffect immediately after the existing `}, [credits]);` line:

```tsx
  // Auto-open feedback after the user's 3rd paid generation, once per user.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/feedback-trigger-check")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data?.shouldShow) return;
        // Brief delay so the user sees their result first, then the modal appears.
        setTimeout(() => { if (!cancelled) setFeedbackOpen(true); }, 1500);
      })
      .catch(() => {
        // Silent failure - never block the UI on this check.
      });
    return () => { cancelled = true; };
  // Run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

Do NOT add any new state, do NOT change the existing FloatingFeedback render, do NOT change the feedback button wiring.

## Constraints
- Inherits from `AGENTS.md`.
- All hyphens in any new strings must be ASCII `-`. NO em dashes anywhere.
- The new API route uses the service role key via `adminClient()` to bypass RLS for the count and update. Auth check happens via the user's own session client first.
- The atomic `.is("feedback_prompt_shown_at", null)` guard in the UPDATE prevents a race where two concurrent calls both set the flag and both return shouldShow:true. Only the winning update returns a row.
- Threshold is `TRIGGER_THRESHOLD = 3`. Do not parameterize via env var or query string.
- The Sidebar useEffect must be idempotent: the API marks the flag itself, so even if useEffect fires multiple times in dev mode (React strict), the server only returns shouldShow:true once.
- Do NOT remove or change the existing manual feedback button. Users can still click it to leave additional feedback after the first prompt.

## Acceptance criteria
- [ ] File `web-hilas/app/api/feedback-trigger-check/route.ts` exists.
- [ ] `grep -n "TRIGGER_THRESHOLD = 3" web-hilas/app/api/feedback-trigger-check/route.ts` returns one match.
- [ ] `grep -n "feedback_prompt_shown_at" web-hilas/app/api/feedback-trigger-check/route.ts` returns multiple matches (read + update).
- [ ] `grep -n "isOwnerUser" web-hilas/app/api/feedback-trigger-check/route.ts` returns at least one match.
- [ ] `grep -n "feedback-trigger-check" web-hilas/components/Sidebar.tsx` returns at least one match.
- [ ] `grep -n "setFeedbackOpen(true)" web-hilas/components/Sidebar.tsx` returns at least 2 matches (existing manual click + new auto-trigger). The original may be wrapped in setTimeout via the new useEffect, that is fine.
- [ ] `cd web-hilas && npx tsc --noEmit` passes with no new errors.
- [ ] No em dashes added in modified or new files.

## Out of scope
- Re-prompting users who dismissed (the flag blocks further prompts forever after first show - by design).
- Nagging users who already submitted feedback.
- Showing different feedback prompts based on rating or sentiment.
- Backend changes to `FloatingFeedback.tsx` itself.
- Changes to credit costs, threshold per module, or which modules count.

## Notes for Codex
- `isOwnerUser` is already exported from `@/lib/admin`.
- The Sidebar already imports `useEffect`. Do not re-import.
- The `setFeedbackOpen` setter already exists in Sidebar (currently used by the manual feedback button).
- The `credit_transactions` table uses `type` values like "use", "grant", "topup", "referral" per CLAUDE.md. We count only `type = "use"` to capture paid generations.
- `count: "exact", head: true` is the Supabase pattern for getting a row count without fetching the rows themselves. Cheaper than selecting all rows.
- The 1500ms delay before opening lets the user see their last action's result before the modal appears - smoother UX than instant pop.
