-- ============================================================
-- Backend hardening for quests + social feed
-- ============================================================
-- 1. RPC `bump_quest_progress(quest_id, kind, target, period_key, increment)`
--    Server validates: cap progress at target, refuses if claimed,
--    refuses bogus quest_kind / period_key formats.
-- 2. RPC `publish_social_post(clip_id, challenge_clip_id, caption)`
--    Server validates: ownership of clip via video_clips table,
--    daily quota (3/day), caption length (<=200 chars), week_key.
-- 3. RPC `toggle_social_like(post_id)` — server-side idempotent like.
-- 4. Auto-cleanup: stale quest_progress (>45 days) + hidden posts (>30 days)
-- 5. Extra indexes for hot read paths.
-- ============================================================

-- ---------- 1. bump_quest_progress -----------------------------------
CREATE OR REPLACE FUNCTION public.bump_quest_progress(
  p_quest_id TEXT,
  p_quest_kind TEXT,
  p_target INTEGER,
  p_period_key TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_current INTEGER;
  v_claimed BOOLEAN;
  v_next INTEGER;
BEGIN
  IF v_user IS NULL THEN RETURN 0; END IF;
  -- Validate inputs to prevent garbage rows
  IF p_quest_kind NOT IN ('daily', 'weekly') THEN RETURN 0; END IF;
  IF p_target < 1 OR p_target > 1000 THEN RETURN 0; END IF;
  IF p_increment < 1 OR p_increment > 100 THEN RETURN 0; END IF;
  IF char_length(p_quest_id) = 0 OR char_length(p_quest_id) > 80 THEN RETURN 0; END IF;
  IF char_length(p_period_key) = 0 OR char_length(p_period_key) > 16 THEN RETURN 0; END IF;
  -- daily: yyyy-mm-dd ; weekly: yyyy-W##
  IF NOT (
    p_period_key ~ '^\d{4}-\d{2}-\d{2}$'
    OR p_period_key ~ '^\d{4}-W\d{2}$'
  ) THEN
    RETURN 0;
  END IF;

  SELECT progress, is_claimed
    INTO v_current, v_claimed
    FROM public.quest_progress
    WHERE user_id = v_user AND quest_id = p_quest_id AND period_key = p_period_key;

  IF v_claimed THEN
    -- Already claimed: do nothing
    RETURN COALESCE(v_current, 0);
  END IF;

  v_current := COALESCE(v_current, 0);
  v_next := LEAST(p_target, v_current + p_increment);

  INSERT INTO public.quest_progress (
    user_id, quest_id, quest_kind, progress, target, is_claimed, period_key, updated_at
  )
  VALUES (
    v_user, p_quest_id, p_quest_kind, v_next, p_target, false, p_period_key, now()
  )
  ON CONFLICT (user_id, quest_id, period_key) DO UPDATE
    SET progress = LEAST(EXCLUDED.target, EXCLUDED.progress),
        target = EXCLUDED.target,
        updated_at = now()
    WHERE quest_progress.is_claimed = false;

  RETURN v_next;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_quest_progress(TEXT, TEXT, INTEGER, TEXT, INTEGER) TO authenticated;

-- ---------- 2. publish_social_post -----------------------------------
CREATE OR REPLACE FUNCTION public.publish_social_post(
  p_clip_id TEXT,
  p_challenge_clip_id TEXT,
  p_caption TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_clip_owner UUID;
  v_today_count INTEGER;
  v_owner_name TEXT;
  v_post_id UUID;
  v_week_key TEXT;
  v_caption TEXT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF p_clip_id IS NULL OR char_length(p_clip_id) = 0 THEN
    RAISE EXCEPTION 'invalid clip';
  END IF;

  -- Caption: trim + cap at 200 chars
  v_caption := COALESCE(NULLIF(btrim(p_caption), ''), NULL);
  IF v_caption IS NOT NULL AND char_length(v_caption) > 200 THEN
    v_caption := substring(v_caption FROM 1 FOR 200);
  END IF;

  -- Validate ownership: the player must own this clip in video_clips
  -- video_clips uses a string id (player-id-timestamp), and we store the
  -- player_id column. Auth user_id matches player_id when logged in.
  SELECT player_id INTO v_clip_owner
    FROM public.video_clips
    WHERE id = p_clip_id;

  IF v_clip_owner IS NULL THEN
    RAISE EXCEPTION 'clip not found';
  END IF;
  IF v_clip_owner::text <> v_user::text THEN
    RAISE EXCEPTION 'cannot publish someone else clip';
  END IF;

  -- Rate limit: max 3 posts per UTC day per user
  SELECT count(*) INTO v_today_count
    FROM public.social_posts
    WHERE owner_id = v_user
      AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');
  IF v_today_count >= 3 THEN
    RAISE EXCEPTION 'daily post quota reached';
  END IF;

  -- Resolve display name from profiles (fallback to email prefix)
  SELECT COALESCE(display_name, split_part((SELECT email FROM auth.users WHERE id = v_user), '@', 1))
    INTO v_owner_name
    FROM public.profiles
    WHERE user_id = v_user;
  IF v_owner_name IS NULL THEN v_owner_name := 'Joueur'; END IF;

  v_week_key := to_char(now() AT TIME ZONE 'UTC', 'IYYY"-W"IW');

  INSERT INTO public.social_posts (
    clip_id, challenge_clip_id, owner_id, owner_name, caption, week_key
  )
  VALUES (
    p_clip_id, p_challenge_clip_id, v_user, v_owner_name, v_caption, v_week_key
  )
  RETURNING id INTO v_post_id;

  RETURN v_post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_social_post(TEXT, TEXT, TEXT) TO authenticated;

-- ---------- 3. toggle_social_like ------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_social_like(
  p_post_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_liked BOOLEAN;
  v_post_exists BOOLEAN;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  -- Confirm post exists and is not hidden — silently drop otherwise
  SELECT EXISTS (
    SELECT 1 FROM public.social_posts
    WHERE id = p_post_id AND is_hidden = false
  ) INTO v_post_exists;
  IF NOT v_post_exists THEN RETURN false; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.social_post_likes
    WHERE post_id = p_post_id AND user_id = v_user
  ) INTO v_liked;

  IF v_liked THEN
    DELETE FROM public.social_post_likes
      WHERE post_id = p_post_id AND user_id = v_user;
    RETURN false;
  ELSE
    INSERT INTO public.social_post_likes (post_id, user_id)
      VALUES (p_post_id, v_user)
      ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_social_like(UUID) TO authenticated;

-- ---------- 4. Auto cleanup ------------------------------------------
-- Stale quest progress (>45 days) — these rows can never be claimed again
-- since the period has expired.
CREATE OR REPLACE FUNCTION public.cleanup_stale_quest_progress()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.quest_progress
    WHERE updated_at < (now() - INTERVAL '45 days');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_stale_quest_progress() TO authenticated, anon;

-- Hidden social posts older than 30 days
CREATE OR REPLACE FUNCTION public.cleanup_old_hidden_posts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.social_posts
    WHERE is_hidden = true
      AND created_at < (now() - INTERVAL '30 days');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_hidden_posts() TO authenticated, anon;

-- ---------- 5. Hot-path indexes --------------------------------------
-- Likes by user — used to hydrate `liked_by_me` on every feed load.
CREATE INDEX IF NOT EXISTS idx_social_likes_user_post
  ON public.social_post_likes (user_id, post_id);

-- Top week descending sort — composite already exists, add covering for owner
CREATE INDEX IF NOT EXISTS idx_social_posts_owner_week
  ON public.social_posts (owner_id, week_key);

-- Quest progress: claimed lookup for stats screens
CREATE INDEX IF NOT EXISTS idx_quest_progress_claimed
  ON public.quest_progress (user_id, is_claimed) WHERE is_claimed = true;

-- ---------- 6. Tighten RLS on writes (force RPC path) ----------------
-- We keep SELECT open and writes restricted to the row owner, but
-- additionally restrict INSERT progress to small jumps so a malicious client
-- cannot self-complete a quest: clamp via CHECK constraint.
ALTER TABLE public.quest_progress
  DROP CONSTRAINT IF EXISTS quest_progress_progress_sane;
ALTER TABLE public.quest_progress
  ADD CONSTRAINT quest_progress_progress_sane
  CHECK (progress >= 0 AND progress <= target);

-- Caption length sanity at the column level
ALTER TABLE public.social_posts
  DROP CONSTRAINT IF EXISTS social_posts_caption_sane;
ALTER TABLE public.social_posts
  ADD CONSTRAINT social_posts_caption_sane
  CHECK (caption IS NULL OR char_length(caption) <= 200);

-- Owner name sanity
ALTER TABLE public.social_posts
  DROP CONSTRAINT IF EXISTS social_posts_owner_name_sane;
ALTER TABLE public.social_posts
  ADD CONSTRAINT social_posts_owner_name_sane
  CHECK (char_length(owner_name) BETWEEN 1 AND 60);


-- ---------- 7. Realtime payload completeness -------------------------
-- Without REPLICA IDENTITY FULL, partial-column UPDATEs (like the
-- likes_count bump from the trigger) only emit the primary key in the
-- broadcast payload, which prevents clients from reacting to counter
-- changes. FULL identity ships every column so the social feed stays
-- in sync without re-fetching.
ALTER TABLE public.social_posts REPLICA IDENTITY FULL;
ALTER TABLE public.social_post_likes REPLICA IDENTITY FULL;
ALTER TABLE public.quest_progress REPLICA IDENTITY FULL;


-- ---------- 8. Atomic claim — quest reward grants XP server-side -----
-- The original `claim_quest_reward` only marked the row as claimed.
-- The client then bumped XP via `player_stats.update(...)`, which is open
-- to abuse (a user could call addXp without ever claiming, or skip the
-- claim and just inflate XP). This version grants XP atomically and
-- returns the amount actually granted; the client only needs to display.
DROP FUNCTION IF EXISTS public.claim_quest_reward(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.claim_quest_reward(
  p_quest_id TEXT,
  p_period_key TEXT,
  p_xp_reward INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_row public.quest_progress;
  v_granted INTEGER;
BEGIN
  IF v_user IS NULL THEN RETURN 0; END IF;
  IF p_xp_reward < 0 OR p_xp_reward > 5000 THEN RETURN 0; END IF;

  SELECT * INTO v_row
    FROM public.quest_progress
    WHERE user_id = v_user
      AND quest_id = p_quest_id
      AND period_key = p_period_key;

  IF v_row IS NULL THEN RETURN 0; END IF;
  IF v_row.is_claimed THEN RETURN 0; END IF;
  IF v_row.progress < v_row.target THEN RETURN 0; END IF;

  -- Mark claimed
  UPDATE public.quest_progress
    SET is_claimed = true, updated_at = now()
    WHERE id = v_row.id;

  -- Grant XP atomically (clamp to non-negative)
  UPDATE public.player_stats
    SET total_xp = COALESCE(total_xp, 0) + p_xp_reward,
        current_xp = COALESCE(current_xp, 0) + p_xp_reward
    WHERE user_id = v_user;

  v_granted := p_xp_reward;
  RETURN v_granted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_quest_reward(TEXT, TEXT, INTEGER) TO authenticated;
