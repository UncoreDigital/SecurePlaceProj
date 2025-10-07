-- Ensure firm
INSERT INTO firms (name) VALUES ('Default Firm')
ON CONFLICT DO NOTHING;

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at",  "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token",  "is_sso_user", "deleted_at", "is_anonymous") VALUES ('00000000-0000-0000-0000-000000000000', '2853d098-9274-4525-a16d-f0d1bbe49298', 'authenticated', 'authenticated', 'neha@gmail.com', '$2a$10$KiixYNjYAaH68Ezob18Ab.xIeAwLnyaLhoylIkquJj5G3f6Wq7/J2', '2025-09-18 06:55:13.658731+00', null, '', null, '', null, '', '', null, '2025-10-06 19:35:23.852219+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', null, '2025-09-18 06:55:13.654493+00', '2025-10-07 13:54:30.846546+00', null, null, '', '', null,  '', '0', null, '', 'false', null, 'false');

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