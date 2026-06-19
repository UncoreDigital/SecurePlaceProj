-- Snapshot each response's questions/options/selection at submission time.
-- This makes a response a permanent, self-contained record that is immune to
-- later edits of the form (editing a form deletes & recreates its questions
-- with new IDs, which previously orphaned/cascade-deleted historical answers
-- and broke the "Your answer" display in the response detail view).

ALTER TABLE form_responses
  ADD COLUMN IF NOT EXISTS questions_snapshot JSONB;

-- Backfill is intentionally NOT possible for responses whose answer rows were
-- already destroyed by a prior edit. New submissions (and any submitted against
-- the current form version) will populate this column going forward.
