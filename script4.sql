-- Ensure firm
INSERT INTO firms (name) VALUES ('Default Firm')
ON CONFLICT DO NOTHING;

-- Get firm id
WITH f AS (
  SELECT id FROM firms WHERE name = 'Default Firm' LIMIT 1
)
-- Create/Update profile row for the auth user you just created
INSERT INTO user_profiles (id, email, first_name, last_name, role, firm_id, is_active, last_login_at)
SELECT
  u.id,
  u.email,
  'Admin',
  'User',
  'super_admin',
  (SELECT id FROM f),
  true,
  NOW()
FROM auth.users u
WHERE u.email = 'neha.uncoredigital@gmail.com'
ON CONFLICT (id) DO UPDATE
SET role = EXCLUDED.role,
    firm_id = EXCLUDED.firm_id,
    is_active = EXCLUDED.is_active,
    last_login_at = EXCLUDED.last_login_at;