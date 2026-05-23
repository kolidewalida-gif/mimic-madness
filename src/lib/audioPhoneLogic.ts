/**
 * Pure logic for the AudioPhone V2 game mode.
 * No React, no Supabase — fully testable and deterministic.
 *
 * Game flow:
 *   instructions → recording_all → reversing → imitation → waiting_reveal → reveal → scores → finished
 *
 * In `recording_all`, every player records ONE original phrase.
 * The system reverses each phrase server-side.
 * In `imitation`, players take turns trying to imitate REVERSED phrases.
 * In `reveal`, the host plays back original + reversed + imitations side-by-side.
 */

export type AudioPhonePhase =
  | 'instructions'
  | 'recording_all'
  | 'reversing'
  | 'imitation'
  | 'waiting_reveal'
  | 'reveal'
  | 'scores'
  | 'finished';

export interface AudioPhonePlayer {
  id: string;
  name: string;
  isHost?: boolean;
}

export interface AudioPhoneOriginalRecording {
  id: string;
  player_id: string;
  player_order_index: number;
}

export interface AudioPhoneImitation {
  id: string;
  original_recording_id: string;
  imitator_player_id: string;
}

/**
 * Determine if a player is allowed to submit their original phrase.
 * Rules:
 * - Phase must be 'recording_all'
 * - Player must not have already submitted
 */
export const canSubmitOriginalPhrase = (params: {
  phase: AudioPhonePhase;
  playerId: string;
  recordings: Array<{ player_id: string }>;
}): boolean => {
  const { phase, playerId, recordings } = params;
  if (phase !== 'recording_all') return false;
  if (recordings.some((r) => r.player_id === playerId)) return false;
  return true;
};

/**
 * Determine if a player is allowed to submit an imitation.
 * Rules:
 * - Phase must be 'imitation'
 * - Player must NOT be the author of the original recording
 * - Player must not have already imitated this specific original
 */
export const canSubmitImitation = (params: {
  phase: AudioPhonePhase;
  playerId: string;
  originalRecordingId: string;
  originalAuthorId: string;
  imitations: Array<{ original_recording_id: string; imitator_player_id: string }>;
}): boolean => {
  const { phase, playerId, originalRecordingId, originalAuthorId, imitations } = params;
  if (phase !== 'imitation') return false;
  if (playerId === originalAuthorId) return false;
  // Check duplicate
  const alreadyImitated = imitations.some(
    (im) =>
      im.original_recording_id === originalRecordingId && im.imitator_player_id === playerId
  );
  if (alreadyImitated) return false;
  return true;
};

/**
 * Compute the player_order_index for a player.
 * Returns the position in player_order, or -1 if not found.
 */
export const computePlayerOrderIndex = (
  playerOrder: string[],
  playerId: string
): number => {
  return playerOrder.indexOf(playerId);
};

/**
 * Determine if all players have submitted their original phrases.
 */
export const allOriginalPhrasesSubmitted = (
  players: Array<{ id: string }>,
  recordings: Array<{ player_id: string }>
): boolean => {
  if (players.length === 0) return false;
  const submittedIds = new Set(recordings.map((r) => r.player_id));
  return players.every((p) => submittedIds.has(p.id));
};

/**
 * Get the list of players who haven't yet submitted their original phrase.
 */
export const getPendingOriginalPlayers = <T extends { id: string }>(
  players: T[],
  recordings: Array<{ player_id: string }>
): T[] => {
  const submittedIds = new Set(recordings.map((r) => r.player_id));
  return players.filter((p) => !submittedIds.has(p.id));
};

/**
 * Get players who need to imitate the current phrase (everyone except the author).
 */
export const getPlayersToImitate = <T extends { id: string }>(
  players: T[],
  originalAuthorId: string
): T[] => {
  return players.filter((p) => p.id !== originalAuthorId);
};

/**
 * Determine if the current player should imitate the current phrase.
 */
export const shouldImitate = (params: {
  playerId: string;
  originalAuthorId: string;
  originalRecordingId: string;
  imitations: Array<{ original_recording_id: string; imitator_player_id: string }>;
}): boolean => {
  const { playerId, originalAuthorId, originalRecordingId, imitations } = params;
  if (playerId === originalAuthorId) return false;
  const alreadyImitated = imitations.some(
    (im) =>
      im.original_recording_id === originalRecordingId && im.imitator_player_id === playerId
  );
  return !alreadyImitated;
};

/**
 * Determine if all imitations for the current phrase are done.
 */
export const allImitationsForPhraseDone = (params: {
  players: Array<{ id: string }>;
  originalAuthorId: string;
  originalRecordingId: string;
  imitations: Array<{ original_recording_id: string; imitator_player_id: string }>;
}): boolean => {
  const { players, originalAuthorId, originalRecordingId, imitations } = params;
  const playersToImitate = players.filter((p) => p.id !== originalAuthorId);
  if (playersToImitate.length === 0) return true;
  const phraseImitations = imitations.filter((im) => im.original_recording_id === originalRecordingId);
  return playersToImitate.every((p) =>
    phraseImitations.some((im) => im.imitator_player_id === p.id)
  );
};

/**
 * Compute the next phrase index when moving forward.
 * Returns -1 if we should transition to waiting_reveal phase.
 */
export const computeNextPhraseIndex = (
  currentPhraseIndex: number,
  totalRecordings: number
): number => {
  const next = currentPhraseIndex + 1;
  if (next >= totalRecordings) return -1;
  return next;
};

/**
 * Compute progress info for the current phrase.
 */
export interface PhraseProgress {
  requiredCount: number;
  completedCount: number;
  pendingPlayerIds: string[];
}

export const computePhraseProgress = <T extends { id: string }>(params: {
  players: T[];
  originalAuthorId: string | null;
  originalRecordingId: string | null;
  imitations: Array<{ original_recording_id: string; imitator_player_id: string }>;
}): PhraseProgress => {
  const { players, originalAuthorId, originalRecordingId, imitations } = params;

  if (!originalAuthorId || !originalRecordingId) {
    return { requiredCount: 0, completedCount: 0, pendingPlayerIds: [] };
  }

  const playersToImitate = players.filter((p) => p.id !== originalAuthorId);
  const phraseImitations = imitations.filter((im) => im.original_recording_id === originalRecordingId);
  const completedIds = new Set(phraseImitations.map((im) => im.imitator_player_id));

  return {
    requiredCount: playersToImitate.length,
    completedCount: playersToImitate.filter((p) => completedIds.has(p.id)).length,
    pendingPlayerIds: playersToImitate.filter((p) => !completedIds.has(p.id)).map((p) => p.id),
  };
};

/**
 * Validate phase transitions in the AudioPhone state machine.
 */
const VALID_TRANSITIONS: Record<AudioPhonePhase, AudioPhonePhase[]> = {
  instructions: ['recording_all'],
  recording_all: ['reversing', 'imitation'], // can skip reversing if synchronous
  reversing: ['imitation'],
  imitation: ['waiting_reveal'],
  waiting_reveal: ['reveal'],
  reveal: ['scores', 'finished'],
  scores: ['finished'],
  finished: [],
};

export const isValidPhaseTransition = (
  from: AudioPhonePhase,
  to: AudioPhonePhase
): boolean => {
  return VALID_TRANSITIONS[from].includes(to);
};

/**
 * Sort recordings by player_order_index for deterministic playback order.
 */
export const sortRecordingsByOrder = <T extends { player_order_index: number }>(
  recordings: T[]
): T[] => {
  return [...recordings].sort((a, b) => a.player_order_index - b.player_order_index);
};

/**
 * Check if a recording exists for a given player.
 */
export const playerHasSubmitted = (
  playerId: string,
  recordings: Array<{ player_id: string }>
): boolean => recordings.some((r) => r.player_id === playerId);
