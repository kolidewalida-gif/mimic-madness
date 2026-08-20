/**
 * Ce que le joueur courant peut faire de l'imitation affichée.
 *
 * Cette décision vivait en deux exemplaires dans `VotingPhase` : une condition
 * d'affichage pour les boutons, et une garde dans le gestionnaire de clic. Les
 * deux ont divergé — la garde refusait une imitation sans clip alors que
 * l'affichage l'ignorait. Les boutons « Bof » et « Top ! » restaient donc
 * pleinement actifs, réagissaient au survol, et leur clic ne faisait
 * strictement rien : ni vote, ni message, ni erreur en console.
 *
 * Une seule source de vérité, testable sans monter le composant.
 */

export interface VotableImitation {
  /** Auteurs de l'imitation : un seul hors 2v2, l'équipe sinon. */
  playerIds: string[];
  /** Clip par auteur, `null` quand l'enregistrement manque. */
  clipIds: (string | null)[];
  /** Vote déjà émis par le joueur courant sur cette imitation. */
  userVote: 'like' | 'dislike' | null;
}

export type VoteAvailability =
  /** Votable : `targetIds` liste les auteurs réellement audibles. */
  | { kind: 'votable'; targetIds: string[] }
  /** C'est sa propre imitation : on ne vote pas pour soi. */
  | { kind: 'own' }
  | { kind: 'already-voted' }
  /**
   * Aucun clip à écouter. Cas légitime : l'hôte peut débloquer une manche en
   * marquant prêts les joueurs qui n'ont pas enregistré.
   */
  | { kind: 'no-audio' }
  /** Session de vote pas encore certifiée, ou rien à afficher. */
  | { kind: 'not-ready' };

export const resolveVoteAvailability = (
  imitation: VotableImitation | undefined | null,
  currentPlayerId: string,
  sessionReady: boolean,
): VoteAvailability => {
  if (!sessionReady || !imitation || imitation.playerIds.length === 0) {
    return { kind: 'not-ready' };
  }

  // L'appartenance passe avant tout le reste : sa propre imitation ne se juge
  // pas, même si l'audio manque.
  if (imitation.playerIds.includes(currentPlayerId)) return { kind: 'own' };

  if (imitation.userVote !== null) return { kind: 'already-voted' };

  const targetIds = imitation.playerIds.filter(
    (_, index) => (imitation.clipIds[index] ?? null) !== null,
  );
  if (targetIds.length === 0) return { kind: 'no-audio' };

  return { kind: 'votable', targetIds };
};

/** Y a-t-il de l'audio à lire pour cette imitation ? */
export const hasPlayableAudio = (
  imitation: VotableImitation | undefined | null,
): boolean => !!imitation?.clipIds.some((clipId) => (clipId ?? null) !== null);
