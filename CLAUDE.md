# Hinilas Pro — CLAUDE.md

## What This App Is
Hinilas Pro is a Next.js SaaS app for Filipino Meta Ads marketers. It's an AI-powered tool that generates ad angles, sales copy, and ad creatives. Users pay with credits.

## Tech Stack
- **Framework:** Next.js (App Router, server + client components)
- **Auth + DB:** Supabase (anon key for client, service role key for admin operations)
- **AI - Text:** Google Gemini via `@google/generative-ai` (chat, analysis, copy, angles)
- **AI - Image:** Google Gemini 2.5 Flash Image (`gemini-2.5-flash-image`)
- **Payments:** Manual GCash top-up flow (no PayMongo webhooks yet)
- **Styling:** Tailwind CSS, dark theme (`#0F172A` base)
- **Deployment:** Vercel

## Environment Variables (all in Vercel)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — admin ops only, never expose to client
- `GEMINI_IMAGE_API_KEY` — image generation
- `GEMINI_API_KEY` — text generation (chat, copy, angles, analyze)

## Supabase Tables
- `user_data` — user_id, username, avatar_url, credits_remaining, credits_total, plan, referral_code, referred_by, referral_rewarded, updated_at
- `credit_transactions` — user_id, type (use/grant/topup/referral), amount, description, created_at
- `feedbacks` — user_id, rating, category, message, video_url, created_at
- `consultations` — user_id, name, business, message, created_at

**Note:** `user_data` does NOT have a `created_at` column. Use `updated_at` instead.

## Credit System
- 1 image generation = 2 credits
- 1 video unlock = 1 credit (expires 24h)
- Credits checked before every paid action, deducted only on success
- Logged in `credit_transactions` with negative amount for deductions
- New signup = 30 free credits

## App Pages
| Route | Purpose |
|---|---|
| `/home` | Landing/login (no separate /login page — login is a modal here) |
| `/` | Setup form (business profile) |
| `/angles` | Generate ad angles — 1 credit |
| `/research` | Market research — 1 credit |
| `/copy` | Sales copy + captions — 1 credit |
| `/creative` | Image generation — 2 credits |
| `/analyze` | Results analysis — 1 credit (basic), 2 credits (advanced) |
| `/campaign-setup` | Step-by-step Messenger Ads guide, video unlocks cost 1 credit |
| `/learn` | Courses (locked/coming soon) |
| `/community` | Community (locked/coming soon) |
| `/expert` | AI consultation |
| `/pricing` | Plans + top-up |
| `/admin` | Owner-only dashboard |
| `/ref/[code]` | Referral redirect — sets cookie then goes to /home |

## Key Files
- `lib/context.tsx` — global app state (setup, credits, selectedAngle, creativeImage, savedImages)
- `lib/knowledge.ts` — all AI prompt templates (MODULE_PROMPTS)
- `lib/admin.ts` — OWNER_EMAILS list, isOwnerUser(), derivePlanFromCredits()
- `components/Sidebar.tsx` — main nav, credit display, feedback button, admin button
- `components/FloatingFeedback.tsx` — feedback modal (one-time reward)
- `app/auth/callback/route.ts` — post-auth handler: creates user_data row, grants 30 credits, handles referral

## Rules
- Never redirect to `/login` — it doesn't exist. Always redirect to `/home`.
- Admin routes must check `isOwnerUser()` server-side AND in the API route.
- Use `createClient` from `@/lib/supabase/server` in server components/routes.
- Use `createClient` from `@/lib/supabase/client` in client components.
- For admin DB operations (bypassing RLS), use `createClient` from `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY`.
- All button text for paid actions follows pattern: "Action Name — X credit(s)"
- No functions named `use*` unless they are actual React hooks (ESLint rules-of-hooks).
- `maxDuration = 60` on all AI API routes (Vercel timeout).
