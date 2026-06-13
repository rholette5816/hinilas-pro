-- Mode toggle per user
ALTER TABLE user_data ADD COLUMN IF NOT EXISTS ui_mode text DEFAULT 'beginner';

-- Chat session persistence (one rolling session per user)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
