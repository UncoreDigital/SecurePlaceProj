-- 26) Add is_all_location_admin to user_profiles and profiles view

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_all_location_admin BOOLEAN DEFAULT false;


-- Recreate profiles view with the new column included.
DROP POLICY IF EXISTS "Admins can insert scheduled classes" ON scheduled_classes;


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
  is_all_location_admin,
  last_login_at
FROM user_profiles;



CREATE POLICY "Admins can insert scheduled classes"
ON scheduled_classes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);