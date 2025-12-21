-- Migration: 001_init_schema
-- Description: Initialize database schema
-- Created: 2025-12-21

-- Questions table for TOEFL speaking prompts
CREATE TABLE IF NOT EXISTS questions (
    question_id VARCHAR(50) PRIMARY KEY,
    instruction TEXT NOT NULL,
    audio_url VARCHAR(500),
    sos_keywords JSON,
    sos_starter TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Recordings table for user audio submissions
CREATE TABLE IF NOT EXISTS recordings (
    id SERIAL PRIMARY KEY,
    question_id VARCHAR(50) NOT NULL REFERENCES questions(question_id),
    audio_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Analysis results table for AI feedback
CREATE TABLE IF NOT EXISTS analysis_results (
    id SERIAL PRIMARY KEY,
    recording_id INTEGER NOT NULL UNIQUE REFERENCES recordings(id),
    report_markdown TEXT,
    report_json JSONB,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add comment for report_json column
COMMENT ON COLUMN analysis_results.report_json IS 'Structured JSON report from AI analysis';
