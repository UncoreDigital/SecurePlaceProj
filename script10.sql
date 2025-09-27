-- Remove columns
ALTER TABLE scheduled_classes
  DROP COLUMN IF EXISTS max_participants,
  DROP COLUMN IF EXISTS current_participants;

-- Add firm_id column
ALTER TABLE scheduled_classes
  ADD COLUMN firm_id uuid; -- or use 'text' if your firm IDs are text

-- (Optional) If you want to enforce a relationship:
-- ALTER TABLE scheduled_classes
--   ADD CONSTRAINT fk_firm FOREIGN KEY (firm_id) REFERENCES firms(id);