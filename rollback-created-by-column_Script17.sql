-- =====================================================
-- Rollback: Remove created_by column from scheduled_classes
-- =====================================================
-- Description: Removes the created_by column and related objects
-- Date: 2025-01-10
-- Version: 1.0
-- WARNING: This will permanently delete the created_by data!

BEGIN;

-- Step 1: Drop the trigger
DROP TRIGGER IF EXISTS trigger_set_created_by_scheduled_classes ON scheduled_classes;

-- Step 2: Drop the trigger function
DROP FUNCTION IF EXISTS set_created_by_on_scheduled_classes();

-- Step 3: Drop RLS policies (if they were created)
-- DROP POLICY IF EXISTS "view_own_scheduled_classes" ON scheduled_classes;
-- DROP POLICY IF EXISTS "insert_scheduled_classes" ON scheduled_classes;
-- DROP POLICY IF EXISTS "update_own_scheduled_classes" ON scheduled_classes;

-- Step 4: Drop the index
DROP INDEX IF EXISTS idx_scheduled_classes_created_by;

-- Step 5: Drop the foreign key constraint
ALTER TABLE scheduled_classes 
DROP CONSTRAINT IF EXISTS fk_scheduled_classes_created_by;

-- Step 6: Drop the column
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'scheduled_classes' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE scheduled_classes DROP COLUMN created_by;
        RAISE NOTICE '✅ Column created_by removed from scheduled_classes table';
    ELSE
        RAISE NOTICE 'Column created_by does not exist in scheduled_classes table';
    END IF;
END $$;

-- Step 7: Verification
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'scheduled_classes' 
        AND column_name = 'created_by'
    ) THEN
        RAISE NOTICE '✅ Rollback completed successfully';
        RAISE NOTICE 'All created_by related objects removed';
    ELSE
        RAISE EXCEPTION '❌ Rollback failed: created_by column still exists';
    END IF;
END $$;

COMMIT;

-- =====================================================
-- Rollback completed
-- =====================================================