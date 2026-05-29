-- Public storage bucket for images embedded into MCQ question text via the
-- rich-text editor in the form builder.
--
-- The bucket is public-read (so form takers can see images without auth) and
-- write-restricted to authenticated users (so only logged-in admins can upload).
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read uploaded images (public form page is unauthenticated)
DROP POLICY IF EXISTS "Public read question-images" ON storage.objects;
CREATE POLICY "Public read question-images" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'question-images');

-- Allow authenticated users (admins) to upload
DROP POLICY IF EXISTS "Authenticated upload question-images" ON storage.objects;
CREATE POLICY "Authenticated upload question-images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'question-images');

-- Allow authenticated users to overwrite / delete their own uploads
DROP POLICY IF EXISTS "Authenticated update question-images" ON storage.objects;
CREATE POLICY "Authenticated update question-images" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'question-images');

DROP POLICY IF EXISTS "Authenticated delete question-images" ON storage.objects;
CREATE POLICY "Authenticated delete question-images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'question-images');
