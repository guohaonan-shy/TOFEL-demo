-- Migration: 002_add_user_id_to_recordings
-- Description: Add user_id column to recordings table for user ownership
-- Created: 2025-12-22

-- Add user_id column to recordings table
-- References auth.users table (Supabase Auth)
ALTER TABLE recordings
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create indexes for faster queries
CREATE INDEX idx_recordings_user_id ON recordings(user_id);
CREATE INDEX idx_recordings_question_id ON recordings(question_id);

-- Add comments for documentation
COMMENT ON COLUMN recordings.recording_id IS 'ULID format primary key (e.g., recording_01HGW2BBG4BV9DG8YCEXFZR8ND)';
COMMENT ON COLUMN recordings.user_id IS 'Foreign key to auth.users - owner of the recording';
