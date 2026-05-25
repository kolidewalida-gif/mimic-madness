-- Row Level Security policies for game tables.
-- These ensure players can only interact with their own game data.

-- Quiz answers: players can only insert their own answers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'quiz_answers_insert_own' AND tablename = 'quiz_answers') THEN
    CREATE POLICY quiz_answers_insert_own ON public.quiz_answers
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid()::text = player_id);
  END IF;
END $$;

-- Quiz answers: everyone in the lobby can read answers (for scoreboard)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'quiz_answers_select_lobby' AND tablename = 'quiz_answers') THEN
    CREATE POLICY quiz_answers_select_lobby ON public.quiz_answers
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- Pixoguess guesses: players can only insert their own guesses
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pixoguess_guesses_insert_own' AND tablename = 'pixoguess_guesses') THEN
    CREATE POLICY pixoguess_guesses_insert_own ON public.pixoguess_guesses
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid()::text = player_id);
  END IF;
END $$;

-- Pixoguess guesses: everyone can read (for live scoreboard)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pixoguess_guesses_select_all' AND tablename = 'pixoguess_guesses') THEN
    CREATE POLICY pixoguess_guesses_select_all ON public.pixoguess_guesses
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- Undercover players: can only update own vote/clue
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'undercover_players_update_own' AND tablename = 'undercover_players') THEN
    CREATE POLICY undercover_players_update_own ON public.undercover_players
      FOR UPDATE TO authenticated
      USING (auth.uid()::text = player_id)
      WITH CHECK (auth.uid()::text = player_id);
  END IF;
END $$;

-- Undercover players: everyone can read (for game state)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'undercover_players_select_all' AND tablename = 'undercover_players') THEN
    CREATE POLICY undercover_players_select_all ON public.undercover_players
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- Player rewards: users can only see/modify their own rewards
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'player_rewards_own' AND tablename = 'player_rewards') THEN
    CREATE POLICY player_rewards_own ON public.player_rewards
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Player stats: users can only see/modify their own stats
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'player_stats_own' AND tablename = 'player_stats') THEN
    CREATE POLICY player_stats_own ON public.player_stats
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Enable RLS on tables that might not have it yet (idempotent)
ALTER TABLE IF EXISTS public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pixoguess_guesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.undercover_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_stats ENABLE ROW LEVEL SECURITY;
