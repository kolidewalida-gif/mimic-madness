/**
 * Jeton de siège : l'identité du joueur dans un salon.
 *
 * Le jeu se joue sans compte, et les connexions anonymes Supabase sont
 * désactivées sur ce projet : un invité n'a donc aucun JWT à opposer au serveur.
 * Tant que `lobby_players` acceptait les écritures directes, `player_id` n'était
 * qu'une chaîne déclarative — n'importe qui pouvait s'asseoir sous le nom d'un
 * autre, ou supprimer sa ligne pour l'éjecter de la partie.
 *
 * La table est maintenant en lecture seule. À l'entrée dans un salon, le serveur
 * délivre un jeton aléatoire de 32 octets dont il ne conserve que l'empreinte
 * SHA-256, dans une table que le navigateur ne peut pas lire. Ce module garde le
 * jeton et le présente à chaque action qui touche un siège : partir, exclure,
 * passer la main, signaler sa présence.
 *
 * Le jeton vit dans `localStorage` pour survivre à un rechargement de page, qui
 * est le cas normal d'une reconnexion. Perdre le jeton n'enferme personne : un
 * siège déconnecté redevient réclamable, et le ménage serveur retire de toute
 * façon les sièges abandonnés au bout d'une minute.
 */
import { supabase } from '@/integrations/supabase/client';

const TOKEN_PREFIX = 'mimic-lobby-token:';

/*
 * Ces fonctions ont été ajoutées par la migration
 * `20260825102000_prove_lobby_player_identity` et ne figurent pas encore dans
 * `integrations/supabase/types.ts`, généré par le pipeline Lovable et qu'on ne
 * modifie pas à la main. Le contournement reste nommé et limité à cette liste,
 * plutôt qu'un `as never` dispersé sur les appels.
 */
type SeatRpc =
  | 'claim_lobby_seat'
  | 'touch_lobby_seat'
  | 'release_lobby_seat'
  | 'kick_lobby_player'
  | 'transfer_lobby_host'
  | 'prune_lobby_players'
  | 'mark_stale_lobby_seats';

const callSeatRpc = async <T>(
  name: SeatRpc,
  params: Record<string, unknown>,
): Promise<{ data: T | null; error: { message: string; code?: string } | null }> => {
  const client = supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
  };
  const { data, error } = await client.rpc(name, params);
  return { data: (data ?? null) as T | null, error };
};

const storageKey = (lobbyId: string) => `${TOKEN_PREFIX}${lobbyId}`;

/** Jeton connu pour ce salon, ou `null`. */
export function readLobbyToken(lobbyId: string | null | undefined): string | null {
  if (!lobbyId || typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(storageKey(lobbyId));
  } catch {
    return null;
  }
}

function writeLobbyToken(lobbyId: string, token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(lobbyId), token);
  } catch {
    /* Navigation privée saturée : on continue sans persistance. */
  }
}

export function forgetLobbyToken(lobbyId: string | null | undefined): void {
  if (!lobbyId || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(lobbyId));
  } catch {
    /* ignoré */
  }
}

/** Retire les jetons des salons quittés, pour ne pas les accumuler. */
export function forgetAllLobbyTokensExcept(lobbyId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const keep = lobbyId ? storageKey(lobbyId) : null;
    const doomed: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith(TOKEN_PREFIX) && key !== keep) doomed.push(key);
    }
    doomed.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* ignoré */
  }
}

export class SeatUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeatUnavailableError';
  }
}

export class LobbyFullError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LobbyFullError';
  }
}

/**
 * Prend un siège, ou le reprend après une coupure, et mémorise le jeton reçu.
 *
 * Le jeton connu est renvoyé au serveur : c'est ce qui distingue un joueur qui
 * revient d'un inconnu qui tente d'occuper sa place pendant qu'il joue.
 */
export async function claimLobbySeat(params: {
  lobbyId: string;
  playerId: string;
  playerName: string;
  isHost?: boolean;
}): Promise<string> {
  const { lobbyId, playerId, playerName, isHost = false } = params;
  const { data, error } = await callSeatRpc<string>('claim_lobby_seat', {
    p_lobby_id: lobbyId,
    p_player_id: playerId,
    p_player_name: playerName,
    p_is_host: isHost,
    p_token: readLobbyToken(lobbyId),
  });

  if (error) {
    if (error.code === '53400') {
      throw new LobbyFullError('Ce salon est complet.');
    }
    if (error.code === '42501') {
      throw new SeatUnavailableError(
        "Cette place est déjà tenue par une session active, ou l'identité appartient à un compte.",
      );
    }
    throw new Error(error.message);
  }

  if (!data) throw new Error('claim_lobby_seat: aucun jeton renvoyé');

  writeLobbyToken(lobbyId, data);
  return data;
}

/** Signale que le siège est toujours tenu, ou qu'il vient de se libérer. */
export async function touchLobbySeat(lobbyId: string, connected: boolean): Promise<boolean> {
  const token = readLobbyToken(lobbyId);
  if (!token) return false;
  const { data, error } = await callSeatRpc<boolean>('touch_lobby_seat', {
    p_lobby_id: lobbyId,
    p_token: token,
    p_connected: connected,
  });
  if (error) return false;
  return data === true;
}

/** Quitte le salon. Sans jeton, on part quand même : le ménage suivra. */
export async function releaseLobbySeat(lobbyId: string): Promise<boolean> {
  const token = readLobbyToken(lobbyId);
  forgetLobbyToken(lobbyId);
  if (!token) return false;
  const { data, error } = await callSeatRpc<boolean>('release_lobby_seat', {
    p_lobby_id: lobbyId,
    p_token: token,
  });
  if (error) return false;
  return data === true;
}

/** Exclut un joueur. Le serveur n'obéit qu'à l'hôte du salon ou à un admin. */
export async function kickLobbyPlayer(lobbyId: string, targetPlayerId: string): Promise<boolean> {
  const { data, error } = await callSeatRpc<boolean>('kick_lobby_player', {
    p_lobby_id: lobbyId,
    p_token: readLobbyToken(lobbyId),
    p_target_player_id: targetPlayerId,
  });
  if (error) return false;
  return data === true;
}

/**
 * Passe la main. Accepté si l'appelant est l'hôte, ou si l'hôte a disparu —
 * c'est le cas de la reprise automatique quand l'hôte perd sa connexion.
 */
export async function transferLobbyHost(lobbyId: string, newHostId: string): Promise<boolean> {
  const { data, error } = await callSeatRpc<boolean>('transfer_lobby_host', {
    p_lobby_id: lobbyId,
    p_token: readLobbyToken(lobbyId),
    p_new_host_id: newHostId,
  });
  if (error) return false;
  return data === true;
}

/** Retire les sièges déconnectés depuis plus d'une minute. Aucun jeton requis. */
export async function pruneLobbyPlayers(lobbyId: string): Promise<number> {
  const { data, error } = await callSeatRpc<number>('prune_lobby_players', {
    p_lobby_id: lobbyId,
  });
  if (error) return 0;
  return typeof data === 'number' ? data : 0;
}

/**
 * Marque déconnectés les sièges dont le battement de cœur s'est tu.
 *
 * La détection d'absence reposait sur la présence Realtime : le premier client
 * qui voyait un socket disparaître écrivait l'état de ce joueur en base. La
 * fonction employée acceptait n'importe quel `player_id`, donc marquer un
 * adversaire bien présent comme absent était à la portée d'une requête — et le
 * ménage l'expulsait une minute plus tard. Ici la condition est purement
 * temporelle : seul un silence de plus de vingt secondes compte, et un joueur
 * présent bat toutes les quinze. Appeler cette fonction ne donne donc aucune
 * prise sur les autres, ce qui permet de la laisser à tous les clients et de
 * garder une détection rapide.
 */
export async function markStaleLobbySeats(lobbyId: string): Promise<number> {
  const { data, error } = await callSeatRpc<number>('mark_stale_lobby_seats', {
    p_lobby_id: lobbyId,
  });
  if (error) return 0;
  return typeof data === 'number' ? data : 0;
}
