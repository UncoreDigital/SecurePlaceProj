ALTER TABLE scheduled_classes
  ADD COLUMN start_time timestamptz,
  ADD COLUMN end_time timestamptz;

-- Optionally remove the old time_slot column
ALTER TABLE scheduled_classes
  DROP COLUMN IF EXISTS time_slot;


  -- Allow firm_admin and super_admin to insert scheduled classes
CREATE POLICY "Admins can insert scheduled classes"
  ON public.scheduled_classes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.role = 'super_admin' OR profiles.role = 'firm_admin')
    )
  );


--  update your enum in the database to include "pending"
ALTER TYPE class_status ADD VALUE 'pending';
ALTER TYPE class_status ADD VALUE 'approved';

-- Enable read access for all users for scheduled_classes
create policy "Enable read access for all users"
on "public"."scheduled_classes"
for select using (true);