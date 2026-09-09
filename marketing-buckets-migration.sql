-- =============================================================================
-- MARKETING STORAGE BUCKETS
-- Companion to marketing-schema-migration.sql. Run that one first.
--
-- Three buckets, and the third is deliberately different from the other two:
--
--   marketing-media  public   cover images for posts, episodes, workshops
--   marketing-audio  public   podcast audio; must be public so <audio> and any
--                             podcast RSS feed can stream it without auth
--   marketing-docs   PRIVATE  gated PDFs and generated Secure Score reports
--
-- marketing-docs is private on purpose. Gating a PDF behind an email form is
-- pointless if the object URL is guessable and public -- the file gets shared,
-- indexed, and the lead capture stops earning anything. Server actions hand out
-- short-lived signed URLs after the email is captured instead.
--
-- Idempotent -- safe to re-run.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. BUCKETS
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing-media', 'marketing-media', true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing-audio', 'marketing-audio', true,
  524288000,  -- 500 MB; an hour of 128kbps MP3 is ~55 MB, so this is generous
  ARRAY['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/ogg', 'audio/webm']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing-docs', 'marketing-docs', false,
  52428800,  -- 50 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;


-- -----------------------------------------------------------------------------
-- 2. POLICIES
--
-- Uploads are restricted to super admins rather than to any authenticated user.
-- The existing question-images bucket allows any authenticated upload, which is
-- fine for a bucket only admins can reach in the UI -- but these buckets back
-- the public website, so an employee account should not be able to put a file
-- where it may end up rendered on the marketing site.
-- -----------------------------------------------------------------------------

-- 2.1 marketing-media --------------------------------------------------------

DROP POLICY IF EXISTS "Public read marketing-media" ON storage.objects;
CREATE POLICY "Public read marketing-media" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'marketing-media');

DROP POLICY IF EXISTS "Super admins upload marketing-media" ON storage.objects;
CREATE POLICY "Super admins upload marketing-media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketing-media' AND marketing.is_super_admin());

DROP POLICY IF EXISTS "Super admins update marketing-media" ON storage.objects;
CREATE POLICY "Super admins update marketing-media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'marketing-media' AND marketing.is_super_admin())
  WITH CHECK (bucket_id = 'marketing-media' AND marketing.is_super_admin());

DROP POLICY IF EXISTS "Super admins delete marketing-media" ON storage.objects;
CREATE POLICY "Super admins delete marketing-media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'marketing-media' AND marketing.is_super_admin());


-- 2.2 marketing-audio --------------------------------------------------------

DROP POLICY IF EXISTS "Public read marketing-audio" ON storage.objects;
CREATE POLICY "Public read marketing-audio" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'marketing-audio');

DROP POLICY IF EXISTS "Super admins upload marketing-audio" ON storage.objects;
CREATE POLICY "Super admins upload marketing-audio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketing-audio' AND marketing.is_super_admin());

DROP POLICY IF EXISTS "Super admins update marketing-audio" ON storage.objects;
CREATE POLICY "Super admins update marketing-audio" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'marketing-audio' AND marketing.is_super_admin())
  WITH CHECK (bucket_id = 'marketing-audio' AND marketing.is_super_admin());

DROP POLICY IF EXISTS "Super admins delete marketing-audio" ON storage.objects;
CREATE POLICY "Super admins delete marketing-audio" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'marketing-audio' AND marketing.is_super_admin());


-- 2.3 marketing-docs (private) -----------------------------------------------
--
-- No anon SELECT policy at all. Reads happen one of two ways:
--   * the marketing site's server action mints a signed URL with the
--     service-role key, after capturing the email;
--   * a super admin browses the library in the portal.

DROP POLICY IF EXISTS "Super admins read marketing-docs" ON storage.objects;
CREATE POLICY "Super admins read marketing-docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'marketing-docs' AND marketing.is_super_admin());

DROP POLICY IF EXISTS "Super admins upload marketing-docs" ON storage.objects;
CREATE POLICY "Super admins upload marketing-docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketing-docs' AND marketing.is_super_admin());

DROP POLICY IF EXISTS "Super admins update marketing-docs" ON storage.objects;
CREATE POLICY "Super admins update marketing-docs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'marketing-docs' AND marketing.is_super_admin())
  WITH CHECK (bucket_id = 'marketing-docs' AND marketing.is_super_admin());

DROP POLICY IF EXISTS "Super admins delete marketing-docs" ON storage.objects;
CREATE POLICY "Super admins delete marketing-docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'marketing-docs' AND marketing.is_super_admin());


-- -----------------------------------------------------------------------------
-- 3. VERIFY
--    Expect marketing-media and marketing-audio public = true,
--    marketing-docs public = false.
-- -----------------------------------------------------------------------------

-- SELECT id, public, file_size_limit
--   FROM storage.buckets
--  WHERE id LIKE 'marketing-%'
--  ORDER BY id;
