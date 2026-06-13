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
