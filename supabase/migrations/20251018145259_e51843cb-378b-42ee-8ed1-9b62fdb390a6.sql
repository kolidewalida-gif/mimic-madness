-- Create storage bucket for video challenges
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-challenges',
  'video-challenges',
  true,
  419430400,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
);

-- Allow players to upload their own videos
CREATE POLICY "Players can upload their own videos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'video-challenges');

-- Allow everyone to view videos
CREATE POLICY "Anyone can view videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'video-challenges');

-- Allow players to delete their own videos
CREATE POLICY "Players can delete their own videos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'video-challenges');

-- Add muted field to video clips metadata table
CREATE TABLE IF NOT EXISTS public.video_clips (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  name TEXT NOT NULL,
  start_time NUMERIC NOT NULL DEFAULT 0,
  end_time NUMERIC NOT NULL,
  duration NUMERIC NOT NULL,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  lobby_id UUID REFERENCES public.lobbies(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.video_clips ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_clips
CREATE POLICY "Anyone can view video clips"
ON public.video_clips
FOR SELECT
USING (true);

CREATE POLICY "Players can insert their own clips"
ON public.video_clips
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Players can update their own clips"
ON public.video_clips
FOR UPDATE
USING (true);

CREATE POLICY "Players can delete their own clips"
ON public.video_clips
FOR DELETE
USING (true);

-- Enable realtime for video_clips
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_clips;