# BACKLOG: max-exclusive-value

> Status: NOT READY TO EXECUTE. This is a planning doc, not a Codex task spec.
> Decisions still needed from Ken before this becomes an executable spec.

## Why this exists
Right now Max (₱1,299) only meaningfully differs from Flex (₱499) by including the Hilas Course + 350 more credits + priority support. Once a buyer finishes the course, the ongoing reason to renew Max disappears. Max needs ongoing monthly exclusive value that resets, otherwise users downgrade to Flex forever after course completion.

The ₱800 price gap needs to be anchored to something a Flex user CANNOT get.

## The two proposed ideas

### Idea A: Ken's Monthly Brand Review
- Once/month, every active Max user submits their Meta Ads account screenshot or business setup
- Ken records a 5-10 min Loom video reviewing it personally
- Direct founder feedback, irreplaceable, premium feel
- Cost to Ken: ~5-10 min per review × N Max users
- Scales okay to ~50 users, then heavy

### Idea B: Done-For-You (DFY) Campaign Drop
- Once/month, Ken builds ONE complete campaign: 3 angles + matching copy + 3 ad images + 1 video script
- Dropped into every Max user's dashboard automatically
- They can swipe, template it, or run it directly
- Cost to Ken: 2-3 hours once/month, served to all Max users
- Scales infinitely (1 build, N consumers, archive becomes library over time)

### Why both together
- A is high-touch (per-user effort), B is leverage (1-to-many content)
- A gives VIP feel, B gives tangible monthly resource even when Ken is busy
- Together they justify the ₱800 premium — no Flex user gets either

## What we'd build

### For Idea A (Monthly Review)
- DB table `brand_reviews`: `id, user_id, submitted_at, screenshot_url, status, ken_loom_url, reviewed_at`
- Max-user dashboard widget: "Submit for Monthly Review" button → upload modal
- Admin queue page: list of pending reviews with screenshots → Ken pastes Loom URL → status flips to "delivered"
- Email notification on delivery
- Throttle: 1 submission per Max user per month

### For Idea B (DFY Drops)
- DB table `max_drops`: `id, title, theme, published_at, angles_json, copy_json, image_urls, video_script, hero_image`
- Admin page to create/edit drops
- Public Max-only page `/max-drops` showing all drops newest first
- Sidebar "Max Drops" link visible only to Max-tier users (use `deriveTier` check)
- Email blast when new drop goes live

## Effort estimate
- Idea A alone: ~3 hours
- Idea B alone: ~3-4 hours
- Both together: ~5-6 hours (shared: tier-check middleware, Max-only routing, email plumbing)

## Open decisions Ken needs to make before this becomes a Codex spec

1. **Commitment:** Is Ken committed to delivering this every month indefinitely? If month 2 misses, churn risk is high.
2. **Scope:** Idea A only, B only, or both?
3. **A format:** Personalized Loom reviews vs batch group calls?
4. **B time budget:** Realistic monthly hours? If <2 hours, lean heavily on AI tooling (use the Hinilas Pro app itself to build the drops).
5. **A throttle:** 1 review/month per user, or unlimited within the month?
6. **B archive access:** Can Max users see all past drops back to month 1, or only the current month's?
7. **Pricing impact:** Does adding this justify a Max price bump (e.g., ₱1,499 going forward), or stay at ₱1,299?

## How to resume this
- When Ken is ready, answer the 7 open decisions above.
- Convert this BACKLOG doc into a real task spec (or two specs, one per idea).
- Migration files needed for any new tables.
- Run via Codex normally.
