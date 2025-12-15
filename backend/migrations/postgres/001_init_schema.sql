-- Migration: 001_init_schema
-- Description: Initialize database schema
-- Created: 2025-12-16

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
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Migration tracking table
CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL,  -- 'postgres' or 'minio'
    applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);
