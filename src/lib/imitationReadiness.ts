/**
 * Qui a rendu son imitation, et qui a seulement regardé l'aperçu.
 *
 * `player_imitations.is_ready` portait ces deux sens sur la même ligne : la
 * phase d'aperçu y écrivait « j'ai vu la vidéo », alors que la phase
 * d'imitation, `submit_player_imitation`, la phase de vote et
 * `cast_imitation_vote` la lisent comme « j'ai déposé mon imitation ».
 *
 * Trois conséquences, toutes observées en production :
 *   * la manche sautait l'imitation, puisque tout le monde était déjà « prêt »
 *     en arrivant ;
 *   * la vraie soumission était ensuite refusée par le RPC, une ligne prête
 *     existant déjà ;
 *   * la phase de vote héritait d'imitations sans clip, résolues différemment
 *     par chaque client — d'où des joueurs qui ne voyaient pas la même chose.
 *
 * Les deux sens vivent désormais dans deux colonnes. Ce module centralise la
 * lecture pour que la règle ne se redisperse pas dans les composants.
 */

/** Forme minimale, tolérante à un schéma antérieur au correctif. */
export interface ImitationReadinessRow {
  player_id: string;
  is_ready?: boolean | null;
  clip_id?: string | null;
  skipped?: boolean | null;
  has_seen_preview?: boolean | null;
}

/**
 * Le joueur a réellement rendu quelque chose d'exploitable.
 *
 * `is_ready` seul ne suffit pas : la ligne peut porter le drapeau sans clip,
 * soit comme reliquat, soit parce que l'hôte a débloqué la manche sans ce
 * joueur. La question utile est donc « y a-t-il un clip, ou un saut assumé ».
 */
export const hasDeliveredImitation = (row: ImitationReadinessRow): boolean => {
  if (row.is_ready !== true) return false;
  if (typeof row.clip_id === 'string' && row.clip_id.length > 0) return true;
  /*
   * `skipped` absent signifie que la migration n'est pas déployée. On retombe
   * alors sur l'ancien comportement : mieux vaut une manche qui avance qu'une
   * manche définitivement bloquée sur un schéma plus vieux que le code.
   */
  return row.skipped === true || row.skipped === undefined;
};

/** Le joueur a regardé la vidéo à imiter. Propre à la phase d'aperçu. */
export const hasSeenPreview = (row: ImitationReadinessRow): boolean =>
  row.has_seen_preview === true;

/**
 * Filtre les identifiants des joueurs ayant rendu leur imitation.
 * L'ordre d'entrée est conservé.
 */
export const deliveredPlayerIds = (rows: readonly ImitationReadinessRow[]): string[] =>
  rows.filter(hasDeliveredImitation).map((row) => row.player_id);

/** Filtre les identifiants des joueurs ayant vu l'aperçu. */
export const previewSeenPlayerIds = (rows: readonly ImitationReadinessRow[]): string[] =>
  rows.filter(hasSeenPreview).map((row) => row.player_id);

/**
 * La manche peut-elle quitter la phase d'imitation ?
 *
 * Inclusion d'ensemble, jamais une égalité de compte : un joueur déconnecté
 * disparaît de `players` mais conserve sa ligne, si bien qu'un décompte ne
 * correspondrait jamais et que l'hôte ne pourrait plus avancer.
 *
 * Une liste de joueurs vide renvoie `false`. Sans cette garde, `every` sur un
 * tableau vide vaut `true` et la manche avancerait avant même que la liste des
 * joueurs soit chargée.
 */
export const canLeaveImitationPhase = (
  players: readonly { id: string }[],
  rows: readonly ImitationReadinessRow[],
): boolean => {
  if (players.length === 0) return false;
  const delivered = new Set(deliveredPlayerIds(rows));
  return players.every((player) => delivered.has(player.id));
};

/**
 * Tous les joueurs connectés ont-ils vu l'aperçu ?
 * Même garde que ci-dessus sur la liste vide.
 */
export const canLeavePreviewPhase = (
  players: readonly { id: string }[],
  rows: readonly ImitationReadinessRow[],
): boolean => {
  if (players.length === 0) return false;
  const seen = new Set(previewSeenPlayerIds(rows));
  return players.every((player) => seen.has(player.id));
};
