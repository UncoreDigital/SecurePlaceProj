-- Enforce one submission per email per form (case-insensitive)
-- Prevents race-condition duplicate submissions not caught by the app-level check.

-- Existing employee_email values are normalized to lowercase to match new submissions.
UPDATE form_responses SET employee_email = LOWER(employee_email) WHERE employee_email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_form_responses_form_email
  ON form_responses (form_id, employee_email)
  WHERE employee_email IS NOT NULL;
