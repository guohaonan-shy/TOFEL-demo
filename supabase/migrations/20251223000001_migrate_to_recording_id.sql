-- Migration: 003_migrate_to_recording_id
-- Description: Migrate recordings table from id (integer) to recording_id (varchar ULID)
-- Created: 2025-12-23

-- Step 1: Add recording_id column as VARCHAR(50)
ALTER TABLE recordings
ADD COLUMN recording_id VARCHAR(50);

-- Step 2: Generate ULID-format recording_ids for existing records
-- Format: recording_{ULID}
-- Since we can't generate true ULIDs in SQL, we'll create a temporary ID based on the integer id
UPDATE recordings
SET recording_id = 'recording_01KCH9WP8W6TZXA5QXS1BFF6' || LPAD(id::text, 2, '0')
WHERE recording_id IS NULL;

-- Step 3: Make recording_id NOT NULL
ALTER TABLE recordings
ALTER COLUMN recording_id SET NOT NULL;

-- Step 4: Drop foreign key constraint from analysis_results
ALTER TABLE analysis_results
DROP CONSTRAINT IF EXISTS analysis_results_recording_id_fkey;

-- Step 5: Update analysis_results to use new recording_id values
-- Create a temporary column to store the mapping
ALTER TABLE analysis_results
ADD COLUMN temp_recording_id VARCHAR(50);

-- Copy the new recording_id values based on the old id
UPDATE analysis_results ar
SET temp_recording_id = r.recording_id
FROM recordings r
WHERE ar.recording_id::integer = r.id;

-- Drop old recording_id column and rename temp column
ALTER TABLE analysis_results
DROP COLUMN recording_id;

ALTER TABLE analysis_results
RENAME COLUMN temp_recording_id TO recording_id;

-- Step 6: Drop old primary key and constraints on recordings
ALTER TABLE recordings
DROP CONSTRAINT recordings_pkey;

-- Step 7: Create new primary key on recording_id
ALTER TABLE recordings
ADD CONSTRAINT recordings_pkey PRIMARY KEY (recording_id);

-- Step 8: Drop old id column
ALTER TABLE recordings
DROP COLUMN id;

-- Step 9: Re-create foreign key constraint in analysis_results
ALTER TABLE analysis_results
ADD CONSTRAINT analysis_results_recording_id_fkey
FOREIGN KEY (recording_id) REFERENCES recordings(recording_id);

-- Step 10: Make recording_id unique in analysis_results
CREATE UNIQUE INDEX IF NOT EXISTS idx_analysis_results_recording_id
ON analysis_results(recording_id);

-- Verify the migration
SELECT
    recording_id,
    question_id,
    audio_url,
    created_at
FROM recordings
ORDER BY created_at DESC;
