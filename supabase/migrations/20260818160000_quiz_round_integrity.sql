-- Identifie une partie Quiz indépendamment des précédentes parties du même lobby.
-- Les anciennes lignes restent consultables mais sont inactives, afin qu'elles ne
-- puissent pas être reprises comme une nouvelle session après déploiement.
ALTER TABLE public.quiz_rounds
  ADD COLUMN IF NOT EXISTS session_id uuid,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS category_filter text NOT NULL DEFAULT 'mixed',
  ADD COLUMN IF NOT EXISTS enable_jokers boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_streak boolean NOT NULL DEFAULT true;

UPDATE public.quiz_rounds
SET session_id = id
WHERE session_id IS NULL;

ALTER TABLE public.quiz_rounds
  ALTER COLUMN session_id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN session_id SET NOT NULL,
  ALTER COLUMN is_active SET DEFAULT true;

-- Chaque réponse porte la même identité de session. Les anciennes réponses sont
-- isolées dans leur propre génération et ne rentrent donc pas dans un nouveau score.
ALTER TABLE public.quiz_answers
  ADD COLUMN IF NOT EXISTS session_id uuid NOT NULL DEFAULT gen_random_uuid();

-- Une seule question par manche de session et une seule réponse par joueur.
CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_rounds_session_round
  ON public.quiz_rounds (lobby_id, session_id, round_number);

CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_answers_session_round_player
  ON public.quiz_answers (lobby_id, session_id, round_number, player_id);
