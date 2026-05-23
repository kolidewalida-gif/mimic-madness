import { describe, it, expect } from 'vitest';
import {
  computeMaxUndercover,
  clampUndercover,
  distributeRoles,
  computeRoundWinner,
  resolveVotes,
  computeNextTurnIndex,
  computeAliveOrder,
  canVote,
  canSubmitClue,
  computeMatchWinner,
  isValidWordPair,
  shouldConcludeMatch,
  type UndercoverRole,
} from '@/lib/undercoverLogic';

describe('computeMaxUndercover — undercover count limits', () => {
  it('3 players, no Mr White → max 1 undercover', () => {
    expect(computeMaxUndercover(3, false)).toBe(1);
  });

  it('5 players, no Mr White → max 3 undercover', () => {
    expect(computeMaxUndercover(5, false)).toBe(3);
  });

  it('4 players + Mr White → max 1 undercover (1 MW + 2 civils + 1 UC)', () => {
    expect(computeMaxUndercover(4, true)).toBe(1);
  });

  it('6 players + Mr White → max 3 undercover', () => {
    expect(computeMaxUndercover(6, true)).toBe(3);
  });

  it('caps at 3 even with many players', () => {
    expect(computeMaxUndercover(20, false)).toBe(3);
    expect(computeMaxUndercover(20, true)).toBe(3);
  });

  it('returns at least 1 even with 2 players (degenerate)', () => {
    expect(computeMaxUndercover(2, false)).toBe(1);
  });
});

describe('clampUndercover — safe range enforcement', () => {
  it('clamps requested 5 to 3 (cap)', () => {
    expect(clampUndercover(5, 8, false)).toBe(3);
  });

  it('clamps requested 0 to 1 (min)', () => {
    expect(clampUndercover(0, 5, false)).toBe(1);
  });

  it('clamps requested -1 to 1', () => {
    expect(clampUndercover(-1, 5, false)).toBe(1);
  });

  it('allows requested 2 with 5 players', () => {
    expect(clampUndercover(2, 5, false)).toBe(2);
  });

  it('respects player count limits', () => {
    expect(clampUndercover(3, 3, false)).toBe(1); // only 1 max for 3p
    expect(clampUndercover(3, 4, true)).toBe(1); // only 1 max for 4p with MW
  });
});

describe('distributeRoles — role assignment', () => {
  it('1 undercover, 3 players, no Mr White', () => {
    const result = distributeRoles(['p1', 'p2', 'p3'], 1, false, 'PIZZA', 'BURGER');

    expect(result.roles.p1).toBe('undercover');
    expect(result.roles.p2).toBe('civilian');
    expect(result.roles.p3).toBe('civilian');
    expect(result.words.p1).toBe('BURGER');
    expect(result.words.p2).toBe('PIZZA');
    expect(result.words.p3).toBe('PIZZA');
  });

  it('2 undercover, 5 players, no Mr White', () => {
    const result = distributeRoles(['a', 'b', 'c', 'd', 'e'], 2, false, 'CAT', 'DOG');

    expect(result.roles.a).toBe('undercover');
    expect(result.roles.b).toBe('undercover');
    expect(result.roles.c).toBe('civilian');
    expect(result.roles.d).toBe('civilian');
    expect(result.roles.e).toBe('civilian');
  });

  it('1 undercover + Mr White, 5 players', () => {
    const result = distributeRoles(['a', 'b', 'c', 'd', 'e'], 1, true, 'CAT', 'DOG');

    expect(result.roles.a).toBe('undercover');
    expect(result.roles.b).toBe('mr_white');
    expect(result.roles.c).toBe('civilian');
    expect(result.roles.d).toBe('civilian');
    expect(result.roles.e).toBe('civilian');
    expect(result.words.b).toBeNull(); // Mr White has no word
  });

  it('Mr White is skipped if < 4 players', () => {
    const result = distributeRoles(['a', 'b', 'c'], 1, true, 'CAT', 'DOG');

    expect(result.roles.a).toBe('undercover');
    expect(result.roles.b).toBe('civilian');
    expect(result.roles.c).toBe('civilian');
    // No mr_white assigned
    expect(Object.values(result.roles)).not.toContain('mr_white');
  });

  it('all players get a role', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
    const result = distributeRoles(ids, 2, true, 'X', 'Y');
    expect(Object.keys(result.roles)).toHaveLength(7);
    expect(Object.keys(result.words)).toHaveLength(7);
  });

  it('total undercover count matches requested', () => {
    const result = distributeRoles(['a', 'b', 'c', 'd', 'e', 'f'], 3, false, 'X', 'Y');
    const ucCount = Object.values(result.roles).filter((r) => r === 'undercover').length;
    expect(ucCount).toBe(3);
  });
});

describe('computeRoundWinner — victory conditions', () => {
  const makeAlive = (roles: UndercoverRole[]) => roles.map((role) => ({ role }));

  it('civilians win when all bad guys are eliminated', () => {
    expect(computeRoundWinner(makeAlive(['civilian', 'civilian', 'civilian']))).toBe('civilian');
  });

  it('undercover wins when 1 UC vs 1 civil (parity)', () => {
    expect(computeRoundWinner(makeAlive(['undercover', 'civilian']))).toBe('undercover');
  });

  it('undercover wins when 2 UC vs 1 civil', () => {
    expect(computeRoundWinner(makeAlive(['undercover', 'undercover', 'civilian']))).toBe('undercover');
  });

  it('round continues when 1 UC vs 2 civils', () => {
    expect(computeRoundWinner(makeAlive(['undercover', 'civilian', 'civilian']))).toBeNull();
  });

  it('round continues when 1 UC vs 3 civils', () => {
    expect(computeRoundWinner(makeAlive(['undercover', 'civilian', 'civilian', 'civilian']))).toBeNull();
  });

  it('Mr White counts as bad guy for civilian victory', () => {
    expect(computeRoundWinner(makeAlive(['mr_white', 'civilian', 'civilian']))).toBeNull();
    expect(computeRoundWinner(makeAlive(['civilian', 'civilian']))).toBe('civilian');
  });

  it('Mr White counts toward parity for undercover victory', () => {
    expect(computeRoundWinner(makeAlive(['mr_white', 'civilian']))).toBe('undercover');
    expect(computeRoundWinner(makeAlive(['undercover', 'mr_white', 'civilian']))).toBe('undercover');
  });

  it('handles empty alive list (degenerate)', () => {
    expect(computeRoundWinner([])).toBe('civilian'); // no bad guys = civils win
  });

  it('only undercovers alive → they win (parity 1 UC : 0 civ)', () => {
    expect(computeRoundWinner(makeAlive(['undercover']))).toBe('undercover');
    expect(computeRoundWinner(makeAlive(['undercover', 'undercover']))).toBe('undercover');
  });

  it('only Mr White alive → undercover wins', () => {
    expect(computeRoundWinner(makeAlive(['mr_white']))).toBe('undercover');
  });

  it('classic 7-player setup with 1 UC eliminated', () => {
    // Started with 2 UC, 5 civ. After 1 UC eliminated: 1 UC, 5 civ
    expect(computeRoundWinner(makeAlive(['undercover', 'civilian', 'civilian', 'civilian', 'civilian', 'civilian']))).toBeNull();
  });
});

describe('resolveVotes — vote counting and tie detection', () => {
  it('clear majority eliminates the most-voted player', () => {
    const result = resolveVotes([
      { player_id: 'a', vote_target: 'b' },
      { player_id: 'b', vote_target: 'a' },
      { player_id: 'c', vote_target: 'b' },
    ]);
    expect(result.eliminatedId).toBe('b');
    expect(result.isTie).toBe(false);
    expect(result.voteCounts).toEqual({ a: 1, b: 2 });
  });

  it('detects 2-way tie', () => {
    const result = resolveVotes([
      { player_id: 'a', vote_target: 'b' },
      { player_id: 'b', vote_target: 'a' },
    ]);
    expect(result.isTie).toBe(true);
    expect(result.eliminatedId).toBeNull();
  });

  it('detects 3-way tie (Bug #7 regression)', () => {
    // Old code's loop-and-set logic broke on 3-way ties
    const result = resolveVotes([
      { player_id: 'a', vote_target: 'b' },
      { player_id: 'b', vote_target: 'c' },
      { player_id: 'c', vote_target: 'a' },
    ]);
    expect(result.isTie).toBe(true);
    expect(result.eliminatedId).toBeNull();
  });

  it('handles 4-way tie', () => {
    const result = resolveVotes([
      { player_id: 'a', vote_target: 'b' },
      { player_id: 'b', vote_target: 'a' },
      { player_id: 'c', vote_target: 'd' },
      { player_id: 'd', vote_target: 'c' },
    ]);
    // a:1, b:1, c:1, d:1 → 4-way tie at 1
    expect(result.isTie).toBe(true);
  });

  it('player with 3 votes vs others with 1 each', () => {
    const result = resolveVotes([
      { player_id: 'a', vote_target: 'x' },
      { player_id: 'b', vote_target: 'x' },
      { player_id: 'c', vote_target: 'x' },
      { player_id: 'd', vote_target: 'a' },
    ]);
    expect(result.eliminatedId).toBe('x');
    expect(result.isTie).toBe(false);
  });

  it('ignores null vote_target', () => {
    const result = resolveVotes([
      { player_id: 'a', vote_target: 'b' },
      { player_id: 'b', vote_target: null },
      { player_id: 'c', vote_target: 'b' },
    ]);
    expect(result.eliminatedId).toBe('b');
    expect(result.voteCounts).toEqual({ b: 2 });
  });

  it('all null votes → no elimination', () => {
    const result = resolveVotes([
      { player_id: 'a', vote_target: null },
      { player_id: 'b', vote_target: null },
    ]);
    expect(result.eliminatedId).toBeNull();
    expect(result.isTie).toBe(false);
  });

  it('empty input', () => {
    const result = resolveVotes([]);
    expect(result.eliminatedId).toBeNull();
    expect(result.isTie).toBe(false);
  });
});

describe('computeNextTurnIndex — turn rotation', () => {
  it('returns next index when not at end', () => {
    expect(computeNextTurnIndex(0, ['a', 'b', 'c'])).toBe(1);
    expect(computeNextTurnIndex(1, ['a', 'b', 'c'])).toBe(2);
  });

  it('returns -1 when last player has spoken', () => {
    expect(computeNextTurnIndex(2, ['a', 'b', 'c'])).toBe(-1);
  });

  it('handles single-player order', () => {
    expect(computeNextTurnIndex(0, ['a'])).toBe(-1);
  });

  it('handles empty order (degenerate)', () => {
    expect(computeNextTurnIndex(0, [])).toBe(-1);
  });
});

describe('computeAliveOrder — filter player order by alive set', () => {
  it('preserves order, filters dead', () => {
    const result = computeAliveOrder(['a', 'b', 'c', 'd'], new Set(['a', 'c']));
    expect(result).toEqual(['a', 'c']);
  });

  it('returns empty when all dead', () => {
    const result = computeAliveOrder(['a', 'b'], new Set());
    expect(result).toEqual([]);
  });

  it('returns full order when all alive', () => {
    const result = computeAliveOrder(['a', 'b', 'c'], new Set(['a', 'b', 'c']));
    expect(result).toEqual(['a', 'b', 'c']);
  });
});

describe('canVote — voting permission checks', () => {
  const baseParams = {
    voterId: 'p1',
    voterIsAlive: true,
    targetId: 'p2',
    targetIsAlive: true,
    phase: 'voting',
  };

  it('allows valid vote', () => {
    expect(canVote(baseParams)).toBe(true);
  });

  it('rejects vote in wrong phase', () => {
    expect(canVote({ ...baseParams, phase: 'clue_giving' })).toBe(false);
    expect(canVote({ ...baseParams, phase: 'discussion' })).toBe(false);
  });

  it('rejects vote from dead player', () => {
    expect(canVote({ ...baseParams, voterIsAlive: false })).toBe(false);
  });

  it('rejects vote for dead target', () => {
    expect(canVote({ ...baseParams, targetIsAlive: false })).toBe(false);
  });

  it('rejects self-vote', () => {
    expect(canVote({ ...baseParams, targetId: 'p1' })).toBe(false);
  });
});

describe('canSubmitClue — clue submission permission checks', () => {
  const baseParams = {
    playerId: 'p1',
    playerIsAlive: true,
    currentTurnPlayerId: 'p1',
    phase: 'clue_giving',
    hasExistingClue: false,
  };

  it('allows valid submission', () => {
    expect(canSubmitClue(baseParams)).toBe(true);
  });

  it('rejects in wrong phase', () => {
    expect(canSubmitClue({ ...baseParams, phase: 'voting' })).toBe(false);
    expect(canSubmitClue({ ...baseParams, phase: 'discussion' })).toBe(false);
  });

  it('rejects from dead player', () => {
    expect(canSubmitClue({ ...baseParams, playerIsAlive: false })).toBe(false);
  });

  it('rejects when not their turn', () => {
    expect(canSubmitClue({ ...baseParams, currentTurnPlayerId: 'p2' })).toBe(false);
  });

  it('rejects with null current turn', () => {
    expect(canSubmitClue({ ...baseParams, currentTurnPlayerId: null })).toBe(false);
  });

  it('rejects double-submission', () => {
    expect(canSubmitClue({ ...baseParams, hasExistingClue: true })).toBe(false);
  });
});

describe('computeMatchWinner — match conclusion', () => {
  it('civilians win with more rounds', () => {
    expect(computeMatchWinner(3, 1, null)).toBe('civilian');
    expect(computeMatchWinner(2, 1, 'undercover')).toBe('civilian');
  });

  it('undercovers win with more rounds', () => {
    expect(computeMatchWinner(1, 3, null)).toBe('undercover');
    expect(computeMatchWinner(1, 2, 'civilian')).toBe('undercover');
  });

  it('tie goes to last round winner', () => {
    expect(computeMatchWinner(2, 2, 'civilian')).toBe('civilian');
    expect(computeMatchWinner(2, 2, 'undercover')).toBe('undercover');
  });

  it('tie with no last round winner defaults to civilian', () => {
    expect(computeMatchWinner(2, 2, null)).toBe('civilian');
  });

  it('handles 0-0 (degenerate, with last winner)', () => {
    expect(computeMatchWinner(0, 0, 'undercover')).toBe('undercover');
    expect(computeMatchWinner(0, 0, null)).toBe('civilian');
  });
});

describe('isValidWordPair — word pair validation', () => {
  it('accepts valid pair', () => {
    expect(isValidWordPair({ civilian: 'Pizza', undercover: 'Burger' })).toBe(true);
  });

  it('rejects empty civilian', () => {
    expect(isValidWordPair({ civilian: '', undercover: 'Burger' })).toBe(false);
  });

  it('rejects empty undercover', () => {
    expect(isValidWordPair({ civilian: 'Pizza', undercover: '' })).toBe(false);
  });

  it('rejects whitespace-only', () => {
    expect(isValidWordPair({ civilian: '   ', undercover: 'Burger' })).toBe(false);
  });

  it('rejects identical pair', () => {
    expect(isValidWordPair({ civilian: 'Pizza', undercover: 'Pizza' })).toBe(false);
  });

  it('rejects case-only difference', () => {
    expect(isValidWordPair({ civilian: 'Pizza', undercover: 'PIZZA' })).toBe(false);
    expect(isValidWordPair({ civilian: 'pizza', undercover: 'Pizza' })).toBe(false);
  });

  it('rejects whitespace-only difference', () => {
    expect(isValidWordPair({ civilian: 'Pizza', undercover: ' Pizza ' })).toBe(false);
  });

  it('accepts visually similar but different pair', () => {
    expect(isValidWordPair({ civilian: 'Café', undercover: 'Thé' })).toBe(true);
  });
});

describe('shouldConcludeMatch — match end logic', () => {
  it('concludes when round won and round count reached', () => {
    expect(shouldConcludeMatch({
      roundWinner: 'civilian',
      currentRound: 3,
      totalRounds: 3,
    })).toBe(true);
  });

  it('continues when round won but more rounds left', () => {
    expect(shouldConcludeMatch({
      roundWinner: 'civilian',
      currentRound: 1,
      totalRounds: 3,
    })).toBe(false);
  });

  it('does not conclude when round itself didnt end', () => {
    expect(shouldConcludeMatch({
      roundWinner: null,
      currentRound: 3,
      totalRounds: 3,
    })).toBe(false);
  });

  it('concludes Bo1 (1 round only)', () => {
    expect(shouldConcludeMatch({
      roundWinner: 'undercover',
      currentRound: 1,
      totalRounds: 1,
    })).toBe(true);
  });
});

describe('integration: full game flow scenarios', () => {
  it('5-player game, 1 UC: civils win after eliminating UC', () => {
    // Setup: 1 UC + 4 civils
    const distribution = distributeRoles(['p1', 'p2', 'p3', 'p4', 'p5'], 1, false, 'CAT', 'DOG');
    const ucId = Object.entries(distribution.roles).find(([, r]) => r === 'undercover')![0];

    // After voting out the UC: only civils alive
    const aliveAfterVote = ['p1', 'p2', 'p3', 'p4', 'p5']
      .filter((id) => id !== ucId)
      .map((id) => ({ role: distribution.roles[id] }));

    expect(computeRoundWinner(aliveAfterVote)).toBe('civilian');
  });

  it('7-player game, 2 UC: civils still win after eliminating both UCs', () => {
    const distribution = distributeRoles(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'], 2, false, 'CAT', 'DOG');
    const ucIds = Object.entries(distribution.roles)
      .filter(([, r]) => r === 'undercover')
      .map(([id]) => id);

    const aliveAfter = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']
      .filter((id) => !ucIds.includes(id))
      .map((id) => ({ role: distribution.roles[id] }));

    expect(computeRoundWinner(aliveAfter)).toBe('civilian');
  });

  it('vote tie causes round to continue (no elimination)', () => {
    const result = resolveVotes([
      { player_id: 'a', vote_target: 'b' },
      { player_id: 'b', vote_target: 'a' },
      { player_id: 'c', vote_target: 'a' },
      { player_id: 'd', vote_target: 'b' },
    ]);
    expect(result.isTie).toBe(true);
  });

  it('Mr White scenario: gets eliminated by civils', () => {
    const distribution = distributeRoles(
      ['p1', 'p2', 'p3', 'p4', 'p5'],
      1,
      true,
      'CAT',
      'DOG'
    );

    // All 3: 1 UC + 1 MW + 3 civils. Eliminate MW first
    const mwId = Object.entries(distribution.roles).find(([, r]) => r === 'mr_white')![0];
    const aliveAfter = Object.entries(distribution.roles)
      .filter(([id]) => id !== mwId)
      .map(([, role]) => ({ role }));

    // 1 UC + 3 civils → round continues (not parity)
    expect(computeRoundWinner(aliveAfter)).toBeNull();
  });

  it('match progression: Bo3 with civils 1, undercovers 1, last round decides', () => {
    expect(computeMatchWinner(1, 1, 'civilian')).toBe('civilian');
    expect(computeMatchWinner(1, 1, 'undercover')).toBe('undercover');
  });
});
