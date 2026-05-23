-- Migration: Add per-question marks support
-- Run this if you already have the MCQ form tables from form-schema-migration.sql

ALTER TABLE form_questions
  ADD COLUMN IF NOT EXISTS marks INTEGER NOT NULL DEFAULT 1 CHECK (marks >= 1);

ALTER TABLE form_responses
  ADD COLUMN IF NOT EXISTS marks_obtained INTEGER,
  ADD COLUMN IF NOT EXISTS total_marks INTEGER;
