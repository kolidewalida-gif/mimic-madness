-- Drop restrictive RLS policies on video_clips that require JWT auth
DROP POLICY IF EXISTS "Players can insert their clips" ON public.video_clips;
DROP POLICY IF EXISTS "Players can update their clips" ON public.video_clips;
DROP POLICY IF EXISTS "Players can delete their clips" ON public.video_clips;

-- Create permissive RLS policies that work without JWT authentication
CREATE POLICY "Anyone can insert video clips"
  ON public.video_clips
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update video clips"
  ON public.video_clips
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete video clips"
  ON public.video_clips
  FOR DELETE
  USING (true);