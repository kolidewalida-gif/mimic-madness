-- Re-apply quests, streaks, chat color and social feed schema (was never applied)

-- Quest progress table
CREATE TABLE IF NOT EXISTS public.quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quest_id TEXT NOT NULL,
  quest_kind TEXT NOT NULL CHECK (quest_kind IN ('daily', 'weekly')),
  progress INTEGER NOT NULL DEFAULT 0,
  target INTEGER NOT NULL DEFAULT 1,
  is_claimed BOOLEAN NOT NULL DEFAULT false,
  period_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, quest_id, period_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quest_progress TO authenticated;
GRANT ALL ON public.quest_progress TO service_role;
CREATE INDEX IF NOT EXISTS idx_quest_progress_user_period ON public.quest_progress (user_id, period_key);
ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'quest_progress_own' AND tablename = 'quest_progress') THEN
    CREATE POLICY quest_progress_own ON public.quest_progress FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $pol$;
DO $pub$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.quest_progress;
EXCEPTION WHEN duplicate_object THEN NULL; END $pub$;

-- Player_stats new columns
ALTER TABLE public.player_stats
  ADD COLUMN IF NOT EXISTS last_login_date DATE,
  ADD COLUMN IF NOT EXISTS login_streak_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_login_streak_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chat_color TEXT,
  ADD COLUMN IF NOT EXISTS equipped_voice_filter TEXT;

-- Social posts
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id TEXT NOT NULL,
  challenge_clip_id TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  owner_name TEXT NOT NULL,
  caption TEXT,
  week_key TEXT NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.social_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_posts TO authenticated;
GRANT ALL ON public.social_posts TO service_role;
CREATE INDEX IF NOT EXISTS idx_social_posts_week ON public.social_posts (week_key, likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_owner ON public.social_posts (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_recent ON public.social_posts (created_at DESC) WHERE is_hidden = false;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_posts_read' AND tablename = 'social_posts') THEN
    CREATE POLICY social_posts_read ON public.social_posts FOR SELECT USING (is_hidden = false);
  END IF;
END $pol$;
DO $pol$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_posts_owner_write' AND tablename = 'social_posts') THEN
    CREATE POLICY social_posts_owner_write ON public.social_posts FOR ALL TO authenticated
      USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
  END IF;
END $pol$;
DO $pub$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts;
EXCEPTION WHEN duplicate_object THEN NULL; END $pub$;

-- Social post likes
CREATE TABLE IF NOT EXISTS public.social_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.social_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
GRANT SELECT ON public.social_post_likes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_post_likes TO authenticated;
GRANT ALL ON public.social_post_likes TO service_role;
CREATE INDEX IF NOT EXISTS idx_social_likes_post ON public.social_post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_social_likes_user ON public.social_post_likes (user_id);
ALTER TABLE public.social_post_likes ENABLE ROW LEVEL SECURITY;
DO $pol$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_likes_read' AND tablename = 'social_post_likes') THEN
    CREATE POLICY social_likes_read ON public.social_post_likes FOR SELECT USING (true);
  END IF;
END $pol$;
DO $pol$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_likes_own_write' AND tablename = 'social_post_likes') THEN
    CREATE POLICY social_likes_own_write ON public.social_post_likes FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $pol$;
DO $pub$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.social_post_likes;
EXCEPTION WHEN duplicate_object THEN NULL; END $pub$;

-- Trigger for likes_count
CREATE OR REPLACE FUNCTION public.bump_social_post_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.social_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.social_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$fn$;
DROP TRIGGER IF EXISTS social_post_likes_count ON public.social_post_likes;
CREATE TRIGGER social_post_likes_count AFTER INSERT OR DELETE ON public.social_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.bump_social_post_likes_count();

-- bump_quest_progress RPC
CREATE OR REPLACE FUNCTION public.bump_quest_progress(
  p_quest_id TEXT, p_quest_kind TEXT, p_target INTEGER, p_period_key TEXT, p_increment INTEGER DEFAULT 1
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_user UUID := auth.uid(); v_current INTEGER; v_claimed BOOLEAN; v_next INTEGER;
BEGIN
  IF v_user IS NULL THEN RETURN 0; END IF;
  IF p_quest_kind NOT IN ('daily','weekly') THEN RETURN 0; END IF;
  IF p_target < 1 OR p_target > 1000 THEN RETURN 0; END IF;
  IF p_increment < 1 OR p_increment > 100 THEN RETURN 0; END IF;
  IF char_length(p_quest_id) = 0 OR char_length(p_quest_id) > 80 THEN RETURN 0; END IF;
  IF char_length(p_period_key) = 0 OR char_length(p_period_key) > 16 THEN RETURN 0; END IF;
  IF NOT (p_period_key ~ '^\d{4}-\d{2}-\d{2}$' OR p_period_key ~ '^\d{4}-W\d{2}$') THEN RETURN 0; END IF;

  SELECT progress, is_claimed INTO v_current, v_claimed
    FROM public.quest_progress
    WHERE user_id = v_user AND quest_id = p_quest_id AND period_key = p_period_key;

  IF v_claimed THEN RETURN COALESCE(v_current, 0); END IF;
  v_next := LEAST(p_target, COALESCE(v_current, 0) + p_increment);

  INSERT INTO public.quest_progress (user_id, quest_id, quest_kind, progress, target, is_claimed, period_key, updated_at)
  VALUES (v_user, p_quest_id, p_quest_kind, v_next, p_target, false, p_period_key, now())
  ON CONFLICT (user_id, quest_id, period_key) DO UPDATE
    SET progress = LEAST(EXCLUDED.target, EXCLUDED.progress),
        target = EXCLUDED.target,
        updated_at = now()
    WHERE quest_progress.is_claimed = false;

  RETURN v_next;
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.bump_quest_progress(TEXT,TEXT,INTEGER,TEXT,INTEGER) TO authenticated;

-- claim_quest_reward RPC
CREATE OR REPLACE FUNCTION public.claim_quest_reward(
  p_quest_id TEXT, p_period_key TEXT, p_xp_reward INTEGER
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_user UUID := auth.uid(); v_row public.quest_progress;
BEGIN
  IF v_user IS NULL THEN RETURN 0; END IF;
  IF p_xp_reward < 0 OR p_xp_reward > 5000 THEN RETURN 0; END IF;
  SELECT * INTO v_row FROM public.quest_progress
    WHERE user_id = v_user AND quest_id = p_quest_id AND period_key = p_period_key;
  IF v_row IS NULL THEN RETURN 0; END IF;
  IF v_row.is_claimed THEN RETURN 0; END IF;
  IF v_row.progress < v_row.target THEN RETURN 0; END IF;
  UPDATE public.quest_progress SET is_claimed = true, updated_at = now() WHERE id = v_row.id;
  UPDATE public.player_stats
    SET total_xp = COALESCE(total_xp, 0) + p_xp_reward,
        current_xp = COALESCE(current_xp, 0) + p_xp_reward
    WHERE user_id = v_user;
  RETURN p_xp_reward;
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.claim_quest_reward(TEXT,TEXT,INTEGER) TO authenticated;

-- publish_social_post RPC
CREATE OR REPLACE FUNCTION public.publish_social_post(
  p_clip_id TEXT, p_challenge_clip_id TEXT, p_caption TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_user UUID := auth.uid(); v_clip_owner TEXT; v_today_count INTEGER;
        v_owner_name TEXT; v_post_id UUID; v_week_key TEXT; v_caption TEXT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF p_clip_id IS NULL OR char_length(p_clip_id) = 0 THEN RAISE EXCEPTION 'invalid clip'; END IF;
  v_caption := COALESCE(NULLIF(btrim(p_caption), ''), NULL);
  IF v_caption IS NOT NULL AND char_length(v_caption) > 200 THEN
    v_caption := substring(v_caption FROM 1 FOR 200);
  END IF;
  SELECT player_id INTO v_clip_owner FROM public.video_clips WHERE id = p_clip_id;
  IF v_clip_owner IS NULL THEN RAISE EXCEPTION 'clip not found'; END IF;
  SELECT count(*) INTO v_today_count FROM public.social_posts
    WHERE owner_id = v_user AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');
  IF v_today_count >= 3 THEN RAISE EXCEPTION 'daily post quota reached'; END IF;
  SELECT COALESCE(display_name, 'Joueur') INTO v_owner_name FROM public.profiles WHERE user_id = v_user;
  IF v_owner_name IS NULL THEN v_owner_name := 'Joueur'; END IF;
  v_week_key := to_char(now() AT TIME ZONE 'UTC', 'IYYY"-W"IW');
  INSERT INTO public.social_posts (clip_id, challenge_clip_id, owner_id, owner_name, caption, week_key)
    VALUES (p_clip_id, p_challenge_clip_id, v_user, v_owner_name, v_caption, v_week_key)
    RETURNING id INTO v_post_id;
  RETURN v_post_id;
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.publish_social_post(TEXT,TEXT,TEXT) TO authenticated;

-- toggle_social_like RPC
CREATE OR REPLACE FUNCTION public.toggle_social_like(p_post_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_user UUID := auth.uid(); v_liked BOOLEAN; v_post_exists BOOLEAN;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.social_posts WHERE id = p_post_id AND is_hidden = false) INTO v_post_exists;
  IF NOT v_post_exists THEN RETURN false; END IF;
  SELECT EXISTS (SELECT 1 FROM public.social_post_likes WHERE post_id = p_post_id AND user_id = v_user) INTO v_liked;
  IF v_liked THEN
    DELETE FROM public.social_post_likes WHERE post_id = p_post_id AND user_id = v_user;
    RETURN false;
  ELSE
    INSERT INTO public.social_post_likes (post_id, user_id) VALUES (p_post_id, v_user) ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;
END;
$fn$;
GRANT EXECUTE ON FUNCTION public.toggle_social_like(UUID) TO authenticated;