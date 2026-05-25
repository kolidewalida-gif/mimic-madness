-- Auto-cleanup: delete game data older than 7 days.
-- This prevents the DB from growing indefinitely with stale game rounds.
-- Run via pg_cron or manually.

-- Function to clean up old game data
CREATE OR REPLACE FUNCTION public.cleanup_old_game_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete quiz data older than 7 days
  DELETE FROM public.quiz_answers
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  DELETE FROM public.quiz_rounds
  WHERE created_at < NOW() - INTERVAL '7 days';

  -- Delete pixoguess data older than 7 days
  DELETE FROM public.pixoguess_guesses
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  DELETE FROM public.pixoguess_rounds
  WHERE created_at < NOW() - INTERVAL '7 days';

  -- Delete undercover data older than 7 days
  DELETE FROM public.undercover_players
  WHERE id IN (
    SELECT up.id FROM public.undercover_players up
    JOIN public.undercover_games ug ON up.game_id = ug.id
    WHERE ug.created_at < NOW() - INTERVAL '7 days'
  );
  
  DELETE FROM public.undercover_games
  WHERE created_at < NOW() - INTERVAL '7 days';

  -- Delete audio phone data older than 7 days
  DELETE FROM public.audio_phone_imitations
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  DELETE FROM public.audio_phone_recordings
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  DELETE FROM public.audio_phone_rounds
  WHERE created_at < NOW() - INTERVAL '7 days';

  -- Delete ended lobbies older than 3 days
  DELETE FROM public.lobby_players
  WHERE lobby_id IN (
    SELECT id FROM public.lobbies
    WHERE phase = 'ended' AND updated_at < NOW() - INTERVAL '3 days'
  );
  
  DELETE FROM public.lobbies
  WHERE phase = 'ended' AND updated_at < NOW() - INTERVAL '3 days';

  RAISE NOTICE 'Cleanup completed at %', NOW();
END;
$$;

-- Grant execute to service role (for cron jobs)
GRANT EXECUTE ON FUNCTION public.cleanup_old_game_data() TO service_role;
