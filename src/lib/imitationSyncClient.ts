/**
 * Data access for the Imitation flow.
 *
 * Every mutation prefers a transactional RPC that computes ordering and time
 * in PostgreSQL. When the deployed schema predates those functions, the call
 * degrades to the previous table access instead of breaking the round. The
 * degraded path is weaker (client clock, no version) and says so, so callers
 * can keep behaving honestly rather than pretending to be authoritative.
 */
import { supabase } from '@/integrations/supabase/client';

/** PostgREST/Postgres codes meaning "this function or column is not deployed". */
const SCHEMA_GAP_CODES = new Set(['PGRST202', 'PGRST204', '42883', '42703']);

export const isSchemaGapError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: string; message?: string };
  if (code && SCHEMA_GAP_CODES.has(code)) return true;
  return typeof message === 'string' && /does not exist|schema cache/i.test(message);
};

export interface VotingSessionRpcRow {
  session_id: string;
  game_round_id: string | null;
  lobby_id: string;
  round_number: number;
  current_imitation_index: number;
  is_playing: boolean;
  playback_started_at: string | null;
  playback_position_ms: number;
  version: number;
  updated_at: string;
  server_now: string;
}

export interface VotingSessionRead {
  row: VotingSessionRpcRow | null;
  /** True when served by the legacy table path (client clock, no version). */
  degraded: boolean;
}

interface LegacySessionRow {
  id: string;
  lobby_id: string;
  round_number: number;
  current_imitation_index: number;
  is_playing: boolean | null;
  updated_at: string;
}

/**
 * Legacy rows only record that playback is on. `updated_at` is the instant the
 * host flipped it, so it doubles as the shared anchor.
 */
const fromLegacyRow = (row: LegacySessionRow): VotingSessionRpcRow => ({
  session_id: row.id,
  game_round_id: null,
  lobby_id: row.lobby_id,
  round_number: row.round_number,
  current_imitation_index: row.current_imitation_index,
  is_playing: row.is_playing ?? false,
  playback_started_at: row.is_playing ? row.updated_at : null,
  playback_position_ms: 0,
  version: 0,
  updated_at: row.updated_at,
  server_now: new Date().toISOString(),
});

const readLegacySession = async (
  lobbyId: string,
  roundNumber: number,
): Promise<VotingSessionRead> => {
  const { data, error } = await supabase
    .from('voting_session')
    .select('id, lobby_id, round_number, current_imitation_index, is_playing, updated_at')
    .eq('lobby_id', lobbyId)
    .eq('round_number', roundNumber)
    .maybeSingle();
  if (error) throw error;
  return { row: data ? fromLegacyRow(data as LegacySessionRow) : null, degraded: true };
};

export async function readVotingSession(
  lobbyId: string,
  roundNumber: number,
): Promise<VotingSessionRead> {
  const { data, error } = await supabase.rpc('read_voting_session', {
    p_lobby_id: lobbyId,
    p_round_number: roundNumber,
  });
  if (error) {
    if (!isSchemaGapError(error)) throw error;
    return readLegacySession(lobbyId, roundNumber);
  }
  return { row: (data?.[0] as VotingSessionRpcRow | undefined) ?? null, degraded: false };
}

export async function ensureVotingSession(
  gameRoundId: string,
  lobbyId: string,
  roundNumber: number,
): Promise<VotingSessionRead> {
  const { data, error } = await supabase.rpc('ensure_voting_session', {
    p_game_round_id: gameRoundId,
  });
  if (!error) {
    return { row: (data?.[0] as VotingSessionRpcRow | undefined) ?? null, degraded: false };
  }
  if (!isSchemaGapError(error)) throw error;

  const insert = await supabase
    .from('voting_session')
    .insert({ lobby_id: lobbyId, round_number: roundNumber, current_imitation_index: 0 })
    .select('id, lobby_id, round_number, current_imitation_index, is_playing, updated_at')
    .maybeSingle();

  // A concurrent host tab may have won the unique constraint; read it back.
  if (insert.error && insert.error.code !== '23505') {
    if (!isSchemaGapError(insert.error)) throw insert.error;
  }
  if (insert.data) {
    return { row: fromLegacyRow(insert.data as LegacySessionRow), degraded: true };
  }
  return readLegacySession(lobbyId, roundNumber);
}

export type VotingSessionAction = 'start' | 'pause' | 'advance';

/** Returns true only when this exact expected state was the one mutated. */
export async function mutateVotingSession(
  sessionId: string,
  expectedVersion: number,
  expectedIndex: number,
  action: VotingSessionAction,
  countdownMs = 0,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('mutate_voting_session', {
    p_session_id: sessionId,
    p_expected_version: expectedVersion,
    p_expected_index: expectedIndex,
    p_action: action,
    p_countdown_ms: countdownMs,
  });
  if (!error) return data === true;
  if (!isSchemaGapError(error)) throw error;

  // Legacy path: index still guards the write, but the anchor is client time.
  const startAt = new Date(Date.now() + Math.max(0, countdownMs)).toISOString();
  const patch = action === 'advance'
    ? {
        current_imitation_index: expectedIndex + 1,
        is_playing: false,
        updated_at: new Date().toISOString(),
      }
    : {
        is_playing: action === 'start',
        updated_at: action === 'start' ? startAt : new Date().toISOString(),
      };

  const { data: rows, error: updateError } = await supabase
    .from('voting_session')
    .update(patch)
    .eq('id', sessionId)
    .eq('current_imitation_index', expectedIndex)
    .select('id');
  if (updateError) throw updateError;
  return (rows?.length ?? 0) === 1;
}

export interface SubmitImitationInput {
  lobbyId: string;
  roundNumber: number;
  playerId: string;
  playerName: string;
  clipId: string | null;
  includeOriginalAudio: boolean;
  originalAudioVolume: number;
}

/** Readiness and the exact clip become one durable, idempotent write. */
export async function submitPlayerImitation(
  input: SubmitImitationInput,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('submit_player_imitation', {
    p_lobby_id: input.lobbyId,
    p_round_number: input.roundNumber,
    p_player_id: input.playerId,
    p_player_name: input.playerName,
    p_clip_id: input.clipId,
    p_include_original_audio: input.includeOriginalAudio,
    p_original_audio_volume: input.originalAudioVolume,
  });
  if (!error) return data === true;
  if (!isSchemaGapError(error)) throw error;

  const { error: upsertError } = await supabase
    .from('player_imitations')
    .upsert(
      {
        lobby_id: input.lobbyId,
        round_number: input.roundNumber,
        player_id: input.playerId,
        player_name: input.playerName,
        is_ready: true,
        include_original_audio: input.includeOriginalAudio,
        original_audio_volume: input.originalAudioVolume,
      },
      { onConflict: 'lobby_id,round_number,player_id' },
    );
  if (upsertError) throw upsertError;
  return true;
}

/** Returns false when the vote already existed or is no longer allowed. */
export async function castImitationVote(
  lobbyId: string,
  roundNumber: number,
  voterPlayerId: string,
  imitationPlayerIds: string[],
  voteType: 'like' | 'dislike',
): Promise<boolean> {
  const { data, error } = await supabase.rpc('cast_imitation_vote', {
    p_lobby_id: lobbyId,
    p_round_number: roundNumber,
    p_voter_player_id: voterPlayerId,
    p_imitation_player_ids: imitationPlayerIds,
    p_vote_type: voteType,
  });
  if (!error) return data === true;
  if (!isSchemaGapError(error)) throw error;

  const { error: insertError } = await supabase.from('imitation_votes').insert(
    imitationPlayerIds.map((imitationPlayerId) => ({
      lobby_id: lobbyId,
      round_number: roundNumber,
      imitation_player_id: imitationPlayerId,
      voter_player_id: voterPlayerId,
      vote_type: voteType,
    })),
  );
  // A duplicate means this player had already voted for that imitation.
  if (insertError?.code === '23505') return false;
  if (insertError) throw insertError;
  return true;
}

export async function setLobbyPlayerConnection(
  lobbyId: string,
  playerId: string,
  connected: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('set_lobby_player_connection', {
    p_lobby_id: lobbyId,
    p_player_id: playerId,
    p_connected: connected,
  });
  if (!error) return;
  if (!isSchemaGapError(error)) throw error;

  const { error: updateError } = await supabase
    .from('lobby_players')
    .update(
      connected
        ? { connection_status: 'connected', disconnected_at: null }
        : { connection_status: 'disconnected', disconnected_at: new Date().toISOString() },
    )
    .eq('lobby_id', lobbyId)
    .eq('player_id', playerId)
    .eq('connection_status', connected ? 'disconnected' : 'connected');
  if (updateError) throw updateError;
}

/**
 * Appel de RPC non encore décrit par `integrations/supabase/types.ts`.
 *
 * Ce fichier de types est généré par le pipeline Lovable et ne doit pas être
 * édité à la main ; il est donc en retard d'une migration tant qu'il n'a pas été
 * régénéré. Le contournement reste volontairement étroit et nommé, plutôt qu'un
 * `as never` dispersé sur les appels : les deux fonctions visées sont celles
 * ajoutées par `20260821194917_split_preview_and_imitation_readiness`.
 */
const callUntypedRpc = async <T>(
  name: 'mark_preview_seen' | 'skip_missing_imitations',
  params: Record<string, unknown>,
): Promise<{ data: T | null; error: unknown }> => {
  const invoke = supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: T | null; error: unknown }>;
  return invoke(name, params);
};

export interface MarkPreviewSeenInput {
  lobbyId: string;
  roundNumber: number;
  playerId: string;
  playerName: string;
}

/**
 * Record that a player watched the challenge video.
 *
 * Deliberately separate from `is_ready`. Both meanings used to share that one
 * column, so clicking "I have watched it" during preview already marked the
 * player as having submitted an imitation. The round then skipped the imitation
 * phase, and the player's real submission was refused by
 * `submit_player_imitation` because a ready row already existed.
 *
 * The fallback path must never write `is_ready` — that is the whole point.
 * Preview readiness also travels over broadcast, so a failure here degrades to
 * "not persisted across a reload" instead of blocking the round.
 */
export async function markPreviewSeen(input: MarkPreviewSeenInput): Promise<boolean> {
  const { data, error } = await callUntypedRpc<boolean>('mark_preview_seen', {
    p_lobby_id: input.lobbyId,
    p_round_number: input.roundNumber,
    p_player_id: input.playerId,
    p_player_name: input.playerName,
  });
  if (!error) return data === true;
  if (!isSchemaGapError(error)) throw error;

  const { error: upsertError } = await supabase
    .from('player_imitations')
    .upsert(
      {
        lobby_id: input.lobbyId,
        round_number: input.roundNumber,
        player_id: input.playerId,
        player_name: input.playerName,
        has_seen_preview: true,
      } as never,
      { onConflict: 'lobby_id,round_number,player_id' },
    );
  if (upsertError && !isSchemaGapError(upsertError)) throw upsertError;
  return !upsertError;
}

/**
 * Host escape hatch: close a round without the players who never submitted.
 *
 * The skip is recorded explicitly rather than inferred from "ready with no
 * clip", which used to be indistinguishable from a submission that failed.
 */
export async function skipMissingImitations(
  lobbyId: string,
  roundNumber: number,
  players: Array<{ id: string; name: string }>,
): Promise<number> {
  if (players.length === 0) return 0;

  const { data, error } = await callUntypedRpc<number>('skip_missing_imitations', {
    p_lobby_id: lobbyId,
    p_round_number: roundNumber,
    p_player_ids: players.map((player) => player.id),
    p_player_names: players.map((player) => player.name),
  });
  if (!error) return typeof data === 'number' ? data : players.length;
  if (!isSchemaGapError(error)) throw error;

  const { error: upsertError } = await supabase
    .from('player_imitations')
    .upsert(
      players.map((player) => ({
        lobby_id: lobbyId,
        round_number: roundNumber,
        player_id: player.id,
        player_name: player.name,
        is_ready: true,
        include_original_audio: false,
        original_audio_volume: 50,
      })),
      { onConflict: 'lobby_id,round_number,player_id' },
    );
  if (upsertError) throw upsertError;
  return players.length;
}
