import type { Database } from '@/integrations/supabase/types';

export const GAME_PHASES = ['preview', 'imitation', 'voting', 'results'] as const;

export type GamePhase = (typeof GAME_PHASES)[number];
type GameRoundRow = Database['public']['Tables']['game_rounds']['Row'];

export type DurableGameRound = Omit<GameRoundRow, 'phase'> & {
  phase: GamePhase;
};

const NEXT_PHASE: Partial<Record<GamePhase, GamePhase>> = {
  preview: 'imitation',
  imitation: 'voting',
  voting: 'results',
};

export const isGamePhase = (value: unknown): value is GamePhase =>
  typeof value === 'string' && GAME_PHASES.some((phase) => phase === value);

/**
 * Validate data received at the SQL boundary before it is allowed to drive UI.
 * Generated Supabase types cannot express the database CHECK constraint, so a
 * runtime guard is still required for `phase`.
 */
export const parseDurableGameRound = (value: unknown): DurableGameRound | null => {
  if (!value || typeof value !== 'object') return null;

  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== 'string' ||
    typeof row.lobby_id !== 'string' ||
    typeof row.current_challenge_id !== 'string' ||
    typeof row.challenge_player_id !== 'string' ||
    typeof row.created_at !== 'string' ||
    !Number.isInteger(row.round_number) ||
    (row.round_number as number) < 1 ||
    !isGamePhase(row.phase)
  ) {
    return null;
  }

  return {
    id: row.id,
    lobby_id: row.lobby_id,
    current_challenge_id: row.current_challenge_id,
    challenge_player_id: row.challenge_player_id,
    created_at: row.created_at,
    round_number: row.round_number as number,
    phase: row.phase,
  };
};

export const isAllowedGamePhaseTransition = (
  current: GamePhase,
  next: GamePhase,
): boolean => NEXT_PHASE[current] === next;

export type RoundReconciliationMode = 'ignore' | 'background' | 'invalidate';

export interface GameRoundSignal {
  roundNumber: number;
  phase?: GamePhase;
  roundId?: string;
  challengeId?: string;
}

/**
 * Decide whether a realtime hint can affect the mounted phase. Old rounds are
 * ignored, equal snapshots reconcile in the background (preserving local
 * recording/vote state), and a possible current/new phase change invalidates
 * synchronously before SQL is read.
 */
export const getRoundReconciliationMode = (
  current: DurableGameRound | null,
  signal: GameRoundSignal,
): RoundReconciliationMode => {
  if (!current) return 'invalidate';
  if (signal.roundNumber < current.round_number) return 'ignore';
  if (signal.roundNumber > current.round_number) return 'invalidate';

  if (signal.roundId && signal.roundId !== current.id) return 'invalidate';
  if (signal.phase && signal.phase !== current.phase) {
    const currentIndex = GAME_PHASES.indexOf(current.phase);
    const signalIndex = GAME_PHASES.indexOf(signal.phase);
    return signalIndex > currentIndex ? 'invalidate' : 'background';
  }
  if (signal.challengeId && signal.challengeId !== current.current_challenge_id) {
    return 'invalidate';
  }
  return 'background';
};

export interface RoundReconciliationToken {
  requestId: number;
  channelEpoch: number;
}

/** A SQL result is usable only inside the subscription epoch that requested it. */
export const canCommitRoundSnapshot = (
  token: RoundReconciliationToken,
  latestRequestId: number,
  currentChannelEpoch: number,
  isRoundChannelSubscribed: boolean,
): boolean =>
  isRoundChannelSubscribed &&
  token.requestId === latestRequestId &&
  token.channelEpoch === currentChannelEpoch;

export const shouldInvalidateRoundRetry = (
  requestedInvalidation: boolean,
  isSynchronized: boolean,
  isRoundChannelSubscribed: boolean,
): boolean =>
  requestedInvalidation || !isSynchronized || !isRoundChannelSubscribed;

/** A phase may render only while it comes from a currently synchronized row. */
export const getRenderableGamePhase = (
  round: DurableGameRound | null,
  isSynchronized: boolean,
): GamePhase | null => (isSynchronized && round ? round.phase : null);
