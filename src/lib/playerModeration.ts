/**
 * Signalement et mise en sourdine d'un joueur.
 *
 * Le jeu savait bannir — table `user_bans`, console d'administration — mais un
 * joueur qui subissait un comportement abusif n'avait rien : ni signalement, ni
 * blocage, ni sourdine. Sur un jeu avec micro ouvert, chat et clips publiés, ce
 * silence était le vrai trou de la protection des joueurs.
 *
 * Deux mécanismes complémentaires ici :
 *
 * 1. **La sourdine**, purement locale et immédiate. Elle ne demande la
 *    permission de personne et prend effet au clic : les messages du joueur
 *    disparaissent de l'écran. C'est le soulagement instantané, celui qui compte
 *    quand ça se passe mal en pleine partie.
 * 2. **Le signalement**, qui part au serveur avec la preuve qu'on est bien assis
 *    dans le salon — le jeton de siège. Il alimente la file de tri des
 *    administrateurs, qui peuvent bannir. C'est le temps long.
 *
 * Les deux sont indépendants : on peut se protéger sans dénoncer, et signaler
 * sans se couper de la partie.
 */
import { supabase } from '@/integrations/supabase/client';
import { readLobbyToken } from '@/lib/lobbySession';

const MUTE_KEY = 'mimic-muted-players';

export const REPORT_REASONS = [
  { id: 'harcelement', label: 'Harcèlement ou insultes' },
  { id: 'contenu_choquant', label: 'Contenu choquant' },
  { id: 'usurpation', label: "Se fait passer pour quelqu'un d'autre" },
  { id: 'triche', label: 'Triche' },
  { id: 'spam', label: 'Spam' },
  { id: 'autre', label: 'Autre' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['id'];

// ---------------------------------------------------------------------------
// Sourdine locale
// ---------------------------------------------------------------------------

function readMuted(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(MUTE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeMuted(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Deux cents entrées suffisent largement, et bornent ce qu'on stocke.
    window.localStorage.setItem(MUTE_KEY, JSON.stringify(ids.slice(-200)));
  } catch {
    /* stockage saturé : la sourdine ne survivra pas au rechargement */
  }
  window.dispatchEvent(new CustomEvent('mimic:muted-players-changed'));
}

export function mutedPlayerIds(): ReadonlySet<string> {
  return new Set(readMuted());
}

export function isPlayerMuted(playerId: string): boolean {
  return readMuted().includes(playerId);
}

export function mutePlayer(playerId: string): void {
  const current = readMuted();
  if (current.includes(playerId)) return;
  writeMuted([...current, playerId]);
}

export function unmutePlayer(playerId: string): void {
  const current = readMuted();
  if (!current.includes(playerId)) return;
  writeMuted(current.filter((id) => id !== playerId));
}

export function togglePlayerMute(playerId: string): boolean {
  if (isPlayerMuted(playerId)) {
    unmutePlayer(playerId);
    return false;
  }
  mutePlayer(playerId);
  return true;
}

/** S'abonne aux changements de sourdine, y compris depuis un autre onglet. */
export function onMutedPlayersChanged(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === MUTE_KEY) listener();
  };
  window.addEventListener('mimic:muted-players-changed', listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('mimic:muted-players-changed', listener);
    window.removeEventListener('storage', onStorage);
  };
}

// ---------------------------------------------------------------------------
// Signalement
// ---------------------------------------------------------------------------

export class ReportRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportRejected';
  }
}

/**
 * Envoie un signalement. Le serveur vérifie que l'auteur est bien assis dans le
 * salon, que la cible y est aussi, et n'accepte qu'un signalement par cible et
 * par salon.
 */
export async function reportLobbyPlayer(params: {
  lobbyId: string;
  targetPlayerId: string;
  reason: ReportReason;
  details?: string;
}): Promise<void> {
  const { lobbyId, targetPlayerId, reason, details } = params;
  const token = readLobbyToken(lobbyId);
  if (!token) {
    throw new ReportRejected(
      "Ta session de salon n'est plus reconnue. Recharge la page et réessaie.",
    );
  }

  const client = supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ error: { message: string; code?: string } | null }>;
  };

  const { error } = await client.rpc('report_lobby_player', {
    p_lobby_id: lobbyId,
    p_token: token,
    p_target_player_id: targetPlayerId,
    p_reason: reason,
    p_details: details?.slice(0, 500) ?? null,
  });

  if (!error) return;

  if (error.code === '54000') {
    throw new ReportRejected('Tu as déjà envoyé beaucoup de signalements. Réessaie plus tard.');
  }
  if (error.code === '42501') {
    throw new ReportRejected("Il faut être dans le salon pour signaler quelqu'un.");
  }
  if (error.code === '22023') {
    throw new ReportRejected("Ce joueur n'est plus dans le salon.");
  }
  throw new ReportRejected("Le signalement n'a pas pu être envoyé.");
}
