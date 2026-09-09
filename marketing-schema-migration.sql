-- =============================================================================
-- MARKETING SCHEMA MIGRATION
-- Phase 00 of the Secure Place website rebuild.
--
-- Creates the `marketing` schema that backs the public website: blog posts,
-- podcast episodes, workshops, gated resources, leads and Secure Score
-- assessment submissions.
--
-- WHY A SEPARATE SCHEMA (not `public`):
-- This project also holds employee PII, incident reports and firm data. The
-- marketing site runs unauthenticated with the anon key. Keeping its tables in
-- their own schema means anon is granted USAGE on `marketing` and on nothing
-- else -- a mistaken policy on a blog table cannot reach an employee record.
--
-- WRITE MODEL:
-- anon has SELECT on published content and NOTHING else. Lead capture,
-- workshop registration and assessment submissions are written by the
-- marketing site's Next.js server actions using the service-role key, which
-- bypasses RLS. There is deliberately no anon INSERT policy anywhere here.
--
-- Run this in the Supabase SQL Editor. Idempotent -- safe to re-run.
--
-- MANUAL STEP AFTERWARDS (required, cannot be done in SQL):
--   Dashboard -> Project Settings -> API -> Exposed schemas
--   add `marketing` alongside `public`, then let PostgREST reload.
--   Without this the site gets 404s on every marketing table.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. SCHEMA
-- -----------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS marketing;

COMMENT ON SCHEMA marketing IS
  'Public website content and inbound leads. Isolated from public.* so the '
  'unauthenticated site role never has reach over employee or incident data.';

-- Nobody gets anything by default; every grant below is deliberate.
REVOKE ALL ON SCHEMA marketing FROM PUBLIC;

GRANT USAGE ON SCHEMA marketing TO anon, authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 2. ENUMS
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t
                 JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'content_status' AND n.nspname = 'marketing') THEN
    CREATE TYPE marketing.content_status AS ENUM ('draft', 'scheduled', 'published', 'archived');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t
                 JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'workshop_format' AND n.nspname = 'marketing') THEN
    CREATE TYPE marketing.workshop_format AS ENUM ('onsite', 'virtual', 'hybrid');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t
                 JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'lead_source' AND n.nspname = 'marketing') THEN
    CREATE TYPE marketing.lead_source AS ENUM
      ('contact', 'demo', 'secure_score', 'guide_download', 'workshop', 'certification', 'other');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t
                 JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'lead_status' AND n.nspname = 'marketing') THEN
    CREATE TYPE marketing.lead_status AS ENUM
      ('new', 'contacted', 'qualified', 'won', 'lost');
  END IF;

  -- Bands mirror the thresholds already promised on the certification page:
  -- "Score above 70%? Get certified. Not certified? Get an improvement roadmap."
  IF NOT EXISTS (SELECT 1 FROM pg_type t
                 JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE t.typname = 'score_band' AND n.nspname = 'marketing') THEN
    CREATE TYPE marketing.score_band AS ENUM
      ('at_risk', 'developing', 'certifiable', 'certification_ready');
  END IF;
END
$$;


-- -----------------------------------------------------------------------------
-- 3. HELPERS
-- -----------------------------------------------------------------------------

-- Same check the portal's requireSuperAdmin() makes in TypeScript, and the same
-- shape as the existing policy helper in script26.sql. `profiles` is a view
-- over user_profiles, so this reads through it exactly as the app does.
CREATE OR REPLACE FUNCTION marketing.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
  );
$$;

COMMENT ON FUNCTION marketing.is_super_admin() IS
  'True when the calling user is a super_admin. Used by every write policy in '
  'the marketing schema. Firm and location admins never author website content.';

REVOKE ALL ON FUNCTION marketing.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION marketing.is_super_admin() TO anon, authenticated, service_role;


-- Keeps updated_at honest without the app having to remember.
CREATE OR REPLACE FUNCTION marketing.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- -----------------------------------------------------------------------------
-- 4. CONTENT TABLES
-- -----------------------------------------------------------------------------

-- 4.1 Blog posts -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS marketing.posts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text NOT NULL UNIQUE,
  title             text NOT NULL,
  excerpt           text NOT NULL DEFAULT '',
  body              text NOT NULL DEFAULT '',          -- TipTap HTML
  cover_url         text,
  author_name       text NOT NULL DEFAULT 'Secure Place to Work',
  author_role       text,
  author_avatar_url text,
  category          text NOT NULL DEFAULT 'General',
  tags              text[] NOT NULL DEFAULT '{}',
  reading_minutes   smallint NOT NULL DEFAULT 3 CHECK (reading_minutes BETWEEN 1 AND 120),
  is_featured       boolean NOT NULL DEFAULT false,
  seo_title         text,
  seo_description   text,
  status            marketing.content_status NOT NULL DEFAULT 'draft',
  published_at      timestamptz,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  -- A row can only claim to be published if it says when.
  CONSTRAINT posts_published_needs_date
    CHECK (status <> 'published' OR published_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS posts_live_idx
  ON marketing.posts (published_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS posts_category_idx ON marketing.posts (category);
CREATE INDEX IF NOT EXISTS posts_tags_idx     ON marketing.posts USING gin (tags);


-- 4.2 Podcast episodes -------------------------------------------------------

CREATE TABLE IF NOT EXISTS marketing.podcast_episodes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text NOT NULL UNIQUE,
  title            text NOT NULL,
  description      text NOT NULL DEFAULT '',
  show_notes       text NOT NULL DEFAULT '',           -- TipTap HTML
  transcript       text,
  season           smallint NOT NULL DEFAULT 1 CHECK (season > 0),
  episode_number   integer CHECK (episode_number > 0),
  audio_url        text,                               -- marketing-audio bucket
  duration_seconds integer CHECK (duration_seconds > 0),
  cover_url        text,
  guests           text[] NOT NULL DEFAULT '{}',
  spotify_url      text,
  apple_url        text,
  youtube_url      text,
  seo_title        text,
  seo_description  text,
  status           marketing.content_status NOT NULL DEFAULT 'draft',
  published_at     timestamptz,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT episodes_published_needs_date
    CHECK (status <> 'published' OR published_at IS NOT NULL),
  -- A published episode needs something to actually play.
  CONSTRAINT episodes_published_needs_audio
    CHECK (status <> 'published'
           OR audio_url IS NOT NULL
           OR spotify_url IS NOT NULL
           OR apple_url IS NOT NULL
           OR youtube_url IS NOT NULL),
  CONSTRAINT episodes_unique_number UNIQUE (season, episode_number)
);

CREATE INDEX IF NOT EXISTS episodes_live_idx
  ON marketing.podcast_episodes (published_at DESC)
  WHERE status = 'published';


-- 4.3 Workshops --------------------------------------------------------------

CREATE TABLE IF NOT EXISTS marketing.workshops (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text NOT NULL UNIQUE,
  title            text NOT NULL,
  summary          text NOT NULL DEFAULT '',
  description      text NOT NULL DEFAULT '',           -- TipTap HTML
  format           marketing.workshop_format NOT NULL DEFAULT 'onsite',
  duration_minutes integer NOT NULL DEFAULT 120 CHECK (duration_minutes > 0),
  audience         text,                               -- 'All staff', 'Safety volunteers', ...
  outcomes         text[] NOT NULL DEFAULT '{}',       -- "What you'll walk away with"
  modules          jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{title, minutes, points[]}]
  min_participants smallint CHECK (min_participants > 0),
  max_participants smallint CHECK (max_participants > 0),
  price_note       text,                               -- free text; no pricing engine
  cover_url        text,
  is_featured      boolean NOT NULL DEFAULT false,
  display_order    smallint NOT NULL DEFAULT 0,
  seo_title        text,
  seo_description  text,
  status           marketing.content_status NOT NULL DEFAULT 'draft',
  published_at     timestamptz,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT workshops_published_needs_date
    CHECK (status <> 'published' OR published_at IS NOT NULL),
  CONSTRAINT workshops_participant_range
    CHECK (min_participants IS NULL
           OR max_participants IS NULL
           OR min_participants <= max_participants)
);

CREATE INDEX IF NOT EXISTS workshops_live_idx
  ON marketing.workshops (display_order, published_at DESC)
  WHERE status = 'published';


-- 4.4 Scheduled runs of a workshop -------------------------------------------

CREATE TABLE IF NOT EXISTS marketing.workshop_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id      uuid NOT NULL REFERENCES marketing.workshops(id) ON DELETE CASCADE,
  starts_at        timestamptz NOT NULL,
  ends_at          timestamptz,
  timezone         text NOT NULL DEFAULT 'Asia/Kolkata',
  location         text,                               -- venue, or a joining note for virtual
  trainer          text,
  seats_total      smallint CHECK (seats_total > 0),
  seats_taken      smallint NOT NULL DEFAULT 0 CHECK (seats_taken >= 0),
  registration_url text,                               -- set when booking is handled elsewhere
  is_cancelled     boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT sessions_end_after_start
    CHECK (ends_at IS NULL OR ends_at > starts_at),
  CONSTRAINT sessions_not_oversold
    CHECK (seats_total IS NULL OR seats_taken <= seats_total),
  -- The same workshop cannot run twice at the same instant, and this stops a
  -- double-submitted admin form creating a duplicate date on the public page.
  CONSTRAINT sessions_unique_start UNIQUE (workshop_id, starts_at)
);

CREATE INDEX IF NOT EXISTS sessions_upcoming_idx
  ON marketing.workshop_sessions (workshop_id, starts_at);


-- 4.5 Gated resources (PDFs, checklists) -------------------------------------

CREATE TABLE IF NOT EXISTS marketing.resources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL,
  description     text NOT NULL DEFAULT '',
  file_path       text NOT NULL,                       -- object path in marketing-docs
  file_size_bytes bigint CHECK (file_size_bytes > 0),
  page_count      smallint CHECK (page_count > 0),
  cover_url       text,
  is_gated        boolean NOT NULL DEFAULT true,       -- gated = email required
  download_count  integer NOT NULL DEFAULT 0 CHECK (download_count >= 0),
  status          marketing.content_status NOT NULL DEFAULT 'draft',
  published_at    timestamptz,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT resources_published_needs_date
    CHECK (status <> 'published' OR published_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS resources_live_idx
  ON marketing.resources (published_at DESC)
  WHERE status = 'published';


-- -----------------------------------------------------------------------------
-- 5. INBOUND TABLES  (never readable by anon)
-- -----------------------------------------------------------------------------

-- 5.1 Leads ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS marketing.leads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  email        text NOT NULL,
  company      text,
  phone        text,
  job_title    text,
  message      text,
  source       marketing.lead_source NOT NULL DEFAULT 'contact',
  -- Which page or asset produced the lead, e.g. a resource slug.
  source_ref   text,
  utm          jsonb NOT NULL DEFAULT '{}'::jsonb,
  status       marketing.lead_status NOT NULL DEFAULT 'new',
  owner_notes  text,
  contacted_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT leads_email_shape CHECK (position('@' in email) > 1)
);

CREATE INDEX IF NOT EXISTS leads_inbox_idx  ON marketing.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_status_idx ON marketing.leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_email_idx  ON marketing.leads (lower(email));


-- 5.2 Workshop registrations -------------------------------------------------

CREATE TABLE IF NOT EXISTS marketing.workshop_registrations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES marketing.workshop_sessions(id) ON DELETE CASCADE,
  lead_id    uuid REFERENCES marketing.leads(id) ON DELETE SET NULL,
  name       text NOT NULL,
  email      text NOT NULL,
  company    text,
  phone      text,
  seats      smallint NOT NULL DEFAULT 1 CHECK (seats > 0),
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- One booking per person per session.
  CONSTRAINT registrations_unique_per_session UNIQUE (session_id, email)
);

CREATE INDEX IF NOT EXISTS registrations_session_idx
  ON marketing.workshop_registrations (session_id, created_at DESC);


-- 5.3 Secure Score assessments -----------------------------------------------

CREATE TABLE IF NOT EXISTS marketing.assessments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        uuid REFERENCES marketing.leads(id) ON DELETE SET NULL,
  company        text,
  industry       text,
  employee_band  text,        -- '1-50', '51-200', '201-1000', '1000+'
  site_count     smallint CHECK (site_count > 0),

  -- Raw responses, keyed by question id: {"emg_sos": 5, "rep_anon": 3, ...}
  answers        jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Percentage per pillar: {"emergency": 80, "reporting": 55, ...}
  pillar_scores  jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_score    smallint NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  band           marketing.score_band NOT NULL,

  -- Frozen at submission time so an old report stays reproducible when the
  -- question set or weighting is revised.
  engine_version text NOT NULL DEFAULT 'v1',

  report_path    text,        -- generated PDF in marketing-docs
  created_at     timestamptz NOT NULL DEFAULT now(),

  -- The band must agree with the score. Thresholds match the certification
  -- page's existing 70% rule.
  CONSTRAINT assessments_band_matches_score CHECK (
    band = CASE
      WHEN total_score >= 85 THEN 'certification_ready'::marketing.score_band
      WHEN total_score >= 70 THEN 'certifiable'::marketing.score_band
      WHEN total_score >= 50 THEN 'developing'::marketing.score_band
      ELSE 'at_risk'::marketing.score_band
    END
  )
);

CREATE INDEX IF NOT EXISTS assessments_recent_idx  ON marketing.assessments (created_at DESC);
CREATE INDEX IF NOT EXISTS assessments_band_idx    ON marketing.assessments (band);
-- Supports the industry benchmark on the result screen.
CREATE INDEX IF NOT EXISTS assessments_industry_idx ON marketing.assessments (industry, total_score);


-- -----------------------------------------------------------------------------
-- 6. updated_at TRIGGERS
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'posts', 'podcast_episodes', 'workshops',
    'workshop_sessions', 'resources', 'leads'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON marketing.%I', t);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON marketing.%I
         FOR EACH ROW EXECUTE FUNCTION marketing.set_updated_at()', t);
  END LOOP;
END
$$;


-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------

ALTER TABLE marketing.posts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing.podcast_episodes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing.workshops              ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing.workshop_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing.resources              ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing.leads                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing.workshop_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing.assessments            ENABLE ROW LEVEL SECURITY;

-- 7.1 Public read of live content only.
--     `published_at <= now()` is what makes scheduling work: a row can be
--     marked published with a future date and stays invisible until then.

DROP POLICY IF EXISTS "Public reads live posts" ON marketing.posts;
CREATE POLICY "Public reads live posts" ON marketing.posts
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND published_at <= now());

DROP POLICY IF EXISTS "Public reads live episodes" ON marketing.podcast_episodes;
CREATE POLICY "Public reads live episodes" ON marketing.podcast_episodes
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND published_at <= now());

DROP POLICY IF EXISTS "Public reads live workshops" ON marketing.workshops;
CREATE POLICY "Public reads live workshops" ON marketing.workshops
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND published_at <= now());

-- Sessions inherit their parent's visibility. Cancelled runs stay hidden.
DROP POLICY IF EXISTS "Public reads sessions of live workshops" ON marketing.workshop_sessions;
CREATE POLICY "Public reads sessions of live workshops" ON marketing.workshop_sessions
  FOR SELECT TO anon, authenticated
  USING (
    NOT is_cancelled
    AND EXISTS (
      SELECT 1 FROM marketing.workshops w
      WHERE w.id = workshop_sessions.workshop_id
        AND w.status = 'published'
        AND w.published_at <= now()
    )
  );

-- Resource rows are readable so the site can list titles and covers. The file
-- itself lives in a private bucket and is only ever handed out as a signed URL
-- by a server action, after the email gate.
DROP POLICY IF EXISTS "Public reads live resources" ON marketing.resources;
CREATE POLICY "Public reads live resources" ON marketing.resources
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND published_at <= now());

-- 7.2 Super admins author everything.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'posts', 'podcast_episodes', 'workshops', 'workshop_sessions',
    'resources', 'leads', 'workshop_registrations', 'assessments'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Super admins manage %1$s" ON marketing.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "Super admins manage %1$s" ON marketing.%1$I
         FOR ALL TO authenticated
         USING (marketing.is_super_admin())
         WITH CHECK (marketing.is_super_admin())', t);
  END LOOP;
END
$$;

-- 7.3 Deliberately absent:
--   * no anon INSERT anywhere -- the site writes through server actions on the
--     service-role key, so a leaked anon key cannot stuff the leads table;
--   * no policy at all on leads / workshop_registrations / assessments for
--     anon, so inbound PII is unreadable even if the schema is exposed.


-- -----------------------------------------------------------------------------
-- 8. GRANTS
--    RLS filters rows; grants decide whether a role may touch the table at all.
--    Both have to agree, so the inbound tables are locked at this level too.
-- -----------------------------------------------------------------------------

ALTER DEFAULT PRIVILEGES IN SCHEMA marketing REVOKE ALL ON TABLES FROM PUBLIC;

REVOKE ALL ON ALL TABLES IN SCHEMA marketing FROM anon, authenticated;

-- Read-only on the five content tables.
GRANT SELECT ON
  marketing.posts,
  marketing.podcast_episodes,
  marketing.workshops,
  marketing.workshop_sessions,
  marketing.resources
TO anon, authenticated;

-- Signed-in portal users need write access for the CMS; RLS narrows that to
-- super admins only.
GRANT INSERT, UPDATE, DELETE ON
  marketing.posts,
  marketing.podcast_episodes,
  marketing.workshops,
  marketing.workshop_sessions,
  marketing.resources
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  marketing.leads,
  marketing.workshop_registrations,
  marketing.assessments
TO authenticated;

-- Server actions on the marketing site.
GRANT ALL ON ALL TABLES IN SCHEMA marketing TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA marketing GRANT ALL ON TABLES TO service_role;


-- -----------------------------------------------------------------------------
-- 9. VERIFY
--    Expect: 8 tables, all with rowsecurity = true, and anon holding SELECT on
--    exactly 5 of them and no privilege at all on the three inbound tables.
-- -----------------------------------------------------------------------------

-- SELECT tablename, rowsecurity
--   FROM pg_tables WHERE schemaname = 'marketing' ORDER BY tablename;

-- SELECT table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS anon_privs
--   FROM information_schema.role_table_grants
--  WHERE table_schema = 'marketing' AND grantee = 'anon'
--  GROUP BY table_name ORDER BY table_name;
