INSERT INTO storage.buckets (id, name, public) 
VALUES ('adaptive-music', 'adaptive-music', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Adaptive music is publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'adaptive-music');

CREATE POLICY "Service role can manage adaptive music"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'adaptive-music')
WITH CHECK (bucket_id = 'adaptive-music');