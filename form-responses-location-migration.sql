-- Add location_id to form_responses so analytics/responses can be filtered
-- by location for location_admin users.
ALTER TABLE form_responses
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_form_responses_location_id ON form_responses(location_id);
