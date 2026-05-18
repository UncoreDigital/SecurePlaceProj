-- Add location_id (UUID FK) to certificates table
-- Run this in your Supabase SQL Editor
-- This replaces any previous VARCHAR location column with a proper FK to locations

-- Step 1: Drop old VARCHAR location column if it exists
ALTER TABLE certificates DROP COLUMN IF EXISTS location;

-- Step 2: Add location_id as UUID FK referencing locations table
ALTER TABLE certificates
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Step 3: Index for performance
CREATE INDEX IF NOT EXISTS idx_certificates_location_id ON certificates(location_id);

COMMENT ON COLUMN certificates.location_id IS 'FK to locations table — the location where the certificate was issued';


=================================================================
-- Change certificates.location column from VARCHAR to UUID FK referencing locations
-- Run this in your Supabase SQL Editor

-- Step 1: Drop the existing VARCHAR location column
ALTER TABLE certificates DROP COLUMN IF EXISTS location;

-- Step 2: Add location_id as UUID FK referencing locations table
ALTER TABLE certificates
ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Step 3: Add index for performance
CREATE INDEX IF NOT EXISTS idx_certificates_location_id ON certificates(location_id);

COMMENT ON COLUMN certificates.location_id IS 'FK to locations table — the location where the certificate was issued';
