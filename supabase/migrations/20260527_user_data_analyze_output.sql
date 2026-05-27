-- Add analyze_output column to user_data for persisting audit results across sessions
ALTER TABLE user_data ADD COLUMN IF NOT EXISTS analyze_output jsonb;
