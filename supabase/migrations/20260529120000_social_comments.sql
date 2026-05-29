-- ============================================================
-- Social post comments
-- ============================================================
-- Per-post comments for the TikTok/Instagram-style feed.
-- A trigger keeps social_posts.comments_count in sync.
-- ============================================================

-- Add comments_count to social_posts (denormalized counter)
ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0;

-- 1. social_post_comments --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.social_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT social_comment_body_sane CHECK (char_length(body) BETWEEN 1 AND 300)
);

CREATE INDEX IF NOT EXISTS idx_social_comments_post
  ON public.social_post_comments (post_id, created_at DESC);

GRANT SELECT ON public.social_post_comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.social_post_comments TO authenticated;
GRANT ALL ON public.social_post_comments TO service_role;

ALTER TABLE public.social_post_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments on visible posts
DO $pol$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_comments_read' AND tablename = 'social_post_comments') THEN
    CREATE POLICY social_comments_read ON public.social_post_comments
      FOR SELECT USING (true);
  END IF;
END $pol$;

-- Authenticated users can insert their own comments
DO $pol$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_comments_insert' AND tablename = 'social_post_comments') THEN
    CREATE POLICY social_comments_insert ON public.social_post_comments
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $pol$;

-- Users can delete their own comments
DO $pol$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_comments_delete' AND tablename = 'social_post_comments') THEN
    CREATE POLICY social_comments_delete ON public.social_post_comments
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $pol$;

-- Keep comments_count in sync
CREATE OR REPLACE FUNCTION public.sync_social_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.social_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.social_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $fn$;

DROP TRIGGER IF EXISTS trg_sync_social_comments_count ON public.social_post_comments;
CREATE TRIGGER trg_sync_social_comments_count
  AFTER INSERT OR DELETE ON public.social_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_social_comments_count();

-- Realtime
DO $pub$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.social_post_comments;
EXCEPTION WHEN duplicate_object THEN NULL; END $pub$;

ALTER TABLE public.social_post_comments REPLICA IDENTITY FULL;
