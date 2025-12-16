-- Add JSON report column to analysis_results table
-- Migration: 003_add_json_report.sql

ALTER TABLE analysis_results 
ADD COLUMN report_json JSONB;

COMMENT ON COLUMN analysis_results.report_json IS 'Structured JSON report from AI analysis';

