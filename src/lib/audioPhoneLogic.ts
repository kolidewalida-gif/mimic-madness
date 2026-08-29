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
 * Les joueurs réellement attendus dans la manche.
 *
 * `player_order` est tiré une fois, à la création de la manche, et ne bouge
 * plus. Deux cas cassaient donc le déroulé quand on comparait les envois à la
 * liste des joueurs du salon :
 *
 * - un joueur qui **part** en cours de manche reste dans l'ordre mais n'a plus
 *   de siège : on attendait un enregistrement qui ne viendrait jamais ;
 * - un joueur qui **arrive** après le tirage est dans le salon mais absent de
 *   l'ordre : son envoi est refusé (`computePlayerOrderIndex` renvoie -1), et
 *   pourtant on l'attendait.
 *
 * Dans les deux cas la manche se figeait sans aucune sortie. On ne compte donc
 * que l'intersection : présent dans le salon **et** dans l'ordre de la manche.
 *
 * Un ordre vide veut dire « pas encore de manche » : on rend la liste telle
 * quelle plutôt qu'une liste vide, pour ne pas faire croire à un salon désert.
 */
export const rosterForRound = <T extends { id: string }>(
  players: T[],
  playerOrder: string[]
): T[] => {
  if (playerOrder.length === 0) return players;
  const inRound = new Set(playerOrder);
  return players.filter((p) => inRound.has(p.id));
};

/**
 * Ce joueur peut-il agir dans cette manche, ou la regarde-t-il ?
 *
 * Sert à afficher un état de spectateur assumé au joueur arrivé en retard,
 * plutôt qu'un micro dont l'envoi sera silencieusement refusé.
 */
export const canParticipateInRound = (
  playerOrder: string[],
  playerId: string
): boolean => playerOrder.length === 0 || playerOrder.includes(playerId);

/**
 * Y a-t-il de quoi lancer la phase d'imitation ?
 *
 * Il faut au moins une phrase à imiter et au moins un imitateur possible, sinon
 * la phase s'ouvre sur un écran vide dont personne ne peut sortir. Cette borne
 * est ce qui autorise l'hôte à passer outre les joueurs manquants sans risquer
 * de bloquer la manche plus loin.
 */
export const canStartImitationPhase = (params: {
  roster: Array<{ id: string }>;
  recordings: Array<{ player_id: string }>;
}): boolean => {
  const { roster, recordings } = params;
  if (recordings.length === 0) return false;
  /* Une phrase et son seul auteur : personne à qui la faire imiter. */
  return roster.length >= 2;
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
