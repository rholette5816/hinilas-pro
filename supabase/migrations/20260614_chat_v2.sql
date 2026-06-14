-- Project folders
CREATE TABLE IF NOT EXISTS chat_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#64748B',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own projects"
  ON chat_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users can insert own projects"
  ON chat_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users can update own projects"
  ON chat_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users can delete own projects"
  ON chat_projects FOR DELETE USING (auth.uid() = user_id);

-- Pin support on sessions
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES chat_projects(id) ON DELETE SET NULL;
