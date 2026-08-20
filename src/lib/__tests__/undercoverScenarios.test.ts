/**
 * Mode UNDERCOVER — scénarios de partie complète.
 *
 * Complète `undercoverLogic.test.ts` (règles unitaires) en enchaînant les
 * fonctions comme le fait une vraie partie :
 *  - mécaniques : distribution des rôles selon l'effectif
 *  - passage au tour suivant : ordre de parole, éliminations, fin de manche
 *  - synchro entre joueurs : mêmes verdicts pour un même instantané
 *  - reconnexion : état entièrement recalculable depuis les lignes SQL
 */
import { describe, expect, it } from 'vitest';
import {
  canSubmitClue,
  canVote,
  clampUndercover,
  computeAliveOrder,
  computeMatchWinner,
  computeMaxUndercover,
  computeNextTurnIndex,
  computeRoundWinner,
  distributeRoles,
  isValidWordPair,
  resolveVotes,
  shouldConcludeMatch,
  type UndercoverPlayerLite,
  type UndercoverRole,
} from '@/lib/undercoverLogic';

const ids = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => `j${i + 1}`);

const player = (
  id: string,
  role: UndercoverRole,
  isAlive = true,
  voteTarget: string | null = null,
): UndercoverPlayerLite => ({
  player_id: id,
  role,
  is_alive: isAlive,
  vote_target: voteTarget,
});

/** Reconstitue les vivants sous la forme attendue par computeRoundWinner. */
const alive = (players: UndercoverPlayerLite[]) =>
  players.filter((p) => p.is_alive).map((p) => ({ role: p.role }));

// ── 1. Mise en place selon l'effectif ──────────────────────────────────────

describe('undercover — mise en place selon l’effectif', () => {
  it('distribue les rôles à trois joueurs sans Mr White', () => {
    const order = ids(3);
    const { roles } = distributeRoles(order, 1, false, 'chat', 'chien');
    expect(Object.values(roles).filter((r) => r === 'undercover')).toHaveLength(1);
    expect(Object.values(roles).filter((r) => r === 'civilian')).toHaveLength(2);
  });

  it('donne le mot civil aux civils', () => {
    const order = ids(4);
    const { roles, words } = distributeRoles(order, 1, false, 'chat', 'chien');
    for (const id of order) {
      if (roles[id] === 'civilian') expect(words[id]).toBe('chat');
    }
  });

  it('donne le mot infiltré aux undercovers', () => {
    const order = ids(4);
    const { roles, words } = distributeRoles(order, 1, false, 'chat', 'chien');
    for (const id of order) {
      if (roles[id] === 'undercover') expect(words[id]).toBe('chien');
    }
  });

  it('ne donne aucun mot à Mr White', () => {
    const order = ids(5);
    const { roles, words } = distributeRoles(order, 1, true, 'chat', 'chien');
    const mrWhite = order.find((id) => roles[id] === 'mr_white');
    expect(mrWhite).toBeDefined();
    expect(words[mrWhite as string]).toBeNull();
  });

  it('n’ajoute pas Mr White sous quatre joueurs', () => {
    const { roles } = distributeRoles(ids(3), 1, true, 'chat', 'chien');
    expect(Object.values(roles)).not.toContain('mr_white');
  });

  it('attribue un rôle à chaque joueur', () => {
    for (const count of [3, 4, 5, 6, 8, 10]) {
      const order = ids(count);
      const { roles } = distributeRoles(order, 1, true, 'chat', 'chien');
      expect(Object.keys(roles)).toHaveLength(count);
    }
  });

  it('attribue une entrée de mot à chaque joueur', () => {
    const order = ids(6);
    const { words } = distributeRoles(order, 2, true, 'chat', 'chien');
    expect(Object.keys(words)).toHaveLength(6);
  });

  it('respecte le nombre d’undercovers demandé', () => {
    const order = ids(8);
    const { roles } = distributeRoles(order, 3, false, 'chat', 'chien');
    expect(Object.values(roles).filter((r) => r === 'undercover')).toHaveLength(3);
  });

  it('garde au moins deux civils avec le plafond calculé', () => {
    for (const count of [4, 5, 6, 7, 8]) {
      const max = computeMaxUndercover(count, false);
      const { roles } = distributeRoles(ids(count), max, false, 'chat', 'chien');
      expect(Object.values(roles).filter((r) => r === 'civilian').length)
        .toBeGreaterThanOrEqual(2);
    }
  });

  it('garde au moins deux civils avec Mr White activé', () => {
    for (const count of [5, 6, 7, 8]) {
      const max = computeMaxUndercover(count, true);
      const { roles } = distributeRoles(ids(count), max, true, 'chat', 'chien');
      expect(Object.values(roles).filter((r) => r === 'civilian').length)
        .toBeGreaterThanOrEqual(2);
    }
  });

  it('borne une demande excessive d’undercovers', () => {
    expect(clampUndercover(99, 5, false)).toBeLessThanOrEqual(3);
  });

  it('garantit au moins un undercover', () => {
    expect(clampUndercover(0, 5, false)).toBeGreaterThanOrEqual(1);
    expect(clampUndercover(-4, 5, false)).toBeGreaterThanOrEqual(1);
  });

  it('refuse une paire de mots identiques', () => {
    expect(isValidWordPair({ civilian: 'chat', undercover: 'chat' })).toBe(false);
  });

  it('refuse une paire de mots identiques à la casse près', () => {
    expect(isValidWordPair({ civilian: 'Chat', undercover: 'chat' })).toBe(false);
  });

  it('accepte une paire de mots distincts', () => {
    expect(isValidWordPair({ civilian: 'chat', undercover: 'chien' })).toBe(true);
  });

  it('donne la même distribution à tous les clients pour un même ordre', () => {
    const order = ids(6);
    const a = distributeRoles(order, 2, true, 'chat', 'chien');
    const b = distributeRoles(order, 2, true, 'chat', 'chien');
    expect(a).toEqual(b);
  });
});

// ── 2. Tour de parole et éliminations ──────────────────────────────────────

describe('undercover — tour de parole et éliminations', () => {
  it('fait parler chaque joueur vivant à son tour', () => {
    const aliveOrder = ids(4);
    const spoken: string[] = [];
    let index = 0;
    while (index !== -1) {
      spoken.push(aliveOrder[index]);
      index = computeNextTurnIndex(index, aliveOrder);
    }
    expect(spoken).toEqual(aliveOrder);
  });

  it('passe en discussion après le dernier joueur', () => {
    expect(computeNextTurnIndex(3, ids(4))).toBe(-1);
  });

  it('retire les éliminés de l’ordre de parole', () => {
    const order = ids(5);
    const aliveIds = new Set(['j1', 'j3', 'j5']);
    expect(computeAliveOrder(order, aliveIds)).toEqual(['j1', 'j3', 'j5']);
  });

  it('préserve l’ordre initial après élimination', () => {
    const order = ['j3', 'j1', 'j2'];
    expect(computeAliveOrder(order, new Set(['j1', 'j2', 'j3']))).toEqual(order);
  });

  it('raccourcit le tour au fil des éliminations', () => {
    const order = ids(5);
    let aliveIds = new Set(order);
    const lengths: number[] = [];
    for (const eliminated of ['j1', 'j2', 'j3']) {
      lengths.push(computeAliveOrder(order, aliveIds).length);
      aliveIds = new Set([...aliveIds].filter((id) => id !== eliminated));
    }
    expect(lengths).toEqual([5, 4, 3]);
  });

  it('autorise l’indice seulement au joueur dont c’est le tour', () => {
    expect(
      canSubmitClue({
        playerId: 'j1',
        playerIsAlive: true,
        currentTurnPlayerId: 'j1',
        phase: 'clue_giving',
        hasExistingClue: false,
      }),
    ).toBe(true);
  });

  it('refuse l’indice d’un joueur hors tour', () => {
    expect(
      canSubmitClue({
        playerId: 'j2',
        playerIsAlive: true,
        currentTurnPlayerId: 'j1',
        phase: 'clue_giving',
        hasExistingClue: false,
      }),
    ).toBe(false);
  });

  it('refuse un second indice sur le même tour', () => {
    expect(
      canSubmitClue({
        playerId: 'j1',
        playerIsAlive: true,
        currentTurnPlayerId: 'j1',
        phase: 'clue_giving',
        hasExistingClue: true,
      }),
    ).toBe(false);
  });

  it('refuse l’indice d’un joueur éliminé', () => {
    expect(
      canSubmitClue({
        playerId: 'j1',
        playerIsAlive: false,
        currentTurnPlayerId: 'j1',
        phase: 'clue_giving',
        hasExistingClue: false,
      }),
    ).toBe(false);
  });

  it('refuse l’indice hors de la phase d’indices', () => {
    for (const phase of ['voting', 'discussion', 'results']) {
      expect(
        canSubmitClue({
          playerId: 'j1',
          playerIsAlive: true,
          currentTurnPlayerId: 'j1',
          phase,
          hasExistingClue: false,
        }),
      ).toBe(false);
    }
  });
});

// ── 3. Vote et résolution ──────────────────────────────────────────────────

describe('undercover — vote et résolution', () => {
  it('élimine le joueur le plus voté', () => {
    const players = [
      player('j1', 'civilian', true, 'j4'),
      player('j2', 'civilian', true, 'j4'),
      player('j3', 'civilian', true, 'j4'),
      player('j4', 'undercover', true, 'j1'),
    ];
    const resolution = resolveVotes(
      players.map((p) => ({ player_id: p.player_id, vote_target: p.vote_target ?? null })),
    );
    expect(resolution.eliminatedId).toBe('j4');
    expect(resolution.isTie).toBe(false);
  });

  it('n’élimine personne en cas d’égalité', () => {
    const resolution = resolveVotes([
      { player_id: 'j1', vote_target: 'j3' },
      { player_id: 'j2', vote_target: 'j4' },
      { player_id: 'j3', vote_target: 'j4' },
      { player_id: 'j4', vote_target: 'j3' },
    ]);
    expect(resolution.isTie).toBe(true);
    expect(resolution.eliminatedId).toBeNull();
  });

  it('n’élimine personne sans aucun vote', () => {
    const resolution = resolveVotes([
      { player_id: 'j1', vote_target: null },
      { player_id: 'j2', vote_target: null },
    ]);
    expect(resolution.eliminatedId).toBeNull();
    expect(resolution.isTie).toBe(false);
  });

  it('compte correctement les voix', () => {
    const resolution = resolveVotes([
      { player_id: 'j1', vote_target: 'j3' },
      { player_id: 'j2', vote_target: 'j3' },
      { player_id: 'j3', vote_target: 'j1' },
    ]);
    expect(resolution.voteCounts).toEqual({ j3: 2, j1: 1 });
  });

  it('ignore les abstentions dans le décompte', () => {
    const resolution = resolveVotes([
      { player_id: 'j1', vote_target: 'j2' },
      { player_id: 'j2', vote_target: null },
      { player_id: 'j3', vote_target: null },
    ]);
    expect(resolution.voteCounts).toEqual({ j2: 1 });
    expect(resolution.eliminatedId).toBe('j2');
  });

  it('donne le même verdict à tous les joueurs', () => {
    const votes = [
      { player_id: 'j1', vote_target: 'j3' },
      { player_id: 'j2', vote_target: 'j3' },
      { player_id: 'j3', vote_target: 'j1' },
    ];
    expect(resolveVotes(votes)).toEqual(resolveVotes([...votes].reverse()));
  });

  it('interdit de voter pour soi-même', () => {
    expect(
      canVote({
        voterId: 'j1',
        voterIsAlive: true,
        targetId: 'j1',
        targetIsAlive: true,
        phase: 'voting',
      }),
    ).toBe(false);
  });

  it('interdit de voter pour un éliminé', () => {
    expect(
      canVote({
        voterId: 'j1',
        voterIsAlive: true,
        targetId: 'j2',
        targetIsAlive: false,
        phase: 'voting',
      }),
    ).toBe(false);
  });

  it('interdit à un éliminé de voter', () => {
    expect(
      canVote({
        voterId: 'j1',
        voterIsAlive: false,
        targetId: 'j2',
        targetIsAlive: true,
        phase: 'voting',
      }),
    ).toBe(false);
  });

  it('autorise un vote valide', () => {
    expect(
      canVote({
        voterId: 'j1',
        voterIsAlive: true,
        targetId: 'j2',
        targetIsAlive: true,
        phase: 'voting',
      }),
    ).toBe(true);
  });
});

// ── 4. Fin de manche et de partie ──────────────────────────────────────────

describe('undercover — fin de manche et de partie', () => {
  it('fait gagner les civils quand tous les infiltrés sont éliminés', () => {
    const players = [
      player('j1', 'civilian'),
      player('j2', 'civilian'),
      player('j3', 'undercover', false),
    ];
    expect(computeRoundWinner(alive(players))).toBe('civilian');
  });

  it('fait gagner les infiltrés à la parité', () => {
    const players = [player('j1', 'civilian'), player('j2', 'undercover')];
    expect(computeRoundWinner(alive(players))).toBe('undercover');
  });

  it('laisse la manche continuer quand les civils dominent', () => {
    const players = [
      player('j1', 'civilian'),
      player('j2', 'civilian'),
      player('j3', 'undercover'),
    ];
    expect(computeRoundWinner(alive(players))).toBeNull();
  });

  it('compte Mr White du côté des infiltrés', () => {
    const players = [player('j1', 'civilian'), player('j2', 'mr_white')];
    expect(computeRoundWinner(alive(players))).toBe('undercover');
  });

  it('fait gagner les civils quand Mr White est aussi éliminé', () => {
    const players = [
      player('j1', 'civilian'),
      player('j2', 'civilian'),
      player('j3', 'undercover', false),
      player('j4', 'mr_white', false),
    ];
    expect(computeRoundWinner(alive(players))).toBe('civilian');
  });

  it('déroule une manche complète jusqu’à la victoire civile', () => {
    const players = [
      player('j1', 'civilian'),
      player('j2', 'civilian'),
      player('j3', 'civilian'),
      player('j4', 'undercover'),
    ];
    // Tous votent contre l'infiltré.
    const resolution = resolveVotes(
      players.map((p) => ({ player_id: p.player_id, vote_target: 'j4' })),
    );
    expect(resolution.eliminatedId).toBe('j4');

    const after = players.map((p) =>
      p.player_id === resolution.eliminatedId ? { ...p, is_alive: false } : p,
    );
    expect(computeRoundWinner(alive(after))).toBe('civilian');
  });

  it('déroule une manche complète jusqu’à la victoire infiltrée', () => {
    const players = [
      player('j1', 'civilian'),
      player('j2', 'civilian'),
      player('j3', 'undercover'),
    ];
    // Les civils se trompent et éliminent un des leurs.
    const resolution = resolveVotes([
      { player_id: 'j1', vote_target: 'j2' },
      { player_id: 'j3', vote_target: 'j2' },
      { player_id: 'j2', vote_target: 'j1' },
    ]);
    expect(resolution.eliminatedId).toBe('j2');

    const after = players.map((p) =>
      p.player_id === resolution.eliminatedId ? { ...p, is_alive: false } : p,
    );
    expect(computeRoundWinner(alive(after))).toBe('undercover');
  });

  it('ne conclut pas la partie avant la dernière manche', () => {
    expect(shouldConcludeMatch({ roundWinner: 'civilian', currentRound: 1, totalRounds: 3 }))
      .toBe(false);
  });

  it('conclut la partie à la dernière manche', () => {
    expect(shouldConcludeMatch({ roundWinner: 'civilian', currentRound: 3, totalRounds: 3 }))
      .toBe(true);
  });

  it('ne conclut rien si la manche n’est pas terminée', () => {
    expect(shouldConcludeMatch({ roundWinner: null, currentRound: 3, totalRounds: 3 }))
      .toBe(false);
  });

  it('désigne le camp le plus victorieux', () => {
    expect(computeMatchWinner(2, 1, 'undercover')).toBe('civilian');
    expect(computeMatchWinner(1, 2, 'civilian')).toBe('undercover');
  });

  it('départage une égalité par la dernière manche', () => {
    expect(computeMatchWinner(1, 1, 'undercover')).toBe('undercover');
    expect(computeMatchWinner(2, 2, 'civilian')).toBe('civilian');
  });

  it('retombe sur les civils quand rien ne départage', () => {
    expect(computeMatchWinner(0, 0, null)).toBe('civilian');
  });

  it('enchaîne trois manches et désigne le vainqueur final', () => {
    let civilianWins = 0;
    let undercoverWins = 0;
    let last: 'civilian' | 'undercover' | null = null;
    const totalRounds = 3;

    for (let round = 1; round <= totalRounds; round += 1) {
      const winner = round === 2 ? 'undercover' : 'civilian';
      if (winner === 'civilian') civilianWins += 1;
      else undercoverWins += 1;
      last = winner;
      const done = shouldConcludeMatch({ roundWinner: winner, currentRound: round, totalRounds });
      expect(done).toBe(round === totalRounds);
    }

    expect(computeMatchWinner(civilianWins, undercoverWins, last)).toBe('civilian');
  });

  it('recalcule le même état après reconnexion', () => {
    const rows = [
      player('j1', 'civilian', true, 'j4'),
      player('j2', 'civilian', true, 'j4'),
      player('j3', 'civilian', false, null),
      player('j4', 'undercover', true, 'j1'),
    ];
    const aliveIds = new Set(rows.filter((r) => r.is_alive).map((r) => r.player_id));
    expect(computeAliveOrder(['j1', 'j2', 'j3', 'j4'], aliveIds)).toEqual(['j1', 'j2', 'j4']);
    const resolution = resolveVotes(
      rows.filter((r) => r.is_alive).map((r) => ({
        player_id: r.player_id,
        vote_target: r.vote_target ?? null,
      })),
    );
    expect(resolution.eliminatedId).toBe('j4');
  });
});
