-- Remove NOT NULL constraint from recipient_name column in certificates table
-- Run this in your Supabase SQL Editor

ALTER TABLE certificates ALTER COLUMN recipient_name DROP NOT NULL;
