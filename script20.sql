-- //Add Image url to firms table
ALTER TABLE firms ADD COLUMN IF NOT EXISTS logo_url TEXT;
