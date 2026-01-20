-- Fix lobbies.game_phase CHECK constraint to allow BlurRush (pixoguess)
ALTER TABLE public.lobbies
  DROP CONSTRAINT IF EXISTS lobbies_game_phase_check;

ALTER TABLE public.lobbies
  ADD CONSTRAINT lobbies_game_phase_check
  CHECK (
    (game_phase = ANY (
      ARRAY[
        'lobby'::text,
        'preparation'::text,
        'playing'::text,
        'quiz'::text,
        'audiophone'::text,
        'pixoguess'::text
      ]
    ))
  );
