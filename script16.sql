-- Migration Script: Add created_by column to scheduled_classes table
-- File: script16.sql
-- Description: Adds created_by column to track who created each scheduled class
-- Links to auth.users table

-- Add created_by column to scheduled_classes table
ALTER TABLE scheduled_classes 
ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comment to the column for documentation
COMMENT ON COLUMN scheduled_classes.created_by IS 'References auth.users(id) - the user who created this scheduled class';

-- Create index for better query performance on created_by
CREATE INDEX IF NOT EXISTS idx_scheduled_classes_created_by 
ON scheduled_classes(created_by);

-- Optional: Update existing records to set created_by to a default admin user
-- (Uncomment and modify the UUID below if you want to set a default creator for existing records)
-- UPDATE scheduled_classes 
-- SET created_by = 'your-admin-user-uuid-here'
-- WHERE created_by IS NULL;

-- Verify the column was added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'scheduled_classes' 
AND column_name = 'created_by';

-- Show the updated table structure
\d scheduled_classes;