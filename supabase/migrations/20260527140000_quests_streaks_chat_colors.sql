-- ============================================================
-- Quests, Streaks, Chat colors, Voice filters
-- ============================================================
-- Adds:
--   1. quest_progress: per-user, per-quest, per-day/week tracking
--   2. last_login_date / login_streak_days on player_stats
--   3. chat_color: per-user pseudo color override
--   4. equipped_voice_filter: per-user audio FX preset
-- ============================================================

-- 1. Quest progress -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quest_id TEXT NOT NULL,
  -- 'daily' or 'weekly'
  quest_kind TEXT NOT NULL CHECK (quest_kind IN ('daily', 'weekly')),
  -- progress counter (e.g. 0..target)
  progress INTEGER NOT NULL DEFAULT 0,
  target INTEGER NOT NULL DEFAULT 1,
  is_claimed BOOLEAN NOT NULL DEFAULT false,
  -- ISO date for the daily reset (yyyy-mm-dd) or ISO week (yyyy-W##)
  period_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, quest_id, period_key)
);

CREATE INDEX IF NOT EXISTS idx_quest_progress_user_period
  ON public.quest_progress (user_id, period_key);

ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'quest_progress_own' AND tablename = 'quest_progress') THEN
    CREATE POLICY quest_progress_own ON public.quest_progress
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.quest_progress;

-- 2. Streaks + login tracking on player_stats ---------------------------
ALTER TABLE public.player_stats
  ADD COLUMN IF NOT EXISTS last_login_date DATE,
  ADD COLUMN IF NOT EXISTS login_streak_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_login_streak_days INTEGER NOT NULL DEFAULT 0,
  -- Cosmetic preferences
  ADD COLUMN IF NOT EXISTS chat_color TEXT,
  ADD COLUMN IF NOT EXISTS equipped_voice_filter TEXT;

-- 3. Helper: claim a quest reward (idempotent) --------------------------
CREATE OR REPLACE FUNCTION public.claim_quest_reward(
  p_quest_id TEXT,
  p_period_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_row public.quest_progress;
BEGIN
  IF v_user IS NULL THEN RETURN false; END IF;

  SELECT * INTO v_row
    FROM public.quest_progress
    WHERE user_id = v_user
      AND quest_id = p_quest_id
      AND period_key = p_period_key;

  IF v_row IS NULL THEN RETURN false; END IF;
  IF v_row.is_claimed THEN RETURN false; END IF;
  IF v_row.progress < v_row.target THEN RETURN false; END IF;

  UPDATE public.quest_progress
    SET is_claimed = true, updated_at = now()
    WHERE id = v_row.id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_quest_reward(TEXT, TEXT) TO authenticated;
