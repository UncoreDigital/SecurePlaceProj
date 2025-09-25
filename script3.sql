-- 1) Add last login timestamp to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 2) Create/replace a view that matches what the app expects
CREATE OR REPLACE VIEW profiles AS
SELECT
  id,
  (COALESCE(first_name, '') || CASE WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN ' ' ELSE '' END || COALESCE(last_name, '')) AS full_name,
  role,
  firm_id,
  last_login_at
FROM user_profiles;