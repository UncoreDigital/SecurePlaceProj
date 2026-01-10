-- =====================================================
-- Migration: Add created_by column to scheduled_classes
-- =====================================================
-- Description: Adds created_by column to track the user who created each scheduled class
-- Date: 2025-01-10
-- Version: 1.0

BEGIN;

-- Step 1: Add the created_by column
DO $$ 
BEGIN
    -- Check if column doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'scheduled_classes' 
        AND column_name = 'created_by'
    ) THEN
        -- Add the column
        ALTER TABLE scheduled_classes 
        ADD COLUMN created_by UUID;
        
        -- Add foreign key constraint to auth.users
        ALTER TABLE scheduled_classes 
        ADD CONSTRAINT fk_scheduled_classes_created_by 
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Column created_by added to scheduled_classes table';
    ELSE
        RAISE NOTICE 'Column created_by already exists in scheduled_classes table';
    END IF;
END $$;

-- Step 2: Add index for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_classes_created_by 
ON scheduled_classes(created_by);

-- Step 3: Add column comment for documentation
COMMENT ON COLUMN scheduled_classes.created_by IS 'UUID of the user who created this scheduled class entry';

-- Step 4: Update existing records (optional)
-- Set created_by to the first super_admin user found for existing records
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Find the first super_admin user
    SELECT id INTO admin_user_id 
    FROM profiles 
    WHERE role = 'super_admin' 
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Update existing records without created_by
        UPDATE scheduled_classes 
        SET created_by = admin_user_id 
        WHERE created_by IS NULL;
        
        RAISE NOTICE 'Updated % existing records with admin user ID: %', 
                     (SELECT COUNT(*) FROM scheduled_classes WHERE created_by = admin_user_id),
                     admin_user_id;
    ELSE
        RAISE NOTICE 'No super_admin user found. Existing records will have NULL created_by';
    END IF;
END $$;

-- Step 5: Create RLS policies (optional - uncomment if needed)
-- Enable RLS on the table if not already enabled
-- ALTER TABLE scheduled_classes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view scheduled classes they created
-- CREATE POLICY "view_own_scheduled_classes" ON scheduled_classes
--     FOR SELECT 
--     USING (auth.uid() = created_by OR auth.jwt() ->> 'role' IN ('super_admin', 'firm_admin'));

-- Policy: Users can insert scheduled classes (will auto-set created_by)
-- CREATE POLICY "insert_scheduled_classes" ON scheduled_classes
--     FOR INSERT 
--     WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own scheduled classes
-- CREATE POLICY "update_own_scheduled_classes" ON scheduled_classes
--     FOR UPDATE 
--     USING (auth.uid() = created_by OR auth.jwt() ->> 'role' IN ('super_admin', 'firm_admin'));

-- Step 6: Create a trigger to automatically set created_by on insert
CREATE OR REPLACE FUNCTION set_created_by_on_scheduled_classes()
RETURNS TRIGGER AS $$
BEGIN
    -- Set created_by to current user if not already set
    IF NEW.created_by IS NULL THEN
        NEW.created_by := auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_set_created_by_scheduled_classes ON scheduled_classes;
CREATE TRIGGER trigger_set_created_by_scheduled_classes
    BEFORE INSERT ON scheduled_classes
    FOR EACH ROW
    EXECUTE FUNCTION set_created_by_on_scheduled_classes();

-- Step 7: Verification
DO $$
BEGIN
    -- Verify column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'scheduled_classes' 
        AND column_name = 'created_by'
    ) THEN
        RAISE NOTICE '✅ Migration completed successfully';
        RAISE NOTICE 'Column created_by added to scheduled_classes table';
        RAISE NOTICE 'Index idx_scheduled_classes_created_by created';
        RAISE NOTICE 'Trigger trigger_set_created_by_scheduled_classes created';
    ELSE
        RAISE EXCEPTION '❌ Migration failed: created_by column not found';
    END IF;
END $$;

-- Display final table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'scheduled_classes' 
ORDER BY ordinal_position;

COMMIT;

-- =====================================================
-- Migration completed
-- =====================================================