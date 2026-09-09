-- =============================================================================
-- MARKETING WEBHOOKS
-- Notifies the `marketing-lead-notification` edge function whenever an inbound
-- row lands: a lead, a Secure Score submission or a workshop registration.
--
-- Run after marketing-schema-migration.sql, and after the function is deployed:
--   supabase functions deploy marketing-lead-notification --no-verify-jwt
--
-- -----------------------------------------------------------------------------
-- WHY THIS NO LONGER USES supabase_functions.http_request()
--
-- That helper lives in the `supabase_functions` schema, which only exists once
-- Supabase's Database Webhooks feature has been enabled on the project. On a
-- project where it has not been, this migration failed with:
--     ERROR: 3F000: schema "supabase_functions" does not exist
--
-- Calling pg_net directly removes that dependency — nothing to enable in the
-- dashboard first — and fixes a real weakness in the old approach: the helper
-- takes the webhook secret as a literal trigger argument, so it was stored in
-- the trigger definition and readable by anyone who could run
-- pg_get_triggerdef() or read information_schema.triggers. Here the secret
-- lives in a locked-down config table that only the SECURITY DEFINER trigger
-- function can read.
-- -----------------------------------------------------------------------------
--
-- SETUP: run this file, then fill in section 3 with your real values.
-- Generate the secret with:  openssl rand -hex 32
--
-- Idempotent -- safe to re-run.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. PRECONDITIONS
--
--    Fail with a sentence you can act on, rather than a "relation does not
--    exist" from whichever statement happens to run first.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regnamespace('marketing') IS NULL THEN
    RAISE EXCEPTION
      'The marketing schema does not exist. Run marketing-schema-migration.sql first.';
  END IF;

  IF to_regclass('marketing.leads') IS NULL
     OR to_regclass('marketing.assessments') IS NULL
     OR to_regclass('marketing.workshop_registrations') IS NULL THEN
    RAISE EXCEPTION
      'The marketing inbound tables are missing. Run marketing-schema-migration.sql first.';
  END IF;
END
$$;


-- -----------------------------------------------------------------------------
-- 1. pg_net
--
--    Supabase ships pg_net, but the schema it lands in varies by project age:
--    older projects have it in `net`, newer ones in `extensions`. Rather than
--    guess, install if absent and let section 4 resolve whichever is present.
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'http_post' AND n.nspname IN ('net', 'extensions')
  ) THEN
    RAISE EXCEPTION
      'pg_net is not available. Enable it under Database -> Extensions, then re-run this file.';
  END IF;
END
$$;


-- -----------------------------------------------------------------------------
-- 2. CONFIG
--
--    One row, holding the function URL and the shared secret. RLS is on with no
--    policies at all, so anon and authenticated cannot read it under any
--    circumstances; only the SECURITY DEFINER function below and service_role
--    can. This is where the secret lives instead of inside a trigger body.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS marketing.webhook_config (
  -- Single-row table: the CHECK plus the primary key make a second row impossible.
  id             boolean PRIMARY KEY DEFAULT true CHECK (id),
  function_url   text NOT NULL,
  webhook_secret text NOT NULL,
  is_enabled     boolean NOT NULL DEFAULT true,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE marketing.webhook_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON marketing.webhook_config FROM PUBLIC, anon, authenticated;
GRANT ALL ON marketing.webhook_config TO service_role;


-- -----------------------------------------------------------------------------
-- 3. >>> FILL THIS IN <<<
--
--    Replace both values, then run this statement. Re-running updates in place.
-- -----------------------------------------------------------------------------

-- INSERT INTO marketing.webhook_config (id, function_url, webhook_secret)
-- VALUES (
--   true,
--   'https://<PROJECT_REF>.supabase.co/functions/v1/marketing-lead-notification',
--   '<WEBHOOK_SECRET>'   -- must match MARKETING_WEBHOOK_SECRET in the function's secrets
-- )
-- ON CONFLICT (id) DO UPDATE
--   SET function_url   = EXCLUDED.function_url,
--       webhook_secret = EXCLUDED.webhook_secret,
--       updated_at     = now();


-- -----------------------------------------------------------------------------
-- 4. TRIGGER FUNCTION
--
--    Builds the same payload shape the edge function reads -- { schema, table,
--    record } -- and posts it through pg_net.
--
--    SECURITY DEFINER so it can read webhook_config, with an explicit
--    search_path so the definer rights cannot be abused through a shadowed
--    function name. Both candidate pg_net schemas are on the path, which is how
--    this works on old and new projects alike.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION marketing.notify_inbound()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = net, extensions, pg_catalog, pg_temp
AS $$
DECLARE
  cfg marketing.webhook_config%ROWTYPE;
BEGIN
  SELECT * INTO cfg FROM marketing.webhook_config WHERE id LIMIT 1;

  -- No config yet, or deliberately switched off. The row still gets written --
  -- capturing the lead matters more than notifying about it.
  IF NOT FOUND OR NOT cfg.is_enabled THEN
    RETURN NULL;
  END IF;

  PERFORM http_post(
    url := cfg.function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', cfg.webhook_secret
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'schema', TG_TABLE_SCHEMA,
      'table', TG_TABLE_NAME,
      'record', to_jsonb(NEW)
    ),
    -- The function returns 202 as soon as it has validated the request, so
    -- this only has to cover a cold start, not the SMTP round trips.
    timeout_milliseconds := 10000
  );

  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- An AFTER trigger that raises would roll back the INSERT. A lead is worth
    -- more than its notification, so log and let the row stand.
    RAISE WARNING 'marketing.notify_inbound failed for %.%: %',
      TG_TABLE_SCHEMA, TG_TABLE_NAME, SQLERRM;
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION marketing.notify_inbound() FROM PUBLIC, anon, authenticated;


-- -----------------------------------------------------------------------------
-- 5. TRIGGERS
--
--    AFTER INSERT only. Updates are deliberately not wired: a super admin
--    changing a lead's status in the portal should not email anyone.
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS on_marketing_lead_created ON marketing.leads;
CREATE TRIGGER on_marketing_lead_created
  AFTER INSERT ON marketing.leads
  FOR EACH ROW EXECUTE FUNCTION marketing.notify_inbound();

DROP TRIGGER IF EXISTS on_marketing_assessment_created ON marketing.assessments;
CREATE TRIGGER on_marketing_assessment_created
  AFTER INSERT ON marketing.assessments
  FOR EACH ROW EXECUTE FUNCTION marketing.notify_inbound();

DROP TRIGGER IF EXISTS on_marketing_registration_created ON marketing.workshop_registrations;
CREATE TRIGGER on_marketing_registration_created
  AFTER INSERT ON marketing.workshop_registrations
  FOR EACH ROW EXECUTE FUNCTION marketing.notify_inbound();


-- -----------------------------------------------------------------------------
-- 6. ORDERING NOTE FOR THE SECURE SCORE FLOW
--
--    A Secure Score submission writes two rows: the lead, then the assessment
--    that references it. Both fire, so inserting them in the wrong order sends
--    the team a "no contact details captured" notification a moment before the
--    real one.
--
--    The site's server action must INSERT the lead first, take its id, and
--    INSERT the assessment second with lead_id set. Leads created with
--    source = 'secure_score' are deliberately excluded from the generic
--    acknowledgement in the edge function, so the visitor receives exactly one
--    email -- their score.
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- 7. VERIFY
-- -----------------------------------------------------------------------------

-- Config is present and switched on:
-- SELECT function_url, is_enabled, updated_at FROM marketing.webhook_config;

-- Triggers are attached (expect three):
-- SELECT event_object_table, trigger_name
--   FROM information_schema.triggers
--  WHERE event_object_schema = 'marketing'
--  ORDER BY event_object_table;

-- Confirm the secret is NOT sitting in the trigger definition any more:
-- SELECT pg_get_triggerdef(oid) FROM pg_trigger
--  WHERE tgname = 'on_marketing_lead_created';

-- End-to-end test. Expect a 200 below a few seconds later, and two emails.
-- INSERT INTO marketing.leads (name, email, company, message, source)
-- VALUES ('Webhook Test', 'you@yourdomain.com', 'Test Co', 'Testing the webhook.', 'contact');

-- Recent pg_net calls and their responses:
--   -- pg_net lives in `net` on older projects and `extensions` on newer ones;
--   -- use whichever of these resolves.
-- SELECT id, status_code, error_msg, created
--   FROM net._http_response ORDER BY created DESC LIMIT 20;
-- SELECT id, status_code, error_msg, created
--   FROM extensions._http_response ORDER BY created DESC LIMIT 20;

-- DELETE FROM marketing.leads WHERE email = 'you@yourdomain.com';
