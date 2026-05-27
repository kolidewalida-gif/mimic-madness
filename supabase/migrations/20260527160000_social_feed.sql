-- ============================================================
-- Social feed — public sharing of imitations
-- ============================================================
-- - social_posts: a clip the player decided to publish
-- - social_post_likes: per-user like (idempotent via UNIQUE)
-- A trigger keeps social_posts.likes_count in sync.
-- ============================================================

-- 1. social_posts ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The video/audio clip already stored in `video_clips`. We don't FK because
  -- video_clips is sometimes ephemeral; we resolve via storage URL on read.
  clip_id TEXT NOT NULL,
  -- Original challenge clip (the video being imitated)
  challenge_clip_id TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  owner_name TEXT NOT NULL,
  caption TEXT,
  -- yyyy-W## ISO week key — used to compute "top of the week"
  week_key TEXT NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_week
  ON public.social_posts (week_key, likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_owner
  ON public.social_posts (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_recent
  ON public.social_posts (created_at DESC) WHERE is_hidden = false;

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read non-hidden posts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_posts_read' AND tablename = 'social_posts') THEN
    CREATE POLICY social_posts_read ON public.social_posts
      FOR SELECT
      USING (is_hidden = false);
  END IF;
END $$;

-- Only the owner can insert/update/delete their own posts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_posts_owner_write' AND tablename = 'social_posts') THEN
    CREATE POLICY social_posts_owner_write ON public.social_posts
      FOR ALL TO authenticated
      USING (auth.uid() = owner_id)
      WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts;

-- 2. social_post_likes ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.social_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_social_likes_post ON public.social_post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_social_likes_user ON public.social_post_likes (user_id);

ALTER TABLE public.social_post_likes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_likes_read' AND tablename = 'social_post_likes') THEN
    CREATE POLICY social_likes_read ON public.social_post_likes
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_likes_own_write' AND tablename = 'social_post_likes') THEN
    CREATE POLICY social_likes_own_write ON public.social_post_likes
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.social_post_likes;

-- 3. Trigger to keep likes_count in sync ----------------------------------
CREATE OR REPLACE FUNCTION public.bump_social_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.social_posts
      SET likes_count = likes_count + 1
      WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.social_posts
      SET likes_count = GREATEST(0, likes_count - 1)
      WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS social_post_likes_count ON public.social_post_likes;
CREATE TRIGGER social_post_likes_count
  AFTER INSERT OR DELETE ON public.social_post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_social_post_likes_count();

-- 4. Helper to compute current ISO week key (for client convenience) ------
CREATE OR REPLACE FUNCTION public.current_iso_week_key()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT to_char(now() AT TIME ZONE 'UTC', 'IYYY"-W"IW');
$$;

GRANT EXECUTE ON FUNCTION public.current_iso_week_key() TO authenticated, anon;
