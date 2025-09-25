-- Add missing columns to firms table
ALTER TABLE firms 
ADD COLUMN IF NOT EXISTS industry VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);

-- Add missing columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS official_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS employee_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_volunteer BOOLEAN DEFAULT false;

-- Drop and recreate the profiles view to include the new columns
DROP VIEW IF EXISTS profiles;
CREATE VIEW profiles AS
SELECT
  id,
  (COALESCE(first_name, '') ||
   CASE WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN ' ' ELSE '' END ||
   COALESCE(last_name, '')) AS full_name,
  role,
  firm_id,
  phone,
  official_email,
  employee_code,
  is_volunteer,
  last_login_at
FROM user_profiles;