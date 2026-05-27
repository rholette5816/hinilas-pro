-- Add email column to user_data for admin visibility fallback
ALTER TABLE user_data ADD COLUMN IF NOT EXISTS email text;
