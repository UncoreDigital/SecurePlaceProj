-- Add NOT NULL constraint to description column in firms table
-- Run this in your Supabase SQL Editor

-- First, update any existing NULL values to empty string
UPDATE firms SET description = '' WHERE description IS NULL;

-- Then add NOT NULL constraint
ALTER TABLE firms ALTER COLUMN description SET NOT NULL;
