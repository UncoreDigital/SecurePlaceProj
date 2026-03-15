-- Add description column to certificates table
-- This script adds a new description field to store certificate descriptions

-- Add description column
ALTER TABLE certificates
ADD COLUMN description TEXT;

-- Add comment to the column
COMMENT ON COLUMN certificates.description IS 'Description text for the certificate';

-- Optional: Set a default value for existing records
-- UPDATE certificates 
-- SET description = 'Aayaas Counselling, promoting employee wellbeing, stress management, and a healthier workplace culture.'
-- WHERE description IS NULL;
