import { canCommitSyncToken, type SyncToken } from './syncState';

export interface VotingSessionSnapshot {
  id: string;
  gameRoundId: string | null;
  lobbyId: string;
  roundNumber: number;
  currentIndex: number;
  isPlaying: boolean;
  playbackStartedAt: string | null;
  playbackPositionMs: number;
  version: number;
  updatedAt: string;
  /** server epoch minus this client's epoch, estimated at request midpoint. */
  serverOffsetMs: number;
}

export interface VotingSessionGuard {
  lobbyId: string;
  roundNumber: number;
  gameRoundId?: string;
}

export const parseVotingSessionSnapshot = (
  value: unknown,
  guard: VotingSessionGuard,
  clientRequestStartedAt: number,
  clientResponseReceivedAt: number,
): VotingSessionSnapshot | null => {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const serverNowMs = typeof row.server_now === 'string' ? Date.parse(row.server_now) : NaN;
  const midpoint = clientRequestStartedAt + (clientResponseReceivedAt - clientRequestStartedAt) / 2;

  if (
    typeof row.session_id !== 'string' ||
    typeof row.lobby_id !== 'string' ||
    row.lobby_id !== guard.lobbyId ||
    !Number.isInteger(row.round_number) ||
    row.round_number !== guard.roundNumber ||
    !Number.isInteger(row.current_imitation_index) ||
    (row.current_imitation_index as number) < 0 ||
    typeof row.is_playing !== 'boolean' ||
    !Number.isInteger(row.playback_position_ms) ||
    (row.playback_position_ms as number) < 0 ||
    !Number.isInteger(row.version) ||
    (row.version as number) < 0 ||
    typeof row.updated_at !== 'string' ||
    !Number.isFinite(serverNowMs)
  ) {
    return null;
  }

  const gameRoundId = typeof row.game_round_id === 'string' ? row.game_round_id : null;
  if (guard.gameRoundId && gameRoundId !== guard.gameRoundId) return null;
  const playbackStartedAt = typeof row.playback_started_at === 'string'
    ? row.playback_started_at
    : null;
  if (row.is_playing && (!playbackStartedAt || !Number.isFinite(Date.parse(playbackStartedAt)))) {
    return null;
  }

  return {
    id: row.session_id,
    gameRoundId,
    lobbyId: row.lobby_id,
    roundNumber: row.round_number as number,
    currentIndex: row.current_imitation_index as number,
    isPlaying: row.is_playing,
    playbackStartedAt,
    playbackPositionMs: row.playback_position_ms as number,
    version: row.version as number,
    updatedAt: row.updated_at,
    serverOffsetMs: serverNowMs - midpoint,
  };
};

export const canCommitVotingSession = (
  token: SyncToken & { channelEpoch: number },
  activeGeneration: number,
  latestRequestId: number,
  activeChannelEpoch: number,
  subscribed: boolean,
): boolean =>
  subscribed &&
  token.channelEpoch === activeChannelEpoch &&
  canCommitSyncToken(token, activeGeneration, latestRequestId);

export const estimatedServerNowMs = (
  snapshot: VotingSessionSnapshot,
  clientNowMs = Date.now(),
): number => clientNowMs + snapshot.serverOffsetMs;

export const expectedPlaybackPositionMs = (
  snapshot: VotingSessionSnapshot,
  serverNowMs = estimatedServerNowMs(snapshot),
): number => {
  if (!snapshot.isPlaying || !snapshot.playbackStartedAt) {
    return snapshot.playbackPositionMs;
  }
  const startedAt = Date.parse(snapshot.playbackStartedAt);
  return snapshot.playbackPositionMs + Math.max(0, serverNowMs - startedAt);
};

export const localPlaybackStartMs = (snapshot: VotingSessionSnapshot): number | null => {
  if (!snapshot.playbackStartedAt) return null;
  return Date.parse(snapshot.playbackStartedAt) - snapshot.serverOffsetMs;
};
