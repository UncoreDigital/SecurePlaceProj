-- =============================================================================
-- MARKETING GALLERY
--
-- Replaces marketing.resources (gated PDF downloads) with a photo gallery.
--
-- The guides section was removed from the website: the documents it advertised
-- had never been written, so the page invited visitors to request assets that
-- could not be sent. A gallery of real session photographs is what the client
-- asked for in its place, and it does something the guides never did — show
-- evidence of the work rather than describing it.
--
-- Run after marketing-schema-migration.sql. Idempotent — safe to re-run.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. RETIRE THE RESOURCES TABLE
--
--    Dropped rather than left behind: an unused table with public-read RLS is
--    a surface nobody maintains. The marketing-docs storage bucket stays, since
--    the Secure Score PDF reports still use it.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public reads live resources" ON marketing.resources;
DROP POLICY IF EXISTS "Super admins manage resources" ON marketing.resources;
DROP TABLE IF EXISTS marketing.resources;


-- -----------------------------------------------------------------------------
-- 2. ALBUMS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS marketing.gallery_albums (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL,
  description     text NOT NULL DEFAULT '',

  -- Both nullable on purpose. An album with no confirmed date is fine; an
  -- album with an invented one is exactly the problem the seeded workshop
  -- schedule caused.
  location        text,
  taken_on        date,

  category        text NOT NULL DEFAULT 'Training',
  cover_photo_id  uuid,          -- FK added in section 3, once photos exists
  is_featured     boolean NOT NULL DEFAULT false,
  display_order   smallint NOT NULL DEFAULT 0,
  seo_title       text,
  seo_description text,
  status          marketing.content_status NOT NULL DEFAULT 'draft',
  published_at    timestamptz,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT albums_published_needs_date
    CHECK (status <> 'published' OR published_at IS NOT NULL),
  -- A published album with no photographs is an empty page with a promise on it.
  CONSTRAINT albums_taken_on_not_future
    CHECK (taken_on IS NULL OR taken_on <= CURRENT_DATE)
);

CREATE INDEX IF NOT EXISTS albums_live_idx
  ON marketing.gallery_albums (display_order, published_at DESC)
  WHERE status = 'published';


-- -----------------------------------------------------------------------------
-- 3. PHOTOS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS marketing.gallery_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id      uuid NOT NULL REFERENCES marketing.gallery_albums(id) ON DELETE CASCADE,

  -- Object path inside the marketing-media bucket.
  storage_path  text NOT NULL,

  -- NOT NULL and non-empty by constraint. Alt text is the difference between a
  -- gallery and a wall of nothing on a screen reader, and it is the field
  -- everyone skips unless the database refuses the row.
  alt           text NOT NULL CHECK (length(btrim(alt)) > 0),

  caption       text,
  width         integer CHECK (width > 0),
  height        integer CHECK (height > 0),
  display_order smallint NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT photos_unique_path_per_album UNIQUE (album_id, storage_path)
);

CREATE INDEX IF NOT EXISTS photos_album_idx
  ON marketing.gallery_photos (album_id, display_order);

-- Cover is set to one of the album's own photos. ON DELETE SET NULL so removing
-- a photo blanks the cover rather than blocking the delete.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'albums_cover_fk'
  ) THEN
    ALTER TABLE marketing.gallery_albums
      ADD CONSTRAINT albums_cover_fk
      FOREIGN KEY (cover_photo_id)
      REFERENCES marketing.gallery_photos(id) ON DELETE SET NULL;
  END IF;
END
$$;


-- -----------------------------------------------------------------------------
-- 4. PHOTO COUNT
--    Denormalised so the album grid does not need a correlated count per card.
-- -----------------------------------------------------------------------------

ALTER TABLE marketing.gallery_albums
  ADD COLUMN IF NOT EXISTS photo_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION marketing.sync_album_photo_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target uuid := COALESCE(NEW.album_id, OLD.album_id);
BEGIN
  UPDATE marketing.gallery_albums a
     SET photo_count = (
           SELECT count(*) FROM marketing.gallery_photos p WHERE p.album_id = a.id
         )
   WHERE a.id = target;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_photo_count ON marketing.gallery_photos;
CREATE TRIGGER sync_photo_count
  AFTER INSERT OR DELETE OR UPDATE OF album_id ON marketing.gallery_photos
  FOR EACH ROW EXECUTE FUNCTION marketing.sync_album_photo_count();

DROP TRIGGER IF EXISTS set_updated_at ON marketing.gallery_albums;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON marketing.gallery_albums
  FOR EACH ROW EXECUTE FUNCTION marketing.set_updated_at();


-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------

ALTER TABLE marketing.gallery_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing.gallery_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads live albums" ON marketing.gallery_albums;
CREATE POLICY "Public reads live albums" ON marketing.gallery_albums
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND published_at <= now());

-- Photos inherit their album's visibility, so an unpublished album's images are
-- not readable by guessing ids.
DROP POLICY IF EXISTS "Public reads photos of live albums" ON marketing.gallery_photos;
CREATE POLICY "Public reads photos of live albums" ON marketing.gallery_photos
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM marketing.gallery_albums a
      WHERE a.id = gallery_photos.album_id
        AND a.status = 'published'
        AND a.published_at <= now()
    )
  );

DROP POLICY IF EXISTS "Super admins manage gallery_albums" ON marketing.gallery_albums;
CREATE POLICY "Super admins manage gallery_albums" ON marketing.gallery_albums
  FOR ALL TO authenticated
  USING (marketing.is_super_admin())
  WITH CHECK (marketing.is_super_admin());

DROP POLICY IF EXISTS "Super admins manage gallery_photos" ON marketing.gallery_photos;
CREATE POLICY "Super admins manage gallery_photos" ON marketing.gallery_photos
  FOR ALL TO authenticated
  USING (marketing.is_super_admin())
  WITH CHECK (marketing.is_super_admin());


-- -----------------------------------------------------------------------------
-- 6. GRANTS
-- -----------------------------------------------------------------------------

GRANT SELECT ON
  marketing.gallery_albums,
  marketing.gallery_photos
TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON
  marketing.gallery_albums,
  marketing.gallery_photos
TO authenticated;

GRANT ALL ON marketing.gallery_albums, marketing.gallery_photos TO service_role;


-- -----------------------------------------------------------------------------
-- 7. VERIFY
-- -----------------------------------------------------------------------------

-- SELECT tablename, rowsecurity FROM pg_tables
--  WHERE schemaname = 'marketing' AND tablename LIKE 'gallery%';

-- Confirm resources is gone:
-- SELECT to_regclass('marketing.resources');   -- expect NULL

-- Photo count stays in step with its trigger:
-- SELECT a.slug, a.photo_count, count(p.id) AS actual
--   FROM marketing.gallery_albums a
--   LEFT JOIN marketing.gallery_photos p ON p.album_id = a.id
--  GROUP BY a.slug, a.photo_count;
