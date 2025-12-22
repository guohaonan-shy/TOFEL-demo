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
-- Uses ULID format for recording_id (e.g., recording_01HGW2BBG4BV9DG8YCEXFZR8ND)
CREATE TABLE IF NOT EXISTS recordings (
    recording_id VARCHAR(50) PRIMARY KEY,
    question_id VARCHAR(50) NOT NULL REFERENCES questions(question_id),
    audio_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Analysis results table for AI feedback
CREATE TABLE IF NOT EXISTS analysis_results (
    id SERIAL PRIMARY KEY,
    recording_id VARCHAR(50) NOT NULL UNIQUE REFERENCES recordings(recording_id),
    user_id UUID REFERENCES auth.users(id),
    question_id VARCHAR(50) REFERENCES questions(question_id),
    report_markdown TEXT,
    report_json JSONB,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_analysis_results_user_id ON analysis_results(user_id);
CREATE INDEX idx_analysis_results_question_id ON analysis_results(question_id);

-- Add comment for report_json column
COMMENT ON COLUMN analysis_results.report_json IS 'Structured JSON report from AI analysis';
