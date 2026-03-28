-- Add email and password columns to locations table
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Remove the defaults after adding (so future inserts must provide values)
ALTER TABLE locations
  ALTER COLUMN email DROP DEFAULT;

ALTER TABLE locations
  ALTER COLUMN password DROP DEFAULT;

-- Add location_admin to the user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'location_admin';

-- RLS: allow location_admin to read their own profile
CREATE POLICY IF NOT EXISTS "Location admins can view their own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());
