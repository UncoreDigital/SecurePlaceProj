-- =============================================================================
-- MARKETING SEED DATA  (development only)
-- Run after marketing-schema-migration.sql and marketing-buckets-migration.sql.
--
-- Enough rows for the portal CMS screens and the public site to be built
-- against something realistic. Subjects are drawn from the product's own
-- feature copy -- SOS alerting, drill management, BLS/first aid, POSH training
-- for employees, managers and ICC members -- rather than invented, so the
-- layouts get tested at true content lengths.
--
-- THIS IS NOT LAUNCH CONTENT. Every row is tagged 'seed' or flagged below, and
-- section 7 removes the lot in one statement. Clear it before go-live.
--
-- Podcast episodes seed as DRAFT on purpose: there is no real audio yet, and a
-- fabricated Spotify or Apple link on a published episode would 404 in front of
-- a visitor. Publish them once real files exist.
--
-- Idempotent -- safe to re-run.
--
-- !! IF marketing-webhooks-migration.sql HAS ALREADY RUN !!
-- Sections 6's leads and assessments have AFTER INSERT triggers on them, so
-- seeding will send eight real emails to your notification address. Either seed
-- before wiring the webhooks, or disable the triggers around this file:
--
--   ALTER TABLE marketing.leads       DISABLE TRIGGER on_marketing_lead_created;
--   ALTER TABLE marketing.assessments DISABLE TRIGGER on_marketing_assessment_created;
--   -- run this file --
--   ALTER TABLE marketing.leads       ENABLE TRIGGER on_marketing_lead_created;
--   ALTER TABLE marketing.assessments ENABLE TRIGGER on_marketing_assessment_created;
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. BLOG POSTS
-- -----------------------------------------------------------------------------

INSERT INTO marketing.posts
  (slug, title, excerpt, body, category, tags, reading_minutes,
   author_name, author_role, is_featured, status, published_at)
VALUES
(
  'seed-what-a-good-evacuation-drill-looks-like',
  'What a good evacuation drill actually looks like',
  'Most organisations run drills to satisfy a checklist. The ones that get value out of them measure a number, act on it, and run the next drill against it.',
  '<p>A drill that nobody times is an interruption, not a rehearsal. The difference between the two comes down to whether anyone wrote down how long it took.</p>'
  '<h2>Time the evacuation, every time</h2>'
  '<p>Record the interval from alarm to the last person reaching the assembly point. That single number is the only honest measure of whether the plan works, and it is the one most drill reports leave out.</p>'
  '<h2>Count who did not move</h2>'
  '<p>Participation rate matters more than headcount. If the same floor lags every quarter, the problem is the route or the warden coverage, not the people.</p>'
  '<h2>Close the loop before the next one</h2>'
  '<p>A drill report that produces no action item is a filing exercise. Assign each finding an owner and a date, then open the next drill by reviewing them.</p>',
  'Drills & Readiness',
  ARRAY['seed', 'drills', 'emergency-response'],
  4,
  'Secure Place to Work', 'Editorial team',
  true, 'published', now() - interval '6 days'
),
(
  'seed-anonymous-reporting-that-employees-trust',
  'Anonymous reporting that employees actually trust',
  'A reporting channel is only worth having if the person using it believes it cannot be traced back to them. Most internal channels fail that test on day one.',
  '<p>Organisations tend to measure a speak-up channel by how many reports it receives. A low number gets read as a healthy workplace. It is at least as likely to mean nobody trusts the channel.</p>'
  '<h2>Anonymity has to survive the org chart</h2>'
  '<p>If a report routes through a line manager before it reaches the committee, it is not anonymous, whatever the form promises. The route matters more than the wording.</p>'
  '<h2>Publish a response time and keep it</h2>'
  '<p>An acknowledgement within a stated window, every time, does more for trust than any awareness campaign. Silence is what teaches people the channel is decorative.</p>'
  '<h2>Report the outcomes, not the cases</h2>'
  '<p>Share aggregate resolution data with staff. People need evidence that reports lead somewhere before they will file one.</p>',
  'Speak-Up & Reporting',
  ARRAY['seed', 'reporting', 'posh', 'culture'],
  5,
  'Secure Place to Work', 'Editorial team',
  false, 'published', now() - interval '13 days'
),
(
  'seed-fire-noc-is-not-a-safety-programme',
  'A current fire NOC is not a safety programme',
  'Statutory compliance and actual readiness are different things, and organisations routinely mistake the first for the second.',
  '<p>A No Objection Certificate says a building met a standard on an inspection date. It says nothing about whether the people inside it know what to do at 3pm on a Tuesday.</p>'
  '<h2>What the certificate does not cover</h2>'
  '<p>Warden coverage per floor. Whether new joiners were inducted. Whether the assembly point is still where the signage says it is after the last office move.</p>'
  '<h2>Audit the gap deliberately</h2>'
  '<p>Run the paperwork audit and the readiness audit as two separate exercises. Organisations that combine them tend to let the easier one stand in for the harder one.</p>',
  'Compliance & Governance',
  ARRAY['seed', 'compliance', 'fire-safety'],
  3,
  'Secure Place to Work', 'Editorial team',
  false, 'published', now() - interval '27 days'
),
(
  'seed-draft-designing-a-safety-volunteer-programme',
  'Designing a safety volunteer programme that holds up',
  'Draft. Volunteer coverage per floor, refresher cadence, and what to do about attrition.',
  '<p>Draft in progress.</p>',
  'Training & Awareness',
  ARRAY['seed', 'volunteers'],
  6,
  'Secure Place to Work', 'Editorial team',
  false, 'draft', NULL
)
ON CONFLICT (slug) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 2. PODCAST EPISODES  (draft -- no real audio yet)
-- -----------------------------------------------------------------------------

INSERT INTO marketing.podcast_episodes
  (slug, title, description, show_notes, season, episode_number,
   duration_seconds, guests, status, published_at)
VALUES
(
  'seed-s1e1-the-first-ninety-seconds',
  'The first ninety seconds',
  'What happens between an incident starting and the first trained responder arriving, and why that window decides the outcome.',
  '<p>Placeholder show notes. Replace with the real episode outline before publishing.</p>',
  1, 1, 1980,
  ARRAY['Guest name TBC'],
  'draft', NULL
),
(
  'seed-s1e2-what-hr-hears-last',
  'What HR hears last',
  'Why the most serious workplace issues are usually the slowest to surface, and what changes when reporting is genuinely anonymous.',
  '<p>Placeholder show notes. Replace with the real episode outline before publishing.</p>',
  1, 2, 2340,
  ARRAY['Guest name TBC'],
  'draft', NULL
)
ON CONFLICT (slug) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 3. WORKSHOPS
--    Derived from the product's existing feature copy and the safety class
--    names already present in this project. Confirm the real catalogue with the
--    training team before launch.
-- -----------------------------------------------------------------------------

INSERT INTO marketing.workshops
  (slug, title, summary, description, format, duration_minutes, audience,
   outcomes, modules, min_participants, max_participants,
   is_featured, display_order, status, published_at)
VALUES
(
  'seed-emergency-response-and-evacuation',
  'Emergency Response & Evacuation Readiness',
  'Run an evacuation that clears the building in a measured time, with wardens who know their floor and a report that produces action items.',
  '<p>A practical session for the people who will actually run an evacuation: floor wardens, security staff and the disaster response team. Ends with a timed walkthrough of your own building.</p>',
  'onsite', 180, 'Floor wardens, security staff, disaster response team',
  ARRAY[
    'Evacuate your floor within a measured, recorded time',
    'Run a roll call at the assembly point that accounts for visitors and contractors',
    'Write a drill report that produces owned, dated action items'
  ],
  '[
    {"title": "Alarm to first movement", "minutes": 30, "points": ["Recognising the alarm", "Warden call-out", "Assisting mobility needs"]},
    {"title": "Route and assembly discipline", "minutes": 45, "points": ["Primary and secondary routes", "Assembly point roll call", "Visitors and contractors"]},
    {"title": "Timed walkthrough", "minutes": 60, "points": ["Live drill on site", "Timing and observation", "Debrief"]},
    {"title": "Reporting", "minutes": 45, "points": ["What to record", "Turning findings into actions"]}
  ]'::jsonb,
  10, 40, true, 1, 'published', now() - interval '40 days'
),
(
  'seed-bls-and-workplace-first-aid',
  'Basic Life Support & Workplace First Aid',
  'BLS and CPR, first-aid response for common workplace injuries, and scenario-based practice with certified instructors.',
  '<p>Hands-on medical response training covering the injuries that actually occur in offices and on plant floors. Scenario-based throughout; delivered by certified instructors.</p>',
  'onsite', 240, 'All staff; recommended for designated first responders',
  ARRAY[
    'Perform CPR and use an AED with confidence',
    'Manage bleeding, burns, fractures and choking',
    'Decide quickly when to escalate to emergency services'
  ],
  '[
    {"title": "Basic life support", "minutes": 90, "points": ["Assessment and response", "CPR technique", "AED use"]},
    {"title": "Common workplace injuries", "minutes": 75, "points": ["Bleeding and burns", "Fractures and sprains", "Choking"]},
    {"title": "Scenario practice", "minutes": 75, "points": ["Simulated incidents", "Escalation decisions", "Handover to paramedics"]}
  ]'::jsonb,
  8, 25, true, 2, 'published', now() - interval '40 days'
),
(
  'seed-fire-safety-fundamentals',
  'Fire Safety Fundamentals',
  'Extinguisher selection and use, containment, and the decision to fight or evacuate.',
  '<p>Classroom and practical session covering fire classes, extinguisher selection, safe use, and the judgement call every employee should be able to make: fight it or leave.</p>',
  'onsite', 150, 'All staff',
  ARRAY[
    'Identify fire classes and select the correct extinguisher',
    'Use an extinguisher safely under supervision',
    'Make the fight-or-evacuate call correctly'
  ],
  '[
    {"title": "Fire behaviour and classes", "minutes": 45, "points": ["How fires spread", "Classes A to K", "Matching the agent"]},
    {"title": "Extinguisher practical", "minutes": 60, "points": ["PASS technique", "Supervised live use", "Limitations"]},
    {"title": "Containment and escalation", "minutes": 45, "points": ["Doors and compartmentation", "When to stop", "Raising the alarm"]}
  ]'::jsonb,
  10, 30, false, 3, 'published', now() - interval '40 days'
),
(
  'seed-posh-awareness-employees-managers-icc',
  'POSH Awareness for Employees, Managers & ICC Members',
  'Certified trainer-led sessions on preventing workplace harassment, with separate tracks for staff, managers and Internal Complaints Committee members.',
  '<p>Three audiences with genuinely different obligations, so the session splits after a shared opening. Includes case studies and an assessment.</p>',
  'hybrid', 180, 'Employees, people managers, and ICC members',
  ARRAY[
    'Recognise and correctly categorise prohibited conduct',
    'Understand the reporting route and the confidentiality that protects it',
    'ICC members: run an inquiry that stands up to scrutiny'
  ],
  '[
    {"title": "Shared foundation", "minutes": 60, "points": ["What the law covers", "Prohibited conduct", "Bystander responsibility"]},
    {"title": "Manager track", "minutes": 60, "points": ["Receiving a disclosure", "Non-retaliation duties", "Escalation"]},
    {"title": "ICC track", "minutes": 60, "points": ["Inquiry procedure", "Evidence and records", "Reporting obligations"]}
  ]'::jsonb,
  12, 60, true, 4, 'published', now() - interval '40 days'
),
(
  'seed-safety-volunteer-certification',
  'Safety Volunteer & Floor Warden Certification',
  'Certifies the volunteers assigned per location in the platform, so SOS alerts reach someone trained to act on them.',
  '<p>For the volunteers and guards assigned to each location. Covers alert triage, on-floor coordination, and the handover to professional responders.</p>',
  'onsite', 210, 'Designated safety volunteers and security personnel',
  ARRAY[
    'Triage an incoming SOS alert and respond appropriately',
    'Coordinate a floor during an active incident',
    'Hand over cleanly to fire, medical or police services'
  ],
  '[
    {"title": "The volunteer role", "minutes": 45, "points": ["Scope and limits", "Coverage per floor", "Working with security"]},
    {"title": "Alert triage", "minutes": 60, "points": ["Reading an SOS", "Location and health data", "First actions"]},
    {"title": "On-floor coordination", "minutes": 60, "points": ["Directing movement", "Assisting mobility needs", "Communication discipline"]},
    {"title": "Handover", "minutes": 45, "points": ["What responders need", "Records", "Post-incident debrief"]}
  ]'::jsonb,
  6, 20, false, 5, 'published', now() - interval '40 days'
)
ON CONFLICT (slug) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 4. WORKSHOP SESSIONS
--    Relative dates so the "upcoming" list never goes stale in development.
-- -----------------------------------------------------------------------------

INSERT INTO marketing.workshop_sessions
  (workshop_id, starts_at, ends_at, timezone, location, trainer, seats_total, seats_taken)
SELECT w.id, s.starts_at, s.ends_at, 'Asia/Kolkata', s.location, s.trainer, s.seats_total, s.seats_taken
FROM (VALUES
  ('seed-emergency-response-and-evacuation',
   now() + interval '12 days', now() + interval '12 days 3 hours',
   'Client site, Pune', 'Training team', 40::smallint, 22::smallint),
  ('seed-bls-and-workplace-first-aid',
   now() + interval '19 days', now() + interval '19 days 4 hours',
   'Client site, Mumbai', 'Certified medical instructor', 25::smallint, 25::smallint),
  ('seed-posh-awareness-employees-managers-icc',
   now() + interval '26 days', now() + interval '26 days 3 hours',
   'Online + client site', 'Certified POSH trainer', 60::smallint, 31::smallint),
  ('seed-fire-safety-fundamentals',
   now() + interval '33 days', now() + interval '33 days 2 hours 30 minutes',
   'Client site, Pune', 'Training team', 30::smallint, 7::smallint),
  ('seed-emergency-response-and-evacuation',
   now() - interval '20 days', now() - interval '20 days' + interval '3 hours',
   'Client site, Bengaluru', 'Training team', 40::smallint, 38::smallint)
) AS s(slug, starts_at, ends_at, location, trainer, seats_total, seats_taken)
JOIN marketing.workshops w ON w.slug = s.slug
-- Relative dates differ on every run, so a unique constraint cannot make this
-- idempotent. Skip any workshop that already has sessions instead. The subquery
-- sees the table as of statement start, so a workshop with two seeded runs
-- still gets both on the first pass.
WHERE NOT EXISTS (
  SELECT 1 FROM marketing.workshop_sessions ws WHERE ws.workshop_id = w.id
);


-- -----------------------------------------------------------------------------
-- 5. (REMOVED) GATED RESOURCES
--
--    This inserted two rows into marketing.resources, which
--    marketing-gallery-migration.sql drops -- so running the migrations in
--    order and then seeding failed with "relation marketing.resources does not
--    exist". The guides were removed from the website and replaced by the photo
--    gallery; albums are created through the portal rather than seeded, because
--    there are no real photographs to seed with.
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- 6. LEADS AND ASSESSMENTS
--    Gives the portal's Leads and Secure Score screens something to render.
--    Fictional contacts on example.com -- never real people.
-- -----------------------------------------------------------------------------

-- No unique constraint on leads.email -- the same person may legitimately
-- enquire twice in production -- so idempotency comes from a NOT EXISTS guard
-- rather than ON CONFLICT.
INSERT INTO marketing.leads
  (name, email, company, phone, job_title, message, source, source_ref, status, created_at)
SELECT s.*
FROM (VALUES
  ('Seed Contact A', 'seed.a@example.com', 'Northline Manufacturing', '+91 90000 00001',
   'Head of EHS', 'Interested in certification for three plant locations.',
   'certification'::marketing.lead_source, NULL, 'new'::marketing.lead_status,
   now() - interval '2 days'),
  ('Seed Contact B', 'seed.b@example.com', 'Meridian Health Group', '+91 90000 00002',
   'HR Director', 'Would like a demo of the SOS alerting and drill reporting.',
   'demo'::marketing.lead_source, NULL, 'contacted'::marketing.lead_status,
   now() - interval '9 days'),
  ('Seed Contact C', 'seed.c@example.com', 'Anvil Logistics', '+91 90000 00003',
   'Compliance Manager', NULL,
   'guide_download'::marketing.lead_source, 'seed-workplace-safety-audit-checklist',
   'new'::marketing.lead_status, now() - interval '4 days'),
  ('Seed Contact D', 'seed.d@example.com', 'Cobalt Retail', '+91 90000 00004',
   'Operations Lead', NULL,
   'secure_score'::marketing.lead_source, NULL, 'qualified'::marketing.lead_status,
   now() - interval '15 days')
) AS s(name, email, company, phone, job_title, message, source, source_ref, status, created_at)
WHERE NOT EXISTS (
  SELECT 1 FROM marketing.leads l WHERE l.email = s.email
);

-- Assessments. total_score and band must agree -- the table's CHECK constraint
-- enforces the same 85 / 70 / 50 thresholds the certification page uses.
INSERT INTO marketing.assessments
  (lead_id, company, industry, employee_band, site_count,
   answers, pillar_scores, total_score, band, engine_version, created_at)
SELECT
  l.id, s.company, s.industry, s.employee_band, s.site_count,
  s.answers::jsonb, s.pillar_scores::jsonb, s.total_score, s.band::marketing.score_band,
  'v1', s.created_at
FROM (VALUES
  ('seed.d@example.com', 'Cobalt Retail', 'Retail', '201-1000', 12::smallint,
   '{"emg_sos": 4, "emg_assembly": 3, "rep_anon": 2, "rep_sla": 2, "trn_coverage": 3, "drl_frequency": 2, "cmp_noc": 4}',
   '{"emergency": 70, "reporting": 40, "training": 60, "drills": 40, "compliance": 80}',
   58::smallint, 'developing', now() - interval '15 days'),
  (NULL, 'Northline Manufacturing', 'Manufacturing', '1000+', 3::smallint,
   '{"emg_sos": 5, "emg_assembly": 5, "rep_anon": 4, "rep_sla": 4, "trn_coverage": 4, "drl_frequency": 4, "cmp_noc": 5}',
   '{"emergency": 100, "reporting": 80, "training": 80, "drills": 80, "compliance": 100}',
   88::smallint, 'certification_ready', now() - interval '6 days'),
  (NULL, 'Anvil Logistics', 'Logistics', '51-200', 5::smallint,
   '{"emg_sos": 2, "emg_assembly": 2, "rep_anon": 1, "rep_sla": 1, "trn_coverage": 2, "drl_frequency": 1, "cmp_noc": 3}',
   '{"emergency": 40, "reporting": 20, "training": 40, "drills": 20, "compliance": 60}',
   35::smallint, 'at_risk', now() - interval '21 days'),
  (NULL, 'Meridian Health Group', 'Healthcare', '201-1000', 8::smallint,
   '{"emg_sos": 4, "emg_assembly": 4, "rep_anon": 3, "rep_sla": 4, "trn_coverage": 4, "drl_frequency": 3, "cmp_noc": 4}',
   '{"emergency": 80, "reporting": 70, "training": 80, "drills": 60, "compliance": 80}',
   75::smallint, 'certifiable', now() - interval '11 days')
) AS s(lead_email, company, industry, employee_band, site_count,
       answers, pillar_scores, total_score, band, created_at)
LEFT JOIN marketing.leads l ON l.email = s.lead_email
WHERE NOT EXISTS (
  SELECT 1 FROM marketing.assessments a WHERE a.company = s.company
);


-- -----------------------------------------------------------------------------
-- 7. TEARDOWN  -- run this before go-live
-- -----------------------------------------------------------------------------

-- DELETE FROM marketing.assessments WHERE company IN
--   ('Cobalt Retail','Northline Manufacturing','Anvil Logistics','Meridian Health Group');
-- DELETE FROM marketing.leads     WHERE email LIKE 'seed.%@example.com';
-- DELETE FROM marketing.workshops WHERE slug LIKE 'seed-%';  -- cascades to sessions
-- DELETE FROM marketing.podcast_episodes WHERE slug LIKE 'seed-%';
-- DELETE FROM marketing.posts     WHERE slug LIKE 'seed-%';
