/**
 * Mode IMITATION — couverture complète.
 *
 * Quatre exigences produit sont vérifiées ici, sur les fonctions pures qui
 * décident réellement du comportement multijoueur :
 *  - synchro entre joueurs (réconciliation realtime + horloge serveur)
 *  - mécaniques (validation des données au passage SQL)
 *  - passage à la manche suivante (machine de phases)
 *  - reconnexion (état de transport, backoff, rejet des données périmées)
 */
import { describe, expect, it } from 'vitest';
import {
  GAME_PHASES,
  canCommitRoundSnapshot,
  getRenderableGamePhase,
  getRoundReconciliationMode,
  isAllowedGamePhaseTransition,
  isGamePhase,
  parseDurableGameRound,
  shouldInvalidateRoundRetry,
  type DurableGameRound,
  type GamePhase,
} from '@/lib/gameRoundState';
import {
  canCommitSyncToken,
  deriveConnectionState,
  equalJitterBackoff,
  type SnapshotState,
  type TransportState,
} from '@/lib/syncState';
import {
  canCommitVotingSession,
  estimatedServerNowMs,
  expectedPlaybackPositionMs,
  localPlaybackStartMs,
  parseVotingSessionSnapshot,
  type VotingSessionSnapshot,
} from '@/lib/votingSessionState';

// ── Fixtures ───────────────────────────────────────────────────────────────

const round = (overrides: Partial<DurableGameRound> = {}): DurableGameRound => ({
  id: 'round-1',
  lobby_id: 'lobby-1',
  current_challenge_id: 'clip-1',
  challenge_player_id: 'player-1',
  created_at: '2026-08-20T10:00:00.000Z',
  updated_at: '2026-08-20T10:00:00.000Z',
  version: 3,
  round_number: 2,
  phase: 'imitation',
  ...overrides,
});

const rawRound = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'round-1',
  lobby_id: 'lobby-1',
  current_challenge_id: 'clip-1',
  challenge_player_id: 'player-1',
  created_at: '2026-08-20T10:00:00.000Z',
  updated_at: '2026-08-20T10:00:00.000Z',
  version: 1,
  round_number: 1,
  phase: 'imitation',
  ...overrides,
});

const SESSION_GUARD = { lobbyId: 'lobby-1', roundNumber: 2 };

const rawSession = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  session_id: 'session-1',
  game_round_id: 'round-1',
  lobby_id: 'lobby-1',
  round_number: 2,
  current_imitation_index: 0,
  is_playing: false,
  playback_started_at: null,
  playback_position_ms: 0,
  version: 0,
  updated_at: '2026-08-20T10:00:00.000Z',
  server_now: '2026-08-20T10:00:01.000Z',
  ...overrides,
});

const snapshot = (overrides: Partial<VotingSessionSnapshot> = {}): VotingSessionSnapshot => ({
  id: 'session-1',
  gameRoundId: 'round-1',
  lobbyId: 'lobby-1',
  roundNumber: 2,
  currentIndex: 0,
  isPlaying: false,
  playbackStartedAt: null,
  playbackPositionMs: 0,
  version: 1,
  updatedAt: '2026-08-20T10:00:00.000Z',
  serverOffsetMs: 0,
  ...overrides,
});

// ── 1. Passage à la manche suivante : machine de phases ────────────────────

describe('imitation — machine de phases et passage de manche', () => {
  it('expose les quatre phases dans l’ordre du tour', () => {
    expect([...GAME_PHASES]).toEqual(['preview', 'imitation', 'voting', 'results']);
  });

  it('autorise preview -> imitation', () => {
    expect(isAllowedGamePhaseTransition('preview', 'imitation')).toBe(true);
  });

  it('autorise imitation -> voting', () => {
    expect(isAllowedGamePhaseTransition('imitation', 'voting')).toBe(true);
  });

  it('autorise voting -> results', () => {
    expect(isAllowedGamePhaseTransition('voting', 'results')).toBe(true);
  });

  it('refuse de sauter imitation entre preview et voting', () => {
    expect(isAllowedGamePhaseTransition('preview', 'voting')).toBe(false);
  });

  it('refuse de sauter voting entre imitation et results', () => {
    expect(isAllowedGamePhaseTransition('imitation', 'results')).toBe(false);
  });

  it('refuse tout retour en arrière de phase', () => {
    expect(isAllowedGamePhaseTransition('voting', 'imitation')).toBe(false);
    expect(isAllowedGamePhaseTransition('imitation', 'preview')).toBe(false);
    expect(isAllowedGamePhaseTransition('results', 'voting')).toBe(false);
  });

  it('traite results comme terminal : aucune transition sortante', () => {
    for (const phase of GAME_PHASES) {
      expect(isAllowedGamePhaseTransition('results', phase)).toBe(false);
    }
  });

  it('refuse une transition d’une phase vers elle-même', () => {
    for (const phase of GAME_PHASES) {
      expect(isAllowedGamePhaseTransition(phase, phase)).toBe(false);
    }
  });

  it('n’autorise qu’une seule phase suivante par phase', () => {
    for (const phase of GAME_PHASES) {
      const allowed = GAME_PHASES.filter((next) => isAllowedGamePhaseTransition(phase, next));
      expect(allowed.length).toBeLessThanOrEqual(1);
    }
  });

  it('permet d’enchaîner tout le tour de preview à results', () => {
    let current: GamePhase = 'preview';
    const path: GamePhase[] = [current];
    for (const next of GAME_PHASES) {
      if (isAllowedGamePhaseTransition(current, next)) {
        current = next;
        path.push(next);
      }
    }
    expect(path).toEqual(['preview', 'imitation', 'voting', 'results']);
  });

  it('reconnaît les phases valides', () => {
    for (const phase of GAME_PHASES) expect(isGamePhase(phase)).toBe(true);
  });

  it('rejette une phase inconnue venant du serveur', () => {
    expect(isGamePhase('lobby')).toBe(false);
    expect(isGamePhase('ended')).toBe(false);
  });

  it('rejette une phase non textuelle', () => {
    expect(isGamePhase(null)).toBe(false);
    expect(isGamePhase(undefined)).toBe(false);
    expect(isGamePhase(2)).toBe(false);
    expect(isGamePhase({})).toBe(false);
    expect(isGamePhase(['imitation'])).toBe(false);
  });

  it('rejette une phase à la casse différente', () => {
    expect(isGamePhase('Imitation')).toBe(false);
    expect(isGamePhase('VOTING')).toBe(false);
  });

  it('rejette une phase entourée d’espaces', () => {
    expect(isGamePhase(' imitation')).toBe(false);
    expect(isGamePhase('imitation ')).toBe(false);
  });
});

// ── 2. Mécaniques : validation au passage SQL ──────────────────────────────

describe('imitation — validation de la manche au passage SQL', () => {
  it('accepte une manche complète et normalise ses champs', () => {
    expect(parseDurableGameRound(rawRound())).toMatchObject({
      id: 'round-1',
      lobby_id: 'lobby-1',
      round_number: 1,
      phase: 'imitation',
      version: 1,
    });
  });

  it('rejette null et undefined', () => {
    expect(parseDurableGameRound(null)).toBeNull();
    expect(parseDurableGameRound(undefined)).toBeNull();
  });

  it('rejette une valeur primitive', () => {
    expect(parseDurableGameRound('round-1')).toBeNull();
    expect(parseDurableGameRound(42)).toBeNull();
    expect(parseDurableGameRound(true)).toBeNull();
  });

  it('rejette une manche sans id', () => {
    expect(parseDurableGameRound(rawRound({ id: undefined }))).toBeNull();
  });

  it('rejette un id non textuel', () => {
    expect(parseDurableGameRound(rawRound({ id: 7 }))).toBeNull();
  });

  it('rejette une manche sans lobby', () => {
    expect(parseDurableGameRound(rawRound({ lobby_id: null }))).toBeNull();
  });

  it('rejette une manche sans défi courant', () => {
    expect(parseDurableGameRound(rawRound({ current_challenge_id: null }))).toBeNull();
  });

  it('rejette une manche sans joueur de défi', () => {
    expect(parseDurableGameRound(rawRound({ challenge_player_id: null }))).toBeNull();
  });

  it('rejette une manche sans date de création', () => {
    expect(parseDurableGameRound(rawRound({ created_at: null }))).toBeNull();
  });

  it('rejette une phase invalide même si tout le reste est correct', () => {
    expect(parseDurableGameRound(rawRound({ phase: 'ended' }))).toBeNull();
  });

  it('rejette un numéro de manche à zéro', () => {
    expect(parseDurableGameRound(rawRound({ round_number: 0 }))).toBeNull();
  });

  it('rejette un numéro de manche négatif', () => {
    expect(parseDurableGameRound(rawRound({ round_number: -1 }))).toBeNull();
  });

  it('rejette un numéro de manche décimal', () => {
    expect(parseDurableGameRound(rawRound({ round_number: 1.5 }))).toBeNull();
  });

  it('rejette un numéro de manche textuel', () => {
    expect(parseDurableGameRound(rawRound({ round_number: '1' }))).toBeNull();
  });

  it('accepte la première manche', () => {
    expect(parseDurableGameRound(rawRound({ round_number: 1 }))?.round_number).toBe(1);
  });

  it('accepte une manche très avancée', () => {
    expect(parseDurableGameRound(rawRound({ round_number: 999 }))?.round_number).toBe(999);
  });

  it('accepte une version absente en la ramenant à null (schéma ancien)', () => {
    expect(parseDurableGameRound(rawRound({ version: undefined }))?.version).toBeNull();
  });

  it('accepte une version nulle en la conservant à null', () => {
    expect(parseDurableGameRound(rawRound({ version: null }))?.version).toBeNull();
  });

  it('accepte une version à zéro', () => {
    expect(parseDurableGameRound(rawRound({ version: 0 }))?.version).toBe(0);
  });

  it('rejette une version négative', () => {
    expect(parseDurableGameRound(rawRound({ version: -1 }))).toBeNull();
  });

  it('rejette une version décimale', () => {
    expect(parseDurableGameRound(rawRound({ version: 2.5 }))).toBeNull();
  });

  it('accepte updated_at absent en le ramenant à null', () => {
    expect(parseDurableGameRound(rawRound({ updated_at: undefined }))?.updated_at).toBeNull();
  });

  it('rejette un updated_at non textuel', () => {
    expect(parseDurableGameRound(rawRound({ updated_at: 123 }))).toBeNull();
  });

  it('ignore les colonnes inconnues ajoutées par le serveur', () => {
    const parsed = parseDurableGameRound(rawRound({ colonne_future: 'x' }));
    expect(parsed).not.toBeNull();
    expect(parsed as unknown as Record<string, unknown>).not.toHaveProperty('colonne_future');
  });

  it('accepte chacune des quatre phases', () => {
    for (const phase of GAME_PHASES) {
      expect(parseDurableGameRound(rawRound({ phase }))?.phase).toBe(phase);
    }
  });
});

// ── 3. Synchro entre joueurs : réconciliation realtime ─────────────────────

describe('imitation — réconciliation realtime entre joueurs', () => {
  it('invalide quand aucune manche n’est encore chargée', () => {
    expect(getRoundReconciliationMode(null, { roundNumber: 1 })).toBe('invalidate');
  });

  it('ignore un signal d’une manche précédente', () => {
    expect(getRoundReconciliationMode(round({ round_number: 3 }), { roundNumber: 2 })).toBe('ignore');
  });

  it('ignore un signal très en retard', () => {
    expect(getRoundReconciliationMode(round({ round_number: 10 }), { roundNumber: 1 })).toBe('ignore');
  });

  it('invalide quand une manche plus récente arrive', () => {
    expect(getRoundReconciliationMode(round({ round_number: 2 }), { roundNumber: 3 })).toBe('invalidate');
  });

  it('invalide dès qu’une manche saute plusieurs numéros', () => {
    expect(getRoundReconciliationMode(round({ round_number: 2 }), { roundNumber: 9 })).toBe('invalidate');
  });

  it('réconcilie en arrière-plan un signal identique', () => {
    expect(getRoundReconciliationMode(round(), { roundNumber: 2 })).toBe('background');
  });

  it('invalide quand l’identifiant de manche diffère à numéro égal', () => {
    expect(
      getRoundReconciliationMode(round(), { roundNumber: 2, roundId: 'autre-round' }),
    ).toBe('invalidate');
  });

  it('réconcilie en arrière-plan quand l’identifiant de manche correspond', () => {
    expect(getRoundReconciliationMode(round(), { roundNumber: 2, roundId: 'round-1' })).toBe('background');
  });

  it('invalide quand la phase avance (imitation -> voting)', () => {
    expect(
      getRoundReconciliationMode(round({ phase: 'imitation' }), { roundNumber: 2, phase: 'voting' }),
    ).toBe('invalidate');
  });

  it('invalide quand la phase avance vers results', () => {
    expect(
      getRoundReconciliationMode(round({ phase: 'voting' }), { roundNumber: 2, phase: 'results' }),
    ).toBe('invalidate');
  });

  it('invalide même quand la phase saute une étape', () => {
    expect(
      getRoundReconciliationMode(round({ phase: 'preview' }), { roundNumber: 2, phase: 'results' }),
    ).toBe('invalidate');
  });

  it('préserve l’état local quand un signal de phase est en retard', () => {
    expect(
      getRoundReconciliationMode(round({ phase: 'voting' }), { roundNumber: 2, phase: 'imitation' }),
    ).toBe('background');
  });

  it('préserve l’état local sur un signal de phase très en retard', () => {
    expect(
      getRoundReconciliationMode(round({ phase: 'results' }), { roundNumber: 2, phase: 'preview' }),
    ).toBe('background');
  });

  it('réconcilie en arrière-plan quand la phase est identique', () => {
    expect(
      getRoundReconciliationMode(round({ phase: 'voting' }), { roundNumber: 2, phase: 'voting' }),
    ).toBe('background');
  });

  it('invalide quand le défi courant change à phase et manche égales', () => {
    expect(
      getRoundReconciliationMode(round(), { roundNumber: 2, challengeId: 'autre-clip' }),
    ).toBe('invalidate');
  });

  it('réconcilie en arrière-plan quand le défi courant correspond', () => {
    expect(
      getRoundReconciliationMode(round(), { roundNumber: 2, challengeId: 'clip-1' }),
    ).toBe('background');
  });

  it('donne la priorité au changement de manche sur le changement de phase', () => {
    expect(
      getRoundReconciliationMode(round({ round_number: 5 }), { roundNumber: 1, phase: 'results' }),
    ).toBe('ignore');
  });

  it('donne la priorité à l’identifiant de manche sur la phase en retard', () => {
    expect(
      getRoundReconciliationMode(round({ phase: 'results' }), {
        roundNumber: 2,
        roundId: 'autre',
        phase: 'preview',
      }),
    ).toBe('invalidate');
  });

  it('reste en arrière-plan quand tous les indices concordent', () => {
    expect(
      getRoundReconciliationMode(round(), {
        roundNumber: 2,
        roundId: 'round-1',
        phase: 'imitation',
        challengeId: 'clip-1',
      }),
    ).toBe('background');
  });

  it('ne renvoie jamais autre chose que les trois modes connus', () => {
    const modes = new Set(
      GAME_PHASES.map((phase) => getRoundReconciliationMode(round(), { roundNumber: 2, phase })),
    );
    for (const mode of modes) {
      expect(['ignore', 'background', 'invalidate']).toContain(mode);
    }
  });
});

// ── 4. Reconnexion : rejet des résultats périmés ───────────────────────────

describe('imitation — rejet des snapshots périmés après reconnexion', () => {
  const token = { requestId: 5, channelEpoch: 2 };

  it('accepte un snapshot demandé dans l’époque courante', () => {
    expect(canCommitRoundSnapshot(token, 5, 2, true)).toBe(true);
  });

  it('refuse un snapshot si le canal n’est plus abonné', () => {
    expect(canCommitRoundSnapshot(token, 5, 2, false)).toBe(false);
  });

  it('refuse un snapshot d’une requête dépassée', () => {
    expect(canCommitRoundSnapshot(token, 6, 2, true)).toBe(false);
  });

  it('refuse un snapshot d’une époque d’abonnement précédente', () => {
    expect(canCommitRoundSnapshot(token, 5, 3, true)).toBe(false);
  });

  it('refuse un snapshot dont la requête et l’époque sont dépassées', () => {
    expect(canCommitRoundSnapshot(token, 9, 9, true)).toBe(false);
  });

  it('refuse un snapshot arrivé après une reconnexion, même à requête égale', () => {
    expect(canCommitRoundSnapshot({ requestId: 5, channelEpoch: 1 }, 5, 2, true)).toBe(false);
  });

  it('demande une nouvelle tentative quand l’appelant l’exige', () => {
    expect(shouldInvalidateRoundRetry(true, true, true)).toBe(true);
  });

  it('demande une nouvelle tentative quand la synchro est perdue', () => {
    expect(shouldInvalidateRoundRetry(false, false, true)).toBe(true);
  });

  it('demande une nouvelle tentative quand le canal est tombé', () => {
    expect(shouldInvalidateRoundRetry(false, true, false)).toBe(true);
  });

  it('ne redemande rien quand tout est sain', () => {
    expect(shouldInvalidateRoundRetry(false, true, true)).toBe(false);
  });

  it('cumule les raisons sans en perdre une', () => {
    expect(shouldInvalidateRoundRetry(true, false, false)).toBe(true);
  });

  it('n’affiche aucune phase quand la synchro n’est pas acquise', () => {
    expect(getRenderableGamePhase(round(), false)).toBeNull();
  });

  it('n’affiche aucune phase sans manche chargée', () => {
    expect(getRenderableGamePhase(null, true)).toBeNull();
  });

  it('n’affiche aucune phase quand rien n’est disponible', () => {
    expect(getRenderableGamePhase(null, false)).toBeNull();
  });

  it('affiche la phase courante quand la manche est synchronisée', () => {
    expect(getRenderableGamePhase(round({ phase: 'voting' }), true)).toBe('voting');
  });

  it('affiche chaque phase dès lors qu’elle est synchronisée', () => {
    for (const phase of GAME_PHASES) {
      expect(getRenderableGamePhase(round({ phase }), true)).toBe(phase);
    }
  });
});

// ── 5. Reconnexion : état de connexion et backoff ──────────────────────────

describe('imitation — état de connexion et reprise', () => {
  it('reste hors ligne quand le transport est coupé, quel que soit le snapshot', () => {
    const snapshots: SnapshotState[] = ['idle', 'syncing', 'synchronized', 'error'];
    for (const state of snapshots) {
      expect(deriveConnectionState('offline', state)).toBe('offline');
    }
  });

  it('passe en ligne seulement si transport connecté et snapshot synchronisé', () => {
    expect(deriveConnectionState('connected', 'synchronized')).toBe('online');
  });

  it('reste en reconnexion tant que le snapshot n’est pas synchronisé', () => {
    expect(deriveConnectionState('connected', 'syncing')).toBe('reconnecting');
    expect(deriveConnectionState('connected', 'idle')).toBe('reconnecting');
    expect(deriveConnectionState('connected', 'error')).toBe('reconnecting');
  });

  it('reste en reconnexion pendant l’établissement du transport', () => {
    const snapshots: SnapshotState[] = ['idle', 'syncing', 'synchronized', 'error'];
    for (const state of snapshots) {
      expect(deriveConnectionState('connecting', state)).toBe('reconnecting');
    }
  });

  it('ne déclare jamais « en ligne » sur une erreur de snapshot', () => {
    const transports: TransportState[] = ['offline', 'connecting', 'connected'];
    for (const transport of transports) {
      expect(deriveConnectionState(transport, 'error')).not.toBe('online');
    }
  });

  it('accepte un jeton de la génération et de la requête courantes', () => {
    expect(canCommitSyncToken({ generation: 2, requestId: 7 }, 2, 7)).toBe(true);
  });

  it('refuse un jeton d’une génération d’abonnement précédente', () => {
    expect(canCommitSyncToken({ generation: 1, requestId: 7 }, 2, 7)).toBe(false);
  });

  it('refuse un jeton d’une requête dépassée', () => {
    expect(canCommitSyncToken({ generation: 2, requestId: 6 }, 2, 7)).toBe(false);
  });

  it('refuse un jeton entièrement périmé', () => {
    expect(canCommitSyncToken({ generation: 1, requestId: 1 }, 3, 9)).toBe(false);
  });

  it('reste dans la fenêtre attendue avec un aléa nul', () => {
    expect(equalJitterBackoff(0, 1_000, 15_000, () => 0)).toBe(500);
  });

  it('atteint le plafond de la tentative avec un aléa maximal', () => {
    expect(equalJitterBackoff(0, 1_000, 15_000, () => 1)).toBe(1_000);
  });

  it('double l’attente à chaque tentative', () => {
    expect(equalJitterBackoff(1, 1_000, 15_000, () => 1)).toBe(2_000);
    expect(equalJitterBackoff(2, 1_000, 15_000, () => 1)).toBe(4_000);
    expect(equalJitterBackoff(3, 1_000, 15_000, () => 1)).toBe(8_000);
  });

  it('ne dépasse jamais le plafond maximal', () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect(equalJitterBackoff(attempt, 1_000, 15_000, () => 1)).toBeLessThanOrEqual(15_000);
    }
  });

  it('garde au moins la moitié du plafond comme délai minimal', () => {
    expect(equalJitterBackoff(10, 1_000, 15_000, () => 0)).toBe(7_500);
  });

  it('traite une tentative négative comme la première', () => {
    expect(equalJitterBackoff(-5, 1_000, 15_000, () => 1)).toBe(1_000);
  });

  it('tronque une tentative décimale', () => {
    expect(equalJitterBackoff(1.9, 1_000, 15_000, () => 1)).toBe(2_000);
  });

  it('borne un aléa hors intervalle sans produire de délai négatif', () => {
    expect(equalJitterBackoff(0, 1_000, 15_000, () => -3)).toBe(500);
    expect(equalJitterBackoff(0, 1_000, 15_000, () => 4)).toBe(1_000);
  });

  it('produit toujours un entier positif', () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const delay = equalJitterBackoff(attempt, 1_000, 15_000, () => 0.37);
      expect(Number.isInteger(delay)).toBe(true);
      expect(delay).toBeGreaterThan(0);
    }
  });

  it('ne renvoie jamais deux joueurs au même instant exact sur des aléas différents', () => {
    const a = equalJitterBackoff(3, 1_000, 15_000, () => 0.1);
    const b = equalJitterBackoff(3, 1_000, 15_000, () => 0.9);
    expect(a).not.toBe(b);
  });
});

// ── 6. Synchro de lecture : session de vote ────────────────────────────────

describe('imitation — session de vote partagée', () => {
  it('accepte une session valide et calcule le décalage serveur', () => {
    const parsed = parseVotingSessionSnapshot(rawSession(), SESSION_GUARD, 0, 1_000);
    expect(parsed).not.toBeNull();
    expect(parsed?.id).toBe('session-1');
  });

  it('rejette une session d’un autre lobby', () => {
    expect(
      parseVotingSessionSnapshot(rawSession({ lobby_id: 'autre' }), SESSION_GUARD, 0, 10),
    ).toBeNull();
  });

  it('rejette une session d’une autre manche', () => {
    expect(
      parseVotingSessionSnapshot(rawSession({ round_number: 3 }), SESSION_GUARD, 0, 10),
    ).toBeNull();
  });

  it('rejette une session sans identifiant', () => {
    expect(
      parseVotingSessionSnapshot(rawSession({ session_id: null }), SESSION_GUARD, 0, 10),
    ).toBeNull();
  });

  it('rejette null', () => {
    expect(parseVotingSessionSnapshot(null, SESSION_GUARD, 0, 10)).toBeNull();
  });

  it('rejette un index de lecture négatif', () => {
    expect(
      parseVotingSessionSnapshot(rawSession({ current_imitation_index: -1 }), SESSION_GUARD, 0, 10),
    ).toBeNull();
  });

  it('rejette un index de lecture décimal', () => {
    expect(
      parseVotingSessionSnapshot(rawSession({ current_imitation_index: 1.5 }), SESSION_GUARD, 0, 10),
    ).toBeNull();
  });

  it('accepte un index de lecture à zéro', () => {
    expect(
      parseVotingSessionSnapshot(rawSession({ current_imitation_index: 0 }), SESSION_GUARD, 0, 10)
        ?.currentIndex,
    ).toBe(0);
  });

  it('accepte un index de lecture avancé', () => {
    expect(
      parseVotingSessionSnapshot(rawSession({ current_imitation_index: 7 }), SESSION_GUARD, 0, 10)
        ?.currentIndex,
    ).toBe(7);
  });

  it('rejette un drapeau de lecture non booléen', () => {
    expect(
      parseVotingSessionSnapshot(rawSession({ is_playing: 'true' }), SESSION_GUARD, 0, 10),
    ).toBeNull();
  });

  it('rejette une position de lecture négative', () => {
    expect(
      parseVotingSessionSnapshot(rawSession({ playback_position_ms: -1 }), SESSION_GUARD, 0, 10),
    ).toBeNull();
  });

  it('rejette une version négative', () => {
    expect(
      parseVotingSessionSnapshot(rawSession({ version: -2 }), SESSION_GUARD, 0, 10),
    ).toBeNull();
  });

  it('rejette une horloge serveur absente', () => {
    expect(
      parseVotingSessionSnapshot(rawSession({ server_now: null }), SESSION_GUARD, 0, 10),
    ).toBeNull();
  });

  it('rejette une horloge serveur illisible', () => {
    expect(
      parseVotingSessionSnapshot(rawSession({ server_now: 'pas-une-date' }), SESSION_GUARD, 0, 10),
    ).toBeNull();
  });

  it('rejette une lecture active sans ancre temporelle', () => {
    expect(
      parseVotingSessionSnapshot(
        rawSession({ is_playing: true, playback_started_at: null }),
        SESSION_GUARD,
        0,
        10,
      ),
    ).toBeNull();
  });

  it('rejette une lecture active avec une ancre illisible', () => {
    expect(
      parseVotingSessionSnapshot(
        rawSession({ is_playing: true, playback_started_at: 'bientôt' }),
        SESSION_GUARD,
        0,
        10,
      ),
    ).toBeNull();
  });

  it('accepte une lecture active avec une ancre valide', () => {
    const parsed = parseVotingSessionSnapshot(
      rawSession({ is_playing: true, playback_started_at: '2026-08-20T10:00:02.000Z' }),
      SESSION_GUARD,
      0,
      10,
    );
    expect(parsed?.isPlaying).toBe(true);
    expect(parsed?.playbackStartedAt).toBe('2026-08-20T10:00:02.000Z');
  });

  it('accepte une session sans manche durable associée', () => {
    expect(
      parseVotingSessionSnapshot(rawSession({ game_round_id: null }), SESSION_GUARD, 0, 10)
        ?.gameRoundId,
    ).toBeNull();
  });

  it('rejette une session rattachée à une autre manche durable', () => {
    expect(
      parseVotingSessionSnapshot(rawSession(), { ...SESSION_GUARD, gameRoundId: 'round-9' }, 0, 10),
    ).toBeNull();
  });

  it('accepte une session dont la manche durable correspond au garde', () => {
    expect(
      parseVotingSessionSnapshot(rawSession(), { ...SESSION_GUARD, gameRoundId: 'round-1' }, 0, 10)
        ?.gameRoundId,
    ).toBe('round-1');
  });

  it('estime le décalage serveur au milieu de l’aller-retour', () => {
    // Requête à 0, réponse à 1000 -> milieu 500. Serveur annoncé à 1000.
    const parsed = parseVotingSessionSnapshot(
      rawSession({ server_now: new Date(1_000).toISOString() }),
      SESSION_GUARD,
      0,
      1_000,
    );
    expect(parsed?.serverOffsetMs).toBe(500);
  });

  it('produit un décalage négatif quand le client est en avance', () => {
    const parsed = parseVotingSessionSnapshot(
      rawSession({ server_now: new Date(0).toISOString() }),
      SESSION_GUARD,
      1_000,
      1_000,
    );
    expect(parsed?.serverOffsetMs).toBe(-1_000);
  });
});

// ── 7. Synchro de lecture : position partagée entre joueurs ────────────────

describe('imitation — position de lecture identique chez tous les joueurs', () => {
  it('garde la position enregistrée quand la lecture est en pause', () => {
    expect(expectedPlaybackPositionMs(snapshot({ playbackPositionMs: 4_200 }))).toBe(4_200);
  });

  it('garde la position en pause même si une ancre traîne', () => {
    expect(
      expectedPlaybackPositionMs(
        snapshot({ playbackPositionMs: 900, playbackStartedAt: '2026-08-20T10:00:00.000Z' }),
      ),
    ).toBe(900);
  });

  it('renvoie zéro pour une session neuve en pause', () => {
    expect(expectedPlaybackPositionMs(snapshot())).toBe(0);
  });

  it('ajoute le temps écoulé depuis l’ancre pendant la lecture', () => {
    const started = new Date(10_000).toISOString();
    const state = snapshot({ isPlaying: true, playbackStartedAt: started, playbackPositionMs: 1_000 });
    expect(expectedPlaybackPositionMs(state, 12_000)).toBe(3_000);
  });

  it('n’avance pas avant l’instant d’ancre (compte à rebours)', () => {
    const started = new Date(20_000).toISOString();
    const state = snapshot({ isPlaying: true, playbackStartedAt: started, playbackPositionMs: 500 });
    expect(expectedPlaybackPositionMs(state, 15_000)).toBe(500);
  });

  it('démarre exactement à la position enregistrée au moment de l’ancre', () => {
    const started = new Date(20_000).toISOString();
    const state = snapshot({ isPlaying: true, playbackStartedAt: started, playbackPositionMs: 250 });
    expect(expectedPlaybackPositionMs(state, 20_000)).toBe(250);
  });

  it('cumule la position après une pause puis une reprise', () => {
    const started = new Date(50_000).toISOString();
    const state = snapshot({ isPlaying: true, playbackStartedAt: started, playbackPositionMs: 8_000 });
    expect(expectedPlaybackPositionMs(state, 53_500)).toBe(11_500);
  });

  it('donne la même position à deux joueurs dont les horloges diffèrent', () => {
    const started = new Date(100_000).toISOString();
    const base = { isPlaying: true, playbackStartedAt: started, playbackPositionMs: 0 };
    // Joueur A en avance de 3 s, joueur B en retard de 2 s : même heure serveur.
    const a = snapshot({ ...base, serverOffsetMs: -3_000 });
    const b = snapshot({ ...base, serverOffsetMs: 2_000 });
    const positionA = expectedPlaybackPositionMs(a, estimatedServerNowMs(a, 105_000));
    const positionB = expectedPlaybackPositionMs(b, estimatedServerNowMs(b, 100_000));
    expect(positionA).toBe(2_000);
    expect(positionB).toBe(2_000);
    expect(positionA).toBe(positionB);
  });

  it('estime l’heure serveur en ajoutant le décalage mesuré', () => {
    expect(estimatedServerNowMs(snapshot({ serverOffsetMs: 750 }), 1_000)).toBe(1_750);
  });

  it('estime l’heure serveur avec un décalage négatif', () => {
    expect(estimatedServerNowMs(snapshot({ serverOffsetMs: -400 }), 1_000)).toBe(600);
  });

  it('n’altère pas l’heure quand le décalage est nul', () => {
    expect(estimatedServerNowMs(snapshot({ serverOffsetMs: 0 }), 4_242)).toBe(4_242);
  });

  it('ne renvoie aucun instant local sans ancre serveur', () => {
    expect(localPlaybackStartMs(snapshot())).toBeNull();
  });

  it('convertit l’ancre serveur en instant local', () => {
    const state = snapshot({ playbackStartedAt: new Date(10_000).toISOString(), serverOffsetMs: 1_500 });
    expect(localPlaybackStartMs(state)).toBe(8_500);
  });

  it('convertit l’ancre serveur avec un décalage négatif', () => {
    const state = snapshot({ playbackStartedAt: new Date(10_000).toISOString(), serverOffsetMs: -2_000 });
    expect(localPlaybackStartMs(state)).toBe(12_000);
  });

  it('rend l’ancre locale cohérente avec l’heure serveur estimée', () => {
    const state = snapshot({ playbackStartedAt: new Date(30_000).toISOString(), serverOffsetMs: 900 });
    const localStart = localPlaybackStartMs(state) as number;
    expect(estimatedServerNowMs(state, localStart)).toBe(30_000);
  });
});

// ── 8. Reconnexion : commit de la session de vote ──────────────────────────

describe('imitation — commit de la session de vote après reconnexion', () => {
  const token = { generation: 4, requestId: 11, channelEpoch: 3 };

  it('accepte un commit entièrement à jour', () => {
    expect(canCommitVotingSession(token, 4, 11, 3, true)).toBe(true);
  });

  it('refuse un commit si le canal n’est pas abonné', () => {
    expect(canCommitVotingSession(token, 4, 11, 3, false)).toBe(false);
  });

  it('refuse un commit d’une époque de canal dépassée', () => {
    expect(canCommitVotingSession(token, 4, 11, 4, true)).toBe(false);
  });

  it('refuse un commit d’une génération dépassée', () => {
    expect(canCommitVotingSession(token, 5, 11, 3, true)).toBe(false);
  });

  it('refuse un commit d’une requête dépassée', () => {
    expect(canCommitVotingSession(token, 4, 12, 3, true)).toBe(false);
  });

  it('refuse un commit totalement périmé', () => {
    expect(canCommitVotingSession(token, 9, 99, 9, true)).toBe(false);
  });

  it('exige l’abonnement même quand tout le reste concorde', () => {
    expect(canCommitVotingSession({ generation: 1, requestId: 1, channelEpoch: 1 }, 1, 1, 1, false))
      .toBe(false);
  });

  it('accepte une session neuve à compteurs zéro', () => {
    expect(canCommitVotingSession({ generation: 0, requestId: 0, channelEpoch: 0 }, 0, 0, 0, true))
      .toBe(true);
  });
});
