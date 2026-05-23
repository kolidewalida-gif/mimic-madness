/**
 * Pure logic for the Undercover game mode.
 * No React, no Supabase — fully testable and deterministic.
 */

export type UndercoverRole = 'civilian' | 'undercover' | 'mr_white';

export interface UndercoverPlayerLite {
  player_id: string;
  role: UndercoverRole;
  is_alive: boolean;
  vote_target?: string | null;
  current_clue?: string | null;
}

export type RoundWinner = 'civilian' | 'undercover' | null;

export interface RoleAssignment {
  roles: Record<string, UndercoverRole>;
  words: Record<string, string | null>;
}

/**
 * Compute the maximum safe number of undercovers for a player count,
 * preserving at least 2 civilians.
 */
export const computeMaxUndercover = (
  totalPlayers: number,
  enableMrWhite: boolean
): number => {
  // Reserve at least 2 civilians (min) + 1 mr_white if enabled
  const reserved = enableMrWhite ? 3 : 2;
  return Math.max(1, Math.min(3, totalPlayers - reserved));
};

/**
 * Clamp the number of undercover to a safe range based on player count
 * and whether Mr White is enabled.
 */
export const clampUndercover = (
  requestedNum: number,
  totalPlayers: number,
  enableMrWhite: boolean
): number => {
  const max = computeMaxUndercover(totalPlayers, enableMrWhite);
  return Math.max(1, Math.min(3, requestedNum, max));
};

/**
 * Distribute roles deterministically given a shuffled order.
 * The first `numUndercover` players get 'undercover', the next one
 * (if Mr White enabled and >= 4 players) gets 'mr_white', the rest are 'civilian'.
 *
 * Pre-condition: `shuffledOrder` should be the player IDs in random order.
 */
export const distributeRoles = (
  shuffledOrder: string[],
  numUndercover: number,
  enableMrWhite: boolean,
  civilianWord: string,
  undercoverWord: string
): RoleAssignment => {
  const roles: Record<string, UndercoverRole> = {};
  const words: Record<string, string | null> = {};
  let idx = 0;

  // Assign undercovers
  for (let i = 0; i < numUndercover && idx < shuffledOrder.length; i++, idx++) {
    roles[shuffledOrder[idx]] = 'undercover';
    words[shuffledOrder[idx]] = undercoverWord;
  }

  // Assign Mr White if enabled and enough players
  if (enableMrWhite && shuffledOrder.length >= 4 && idx < shuffledOrder.length) {
    roles[shuffledOrder[idx]] = 'mr_white';
    words[shuffledOrder[idx]] = null;
    idx++;
  }

  // Remaining are civilians
  for (; idx < shuffledOrder.length; idx++) {
    roles[shuffledOrder[idx]] = 'civilian';
    words[shuffledOrder[idx]] = civilianWord;
  }

  return { roles, words };
};

/**
 * Determine the round winner based on alive players' roles.
 *
 * - 'civilian' wins if NO undercover and NO mr_white remain alive
 * - 'undercover' wins if undercovers + mr_white >= civilians (parity)
 * - null (round continues) otherwise
 */
export const computeRoundWinner = (
  alivePlayers: Array<{ role: UndercoverRole }>
): RoundWinner => {
  const undercovers = alivePlayers.filter((p) => p.role === 'undercover').length;
  const mrWhites = alivePlayers.filter((p) => p.role === 'mr_white').length;
  const civilians = alivePlayers.filter((p) => p.role === 'civilian').length;

  const allBadGuysOut = undercovers === 0 && mrWhites === 0;
  if (allBadGuysOut) return 'civilian';

  // Undercover wins by parity: their count (incl. Mr White) >= civilians
  if (undercovers + mrWhites >= civilians) return 'undercover';

  return null;
};

/**
 * Count votes from alive players and return the elimination outcome.
 *
 * Rules:
 * - A player only counts if they have a non-null vote_target
 * - The player with the most votes is eliminated
 * - Ties (2+ players with the max count) result in NO elimination
 */
export interface VoteResolution {
  eliminatedId: string | null;
  isTie: boolean;
  voteCounts: Record<string, number>;
}

export const resolveVotes = (
  alivePlayers: Array<{ player_id: string; vote_target: string | null }>
): VoteResolution => {
  const voteCounts: Record<string, number> = {};

  alivePlayers.forEach((player) => {
    if (player.vote_target) {
      voteCounts[player.vote_target] = (voteCounts[player.vote_target] || 0) + 1;
    }
  });

  const entries = Object.entries(voteCounts);
  if (entries.length === 0) {
    return { eliminatedId: null, isTie: false, voteCounts };
  }

  // Find max count
  const maxVotes = Math.max(...entries.map(([, count]) => count));
  // Find all candidates tied at max
  const topCandidates = entries.filter(([, count]) => count === maxVotes);

  // Bug fix: proper tie detection — true tie if 2+ players share the max
  if (topCandidates.length > 1) {
    return { eliminatedId: null, isTie: true, voteCounts };
  }

  return {
    eliminatedId: topCandidates[0][0],
    isTie: false,
    voteCounts,
  };
};

/**
 * Compute the next player index for the clue-giving phase.
 * Returns -1 if all alive players have spoken (move to discussion).
 */
export const computeNextTurnIndex = (
  currentIndex: number,
  aliveOrder: string[]
): number => {
  if (currentIndex + 1 >= aliveOrder.length) return -1;
  return currentIndex + 1;
};

/**
 * Filter the player_order to only include alive players, preserving order.
 */
export const computeAliveOrder = (
  playerOrder: string[],
  alivePlayerIds: Set<string>
): string[] => playerOrder.filter((id) => alivePlayerIds.has(id));

/**
 * Determine if a player is allowed to vote.
 * Rules:
 * - Voter must be alive
 * - Voter cannot vote for themselves
 * - Target must be alive
 * - We're in voting phase
 */
export const canVote = (params: {
  voterId: string;
  voterIsAlive: boolean;
  targetId: string;
  targetIsAlive: boolean;
  phase: string;
}): boolean => {
  const { voterId, voterIsAlive, targetId, targetIsAlive, phase } = params;
  if (phase !== 'voting') return false;
  if (!voterIsAlive) return false;
  if (!targetIsAlive) return false;
  if (voterId === targetId) return false;
  return true;
};

/**
 * Determine if a player is allowed to submit a clue.
 * Rules:
 * - Player must be alive
 * - Must be the player's turn
 * - We're in clue_giving phase
 * - Player hasn't already submitted a clue this turn
 */
export const canSubmitClue = (params: {
  playerId: string;
  playerIsAlive: boolean;
  currentTurnPlayerId: string | null;
  phase: string;
  hasExistingClue: boolean;
}): boolean => {
  const { playerId, playerIsAlive, currentTurnPlayerId, phase, hasExistingClue } = params;
  if (phase !== 'clue_giving') return false;
  if (!playerIsAlive) return false;
  if (currentTurnPlayerId !== playerId) return false;
  if (hasExistingClue) return false;
  return true;
};

/**
 * Compute the global match winner from accumulated round wins.
 * Returns 'civilian' or 'undercover' based on highest score.
 * In case of a tie, returns the lastRoundWinner (or 'civilian' if null).
 */
export const computeMatchWinner = (
  civilianWins: number,
  undercoverWins: number,
  lastRoundWinner: RoundWinner
): 'civilian' | 'undercover' => {
  if (civilianWins > undercoverWins) return 'civilian';
  if (undercoverWins > civilianWins) return 'undercover';
  return lastRoundWinner ?? 'civilian';
};

/**
 * Validate a word pair: both must be non-empty and different.
 */
export const isValidWordPair = (pair: { civilian: string; undercover: string }): boolean => {
  if (!pair.civilian || !pair.undercover) return false;
  if (pair.civilian.trim().length === 0 || pair.undercover.trim().length === 0) return false;
  if (pair.civilian.toLowerCase().trim() === pair.undercover.toLowerCase().trim()) return false;
  return true;
};

/**
 * Determine if the match should conclude (final game over) or continue
 * with a fresh round.
 */
export const shouldConcludeMatch = (params: {
  roundWinner: RoundWinner;
  currentRound: number;
  totalRounds: number;
}): boolean => {
  const { roundWinner, currentRound, totalRounds } = params;
  if (roundWinner === null) return false; // Round itself didn't end
  return currentRound >= totalRounds;
};
