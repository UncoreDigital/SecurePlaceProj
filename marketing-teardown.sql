-- =============================================================================
-- MARKETING TEARDOWN  —  removes everything the marketing migrations created
--
-- ⚠  SCOPE: this touches ONLY the `marketing` schema and the three
--    `marketing-*` storage buckets.
--
--    It does NOT touch `public`. Your firms, profiles, employees, locations,
--    incidents, drills, safety_classes, scheduled_classes, certificates and
--    form data are in `public` and are left completely alone. Section 0 aborts
--    if anything here would reach outside those two areas.
--
-- Use this to reset a botched setup and start the migrations from scratch.
--
-- WHAT IS DESTROYED (irreversibly):
--   • every blog post, podcast episode, workshop, gallery album and photo
--   • every captured lead, Secure Score submission and workshop registration
--   • every file uploaded to marketing-media / marketing-audio / marketing-docs
--
-- Take a backup first if any of that matters. In dev it usually does not.
--
-- Idempotent — safe to run on a partially-created setup, or twice.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. SAFETY CHECK
--
--    Refuses to run if `public` looks like it is about to be caught up in this.
--    Cheap insurance against a mistyped schema name in a hurry.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regnamespace('marketing') IS NULL THEN
    RAISE NOTICE 'No marketing schema found — nothing to tear down. Continuing to clean storage.';
  END IF;

  IF to_regclass('public.firms') IS NULL THEN
    RAISE EXCEPTION
      'Aborting: public.firms is missing, so this does not look like the expected database. Check you are connected to the right project.';
  END IF;
END
$$;


-- -----------------------------------------------------------------------------
-- 1. STORAGE POLICIES
--
--    These live on storage.objects, not inside `marketing`, so dropping the
--    schema does not remove them. They must go by name or they linger and
--    conflict when the buckets migration is re-run.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public read marketing-media"          ON storage.objects;
DROP POLICY IF EXISTS "Super admins upload marketing-media"  ON storage.objects;
DROP POLICY IF EXISTS "Super admins update marketing-media"  ON storage.objects;
DROP POLICY IF EXISTS "Super admins delete marketing-media"  ON storage.objects;

DROP POLICY IF EXISTS "Public read marketing-audio"          ON storage.objects;
DROP POLICY IF EXISTS "Super admins upload marketing-audio"  ON storage.objects;
DROP POLICY IF EXISTS "Super admins update marketing-audio"  ON storage.objects;
DROP POLICY IF EXISTS "Super admins delete marketing-audio"  ON storage.objects;

DROP POLICY IF EXISTS "Super admins read marketing-docs"     ON storage.objects;
DROP POLICY IF EXISTS "Super admins upload marketing-docs"   ON storage.objects;
DROP POLICY IF EXISTS "Super admins update marketing-docs"   ON storage.objects;
DROP POLICY IF EXISTS "Super admins delete marketing-docs"   ON storage.objects;


-- -----------------------------------------------------------------------------
-- 2. STORAGE BUCKETS — deliberately NOT deleted here
--
--    Supabase blocks row-level deletes on the storage tables:
--        ERROR 42501: Direct deletion from storage tables is not allowed.
--                     Use the Storage API instead.
--                     (trigger storage.protect_delete)
--
--    That guard is correct — deleting rows behind Storage's back leaves the
--    actual files orphaned in the object store — so this file no longer tries.
--
--    It also does not need to. marketing-buckets-migration.sql upserts with
--    ON CONFLICT (id) DO UPDATE, so re-running it reconfigures the existing
--    buckets rather than failing on them. Leaving them in place is the normal
--    path for a reset.
--
--    If you do want them gone entirely, that has to go through the Storage API:
--
--      Dashboard → Storage → pick the bucket → Empty bucket → Delete bucket
--
--    or, from a terminal (repeat per bucket; empty first, then delete):
--
--      curl -X POST "$SUPABASE_URL/storage/v1/bucket/marketing-media/empty" \
--        -H "Authorization: Bearer $SERVICE_ROLE_KEY"
--      curl -X DELETE "$SUPABASE_URL/storage/v1/bucket/marketing-media" \
--        -H "Authorization: Bearer $SERVICE_ROLE_KEY"
--
--    Only ever touch marketing-media, marketing-audio and marketing-docs.
--    question-images belongs to the safety-class form builder and must stay.
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- 3. THE SCHEMA
--
--    CASCADE removes the tables, their triggers, the enums and the four
--    marketing.* functions in one statement. Nothing outside the schema
--    references them, so nothing else is pulled in.
-- -----------------------------------------------------------------------------

DROP SCHEMA IF EXISTS marketing CASCADE;


-- -----------------------------------------------------------------------------
-- 4. UN-EXPOSE THE SCHEMA
--
--    Leaving `marketing` in the exposed list after dropping it makes PostgREST
--    log errors on every schema-cache reload. This strips it out while leaving
--    whatever else was exposed untouched.
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  exposed text;
  cleaned text;
BEGIN
  SELECT (SELECT substring(cfg FROM 'pgrst.db_schemas=(.*)')
            FROM pg_roles r, unnest(r.rolconfig) AS cfg
           WHERE r.rolname = 'authenticator'
             AND cfg LIKE 'pgrst.db_schemas=%')
    INTO exposed;

  IF exposed IS NULL THEN
    RAISE NOTICE 'pgrst.db_schemas was never set — nothing to clean.';
    RETURN;
  END IF;

  -- Drop the marketing entry, then tidy any doubled or trailing separators.
  cleaned := regexp_replace(exposed, '(^|,)\s*marketing\s*(?=,|$)', '', 'g');
  cleaned := regexp_replace(cleaned, ',\s*,', ',', 'g');
  cleaned := btrim(regexp_replace(cleaned, '(^\s*,)|(,\s*$)', '', 'g'));

  IF cleaned = '' THEN
    cleaned := 'public, graphql_public';
  END IF;

  EXECUTE format('ALTER ROLE authenticator SET pgrst.db_schemas = %L', cleaned);
  RAISE NOTICE 'Exposed schemas is now: %', cleaned;
END
$$;

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';


-- -----------------------------------------------------------------------------
-- 5. VERIFY THE TEARDOWN
-- -----------------------------------------------------------------------------

-- Schema is gone (expect NULL):
-- SELECT to_regnamespace('marketing');

-- No marketing buckets remain (expect 0 rows):
-- SELECT id FROM storage.buckets WHERE id LIKE 'marketing-%';

-- No marketing storage policies remain (expect 0 rows):
-- SELECT policyname FROM pg_policies
--  WHERE schemaname = 'storage' AND policyname ILIKE '%marketing-%';

-- Exposed schemas no longer lists marketing:
-- SELECT unnest(rolconfig) FROM pg_roles WHERE rolname = 'authenticator';

-- Your product data is untouched (expect your real firm count):
-- SELECT count(*) AS firms FROM public.firms;
