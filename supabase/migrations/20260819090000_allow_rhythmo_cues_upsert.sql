-- Rhythmo cues are JSON siblings of videos in the existing bucket.
-- Preserve every existing MIME type and, intentionally, do not touch the
-- 400 MiB file_size_limit.
UPDATE storage.buckets
SET allowed_mime_types = CASE
  WHEN allowed_mime_types IS NULL THEN NULL
  WHEN 'application/json' = ANY(allowed_mime_types) THEN allowed_mime_types
  ELSE array_append(allowed_mime_types, 'application/json')
END
WHERE id = 'video-challenges';

-- Storage upsert performs UPDATE when a deterministic cues path already
-- exists. INSERT alone therefore makes retries fail despite `upsert: true`.
CREATE POLICY "Players can update video challenge files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'video-challenges')
WITH CHECK (bucket_id = 'video-challenges');
