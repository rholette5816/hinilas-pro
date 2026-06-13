# Task: Chat Conversation History

## Goal
Add multi-session conversation history to the Advanced Mode `/chat` page. Users can start new chats, switch between past conversations, and each chat auto-titles from the first message. The history panel fills the empty left space in the chat layout.

## Rules
- Never modify existing beginner module pages or `/app/api/chat/route.ts`.
- All billing stays through `POST /api/credits/use` — no changes to credit logic.
- Follow all rules in `CLAUDE.md` and `web-hilas/CLAUDE.md`.
- Use `createClient` from `@/lib/supabase/server` in API routes, `@/lib/supabase/client` in client components.
- No new npm packages.

---

## Step 1: Database Migration

Create file `supabase/migrations/20260614_chat_sessions_v2.sql`:

```sql
-- Drop old single-session table and recreate as multi-session
DROP TABLE IF EXISTS chat_sessions;

CREATE TABLE chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Chat',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX chat_sessions_user_id_idx ON chat_sessions(user_id);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own chat sessions"
  ON chat_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users can insert own chat sessions"
  ON chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own chat sessions"
  ON chat_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "users can delete own chat sessions"
  ON chat_sessions FOR DELETE USING (auth.uid() = user_id);

-- Add active_session_id to user_data
ALTER TABLE user_data ADD COLUMN IF NOT EXISTS active_session_id uuid REFERENCES chat_sessions(id) ON DELETE SET NULL;
```

**IMPORTANT:** Do not run this migration — just create the file. Ken will run it manually in Supabase SQL editor.

---

## Step 2: New API Routes

### `app/api/chat/sessions/route.ts` — List + Create sessions

```
GET  /api/chat/sessions  → returns all sessions for current user, ordered by updated_at DESC, only id/title/created_at/updated_at (no messages)
POST /api/chat/sessions  → creates a new empty session, returns the new session row
```

POST body: `{ title?: string }` — title defaults to "New Chat"

Both require authenticated user. Use service role is NOT needed — RLS handles it.

### `app/api/chat/sessions/[id]/route.ts` — Get + Update + Delete a session

```
GET    /api/chat/sessions/[id]  → returns full session including messages
PATCH  /api/chat/sessions/[id]  → updates messages and/or title. Body: { messages?: ChatMessage[], title?: string }
DELETE /api/chat/sessions/[id]  → deletes the session
```

All require auth. Verify `user_id = auth.uid()` on every operation.

### `app/api/chat/sessions/active/route.ts` — Get + Set active session

```
GET   → returns active_session_id from user_data for current user
PATCH → body: { sessionId: string | null } — updates user_data.active_session_id
```

---

## Step 3: Update `lib/context.tsx`

Replace the current `chatMessages` / `setChatMessages` implementation with multi-session support.

### Remove:
- `chatMessages: ChatMessage[]` state
- `setChatMessages` function that upserts to `chat_sessions` with `UNIQUE(user_id)`
- Hydration code that loads `chat_sessions` row by `user_id`

### Add to `AppContextType` interface:
```ts
activeSessionId: string | null;
setActiveSessionId: (id: string | null) => Promise<void>;
chatMessages: ChatMessage[];
setChatMessages: (sessionId: string, msgs: ChatMessage[], title?: string) => Promise<void>;
```

### Hydration (in the `useEffect`):
1. Fetch `active_session_id` from `user_data` row (already selected via `SELECT *`).
2. If `active_session_id` exists, fetch that session's messages via `GET /api/chat/sessions/[id]` and set `chatMessages`.
3. Set `activeSessionId` from `user_data.active_session_id`.

### `setActiveSessionId(id)`:
- Updates local state
- Calls `PATCH /api/chat/sessions/active` with `{ sessionId: id }`
- Loads messages for the new session via `GET /api/chat/sessions/[id]`

### `setChatMessages(sessionId, msgs, title?)`:
- Updates local `chatMessages` state
- Calls `PATCH /api/chat/sessions/[sessionId]` with `{ messages: msgs, title }` (only include title if provided)

---

## Step 4: Update `app/chat/page.tsx`

### Layout change
Change the main layout to 2 columns when screen is wide enough:

```
<main className="min-h-screen flex flex-col pt-14 md:pt-12">
  <div className="flex flex-1 overflow-hidden">
    <ConversationSidebar />          {/* new component, ~240px wide, hidden on mobile */}
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* existing header bar */}
      {/* existing messages section */}
      {/* existing composer */}
    </div>
  </div>
</main>
```

### ConversationSidebar (inline component in the same file, not a separate file)
- Width: `w-60` (240px), hidden on mobile (`hidden md:flex flex-col`)
- Background: `#ffffff`, right border: `1px solid rgba(0,0,0,0.08)`
- Top: "New Chat" button — full width, amber style (`background: linear-gradient(135deg, #1877F2, #D97706)`, white text, rounded, `text-sm font-bold`)
- Below: scrollable list of past sessions fetched from `GET /api/chat/sessions`
- Each session item: shows `title` (truncated to 1 line) + relative date (`updated_at`)
- Active session: highlighted with `background: rgba(217,119,6,0.08)`, left border `3px solid #D97706`
- Delete button (×) on hover for each session item — calls `DELETE /api/chat/sessions/[id]`
- Sessions list is local state, refetched after create/delete

### New Chat flow
1. User clicks "New Chat"
2. Call `POST /api/chat/sessions` → get new session `id`
3. Call `setActiveSessionId(id)` on context
4. Call `setChatMessages(id, [])` to clear messages
5. Refresh sessions list

### Sending a message
When user sends the first message in a session that still has title "New Chat":
- After getting the AI response, call `PATCH /api/chat/sessions/[activeSessionId]` to update title to first 45 chars of user's message + "..."  if longer

When saving messages after each exchange:
- Call `setChatMessages(activeSessionId, updatedMessages)` instead of old `setChatMessages(updatedMessages)`

### Session switching
When user clicks a session in the sidebar:
1. Call `setActiveSessionId(sessionId)` — this loads messages automatically
2. Update local active highlight

### On first load (no active session)
- If `activeSessionId` is null and sessions list is empty: auto-create one session via `POST /api/chat/sessions`
- If `activeSessionId` is null but sessions exist: set active to the most recent one

---

## Step 5: Acceptance Checks

1. `GET /api/chat/sessions` returns array of sessions without messages field
2. `POST /api/chat/sessions` creates a new row and returns it
3. `PATCH /api/chat/sessions/[id]` updates messages correctly
4. `DELETE /api/chat/sessions/[id]` removes the row
5. Conversation sidebar renders at `md:` breakpoint with sessions list
6. "New Chat" button creates a new session and clears the chat
7. Clicking a past session loads its messages
8. First message auto-titles the session
9. Active session is highlighted in sidebar
10. No TypeScript errors (`npx tsc --noEmit`)
11. No changes to `/app/api/chat/route.ts` or any beginner module pages
