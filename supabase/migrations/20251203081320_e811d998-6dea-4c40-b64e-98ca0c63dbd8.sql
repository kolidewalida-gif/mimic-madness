-- Update the video-challenges bucket to allow audio files
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg']
WHERE id = 'video-challenges';