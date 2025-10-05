-- Database optimization script for safety_classes table
-- Run these in your Supabase SQL editor to improve performance

-- 1. Create indexes for commonly queried columns
CREATE INDEX IF NOT EXISTS idx_safety_classes_is_active ON safety_classes(is_active);
CREATE INDEX IF NOT EXISTS idx_safety_classes_firm_id ON safety_classes(firm_id);
CREATE INDEX IF NOT EXISTS idx_safety_classes_created_at ON safety_classes(created_at DESC);

-- 2. Create composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_safety_classes_active_firm_created 
ON safety_classes(is_active, firm_id, created_at DESC);

-- 3. Create index for search functionality (if you add search later)
CREATE INDEX IF NOT EXISTS idx_safety_classes_title_search 
ON safety_classes USING GIN (to_tsvector('english', title));

-- 4. Analyze the table to update statistics (helps query planner)
ANALYZE safety_classes;

-- 5. Check if indexes are being used (run this after creating indexes)
-- EXPLAIN ANALYZE SELECT * FROM safety_classes WHERE is_active = true ORDER BY created_at DESC;

-- 6. Optional: Enable Row Level Security optimization
-- This helps if you have RLS policies
SET row_security = on;

-- Performance monitoring query - run this to check slow queries
-- SELECT 
--   query,
--   calls,
--   total_time,
--   mean_time,
--   rows
-- FROM pg_stat_statements 
-- WHERE query LIKE '%safety_classes%'
-- ORDER BY mean_time DESC;