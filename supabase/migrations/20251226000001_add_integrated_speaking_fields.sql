-- Migration: Add reading_content and listening_transcript to questions table
-- Description: Support integrated speaking tasks (综合口语题型)
-- Date: 2025-12-26

-- Add reading_content column for reading passage (Task 2, 3, 4)
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS reading_content TEXT;

-- Add listening_transcript column for listening transcript (Task 2, 3, 4, 5, 6)
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS listening_transcript TEXT;

-- Add comments for documentation
COMMENT ON COLUMN questions.reading_content IS 'Reading passage content for integrated speaking tasks';
COMMENT ON COLUMN questions.listening_transcript IS 'Listening transcript for integrated speaking tasks';



