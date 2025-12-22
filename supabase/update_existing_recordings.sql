-- Script to update existing recordings with user_id
-- The test user localtest@gmail.com has a fixed UUID from seed.sql
-- 
-- Fixed User ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
-- Email: localtest@gmail.com
-- Password: 123456

-- Update all recordings without user_id to the test user
UPDATE recordings 
SET user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid 
WHERE user_id IS NULL;

-- Also update analysis_results
UPDATE analysis_results 
SET user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid 
WHERE user_id IS NULL;

-- Verify the update
SELECT 
    r.recording_id,
    r.question_id,
    r.user_id,
    u.email as user_email,
    r.audio_url,
    r.created_at
FROM recordings r
LEFT JOIN auth.users u ON r.user_id = u.id
ORDER BY r.created_at DESC;
