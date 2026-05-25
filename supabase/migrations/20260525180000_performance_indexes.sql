-- Performance indexes for game tables.
-- These speed up the most common queries (realtime filters, score lookups, round fetches).

-- Quiz: answers lookup by lobby + round
CREATE INDEX IF NOT EXISTS idx_quiz_answers_lobby_round
  ON public.quiz_answers (lobby_id, round_number);

-- Quiz: rounds lookup by lobby (latest first)
CREATE INDEX IF NOT EXISTS idx_quiz_rounds_lobby
  ON public.quiz_rounds (lobby_id, round_number DESC);

-- Pixoguess: rounds lookup by lobby (latest first)
CREATE INDEX IF NOT EXISTS idx_pixoguess_rounds_lobby
  ON public.pixoguess_rounds (lobby_id, round_number DESC);

-- Pixoguess: guesses lookup by lobby + round
CREATE INDEX IF NOT EXISTS idx_pixoguess_guesses_lobby_round
  ON public.pixoguess_guesses (lobby_id, round_number);

-- Pixoguess: winner claim (atomic update needs fast lookup)
CREATE INDEX IF NOT EXISTS idx_pixoguess_rounds_winner
  ON public.pixoguess_rounds (id) WHERE winner_id IS NULL;

-- Undercover: game lookup by lobby (latest first)
CREATE INDEX IF NOT EXISTS idx_undercover_games_lobby
  ON public.undercover_games (lobby_id, created_at DESC);

-- Undercover: players lookup by game
CREATE INDEX IF NOT EXISTS idx_undercover_players_game
  ON public.undercover_players (game_id);

-- Undercover: alive players for vote resolution
CREATE INDEX IF NOT EXISTS idx_undercover_players_alive
  ON public.undercover_players (game_id) WHERE is_alive = true;

-- Audio Phone: rounds by lobby (latest first)
CREATE INDEX IF NOT EXISTS idx_audio_phone_rounds_lobby
  ON public.audio_phone_rounds (lobby_id, created_at DESC);

-- Audio Phone: recordings by round (ordered)
CREATE INDEX IF NOT EXISTS idx_audio_phone_recordings_round
  ON public.audio_phone_recordings (round_id, player_order_index);

-- Audio Phone: imitations by round
CREATE INDEX IF NOT EXISTS idx_audio_phone_imitations_round
  ON public.audio_phone_imitations (round_id);

-- Player stats: XP lookup
CREATE INDEX IF NOT EXISTS idx_player_stats_xp
  ON public.player_stats (user_id);

-- Player rewards: equipped title lookup
CREATE INDEX IF NOT EXISTS idx_player_rewards_equipped
  ON public.player_rewards (user_id) WHERE is_equipped = true;

-- Lobbies: active lobbies lookup
CREATE INDEX IF NOT EXISTS idx_lobbies_active
  ON public.lobbies (id) WHERE phase != 'ended';

-- Lobby players: by lobby
CREATE INDEX IF NOT EXISTS idx_lobby_players_lobby
  ON public.lobby_players (lobby_id);
