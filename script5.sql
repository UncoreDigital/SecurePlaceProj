-- Update by email (replace with your actual email)
-- INSERT INTO auth.users (id, email)
-- VALUES ('2853d098-9274-4525-a16d-f0d1bbe49297', 'neha.uncoredigital@gmail.com');  


-- UPDATE auth.users
-- SET encrypted_password = '$2a$10$KiixYNjYAaH68Ezob18Ab.xIeAwLnyaLhoylIkquJj5G3f6Wq7/J2'
-- WHERE id = '2853d098-9274-4525-a16d-f0d1bbe49297';

-- Then create the user profile
-- INSERT INTO user_profiles (
--   id,
--   email,
--   first_name,
--   last_name,
--   role,
--   is_active,
--   last_login_at
-- )
-- VALUES (
--   '2853d098-9274-4525-a16d-f0d1bbe49297',
--   'neha.uncoredigital@gmail.com',
--   'Admin',
--   'User',
--   'super_admin',
--   true,
--   NOW()
-- );


UPDATE user_profiles 
SET role = 'super_admin' 
WHERE email = 'neha.uncoredigital@gmail.com';

-- Or update by user ID (replace with your actual user ID)
UPDATE user_profiles 
SET role = 'super_admin' 
WHERE id = '2853d098-9274-4525-a16d-f0d1bbe49297'
;