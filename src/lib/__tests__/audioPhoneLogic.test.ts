import { describe, it, expect } from 'vitest';
import {
  canSubmitOriginalPhrase,
  canSubmitImitation,
  computePlayerOrderIndex,
  allOriginalPhrasesSubmitted,
  getPendingOriginalPlayers,
  getPlayersToImitate,
  shouldImitate,
  allImitationsForPhraseDone,
  computeNextPhraseIndex,
  computePhraseProgress,
  isValidPhaseTransition,
  sortRecordingsByOrder,
  playerHasSubmitted,
  type AudioPhonePhase,
} from '@/lib/audioPhoneLogic';

describe('canSubmitOriginalPhrase — original recording permissions', () => {
  it('allows submission in recording_all phase with no prior recording', () => {
    expect(canSubmitOriginalPhrase({
      phase: 'recording_all',
      playerId: 'p1',
      recordings: [],
    })).toBe(true);
  });

  it('rejects submission in instructions phase', () => {
    expect(canSubmitOriginalPhrase({
      phase: 'instructions',
      playerId: 'p1',
      recordings: [],
    })).toBe(false);
  });

  it('rejects submission in imitation phase', () => {
    expect(canSubmitOriginalPhrase({
      phase: 'imitation',
      playerId: 'p1',
      recordings: [],
    })).toBe(false);
  });

  it('rejects submission in reveal phase', () => {
    expect(canSubmitOriginalPhrase({
      phase: 'reveal',
      playerId: 'p1',
      recordings: [],
    })).toBe(false);
  });

  it('rejects duplicate submission', () => {
    expect(canSubmitOriginalPhrase({
      phase: 'recording_all',
      playerId: 'p1',
      recordings: [{ player_id: 'p1' }],
    })).toBe(false);
  });

  it('allows different players to submit', () => {
    expect(canSubmitOriginalPhrase({
      phase: 'recording_all',
      playerId: 'p2',
      recordings: [{ player_id: 'p1' }],
    })).toBe(true);
  });

  it('rejects in finished phase', () => {
    expect(canSubmitOriginalPhrase({
      phase: 'finished',
      playerId: 'p1',
      recordings: [],
    })).toBe(false);
  });
});

describe('canSubmitImitation — imitation permissions', () => {
  it('allows valid imitation', () => {
    expect(canSubmitImitation({
      phase: 'imitation',
      playerId: 'p2',
      originalRecordingId: 'rec1',
      originalAuthorId: 'p1',
      imitations: [],
    })).toBe(true);
  });

  it('rejects in wrong phase', () => {
    expect(canSubmitImitation({
      phase: 'recording_all',
      playerId: 'p2',
      originalRecordingId: 'rec1',
      originalAuthorId: 'p1',
      imitations: [],
    })).toBe(false);
  });

  it('rejects author imitating their own phrase', () => {
    expect(canSubmitImitation({
      phase: 'imitation',
      playerId: 'p1',
      originalRecordingId: 'rec1',
      originalAuthorId: 'p1',
      imitations: [],
    })).toBe(false);
  });

  it('rejects duplicate imitation by same player on same original', () => {
    expect(canSubmitImitation({
      phase: 'imitation',
      playerId: 'p2',
      originalRecordingId: 'rec1',
      originalAuthorId: 'p1',
      imitations: [
        { original_recording_id: 'rec1', imitator_player_id: 'p2' },
      ],
    })).toBe(false);
  });

  it('allows same player to imitate different original', () => {
    expect(canSubmitImitation({
      phase: 'imitation',
      playerId: 'p2',
      originalRecordingId: 'rec2',
      originalAuthorId: 'p3',
      imitations: [
        { original_recording_id: 'rec1', imitator_player_id: 'p2' },
      ],
    })).toBe(true);
  });

  it('allows different players to imitate same original', () => {
    expect(canSubmitImitation({
      phase: 'imitation',
      playerId: 'p3',
      originalRecordingId: 'rec1',
      originalAuthorId: 'p1',
      imitations: [
        { original_recording_id: 'rec1', imitator_player_id: 'p2' },
      ],
    })).toBe(true);
  });

  it('rejects in reveal phase', () => {
    expect(canSubmitImitation({
      phase: 'reveal',
      playerId: 'p2',
      originalRecordingId: 'rec1',
      originalAuthorId: 'p1',
      imitations: [],
    })).toBe(false);
  });
});

describe('computePlayerOrderIndex — turn order lookup', () => {
  it('finds player at index 0', () => {
    expect(computePlayerOrderIndex(['a', 'b', 'c'], 'a')).toBe(0);
  });

  it('finds player at last index', () => {
    expect(computePlayerOrderIndex(['a', 'b', 'c'], 'c')).toBe(2);
  });

  it('returns -1 for player not in order', () => {
    expect(computePlayerOrderIndex(['a', 'b', 'c'], 'x')).toBe(-1);
  });

  it('returns -1 for empty order', () => {
    expect(computePlayerOrderIndex([], 'a')).toBe(-1);
  });
});

describe('allOriginalPhrasesSubmitted — completion check', () => {
  it('returns true when all players submitted', () => {
    expect(allOriginalPhrasesSubmitted(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      [{ player_id: 'a' }, { player_id: 'b' }, { player_id: 'c' }]
    )).toBe(true);
  });

  it('returns false when one player missing', () => {
    expect(allOriginalPhrasesSubmitted(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      [{ player_id: 'a' }, { player_id: 'b' }]
    )).toBe(false);
  });

  it('returns false when no recordings', () => {
    expect(allOriginalPhrasesSubmitted(
      [{ id: 'a' }, { id: 'b' }],
      []
    )).toBe(false);
  });

  it('returns false with empty player list (degenerate)', () => {
    expect(allOriginalPhrasesSubmitted([], [])).toBe(false);
  });

  it('order independence', () => {
    expect(allOriginalPhrasesSubmitted(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      [{ player_id: 'c' }, { player_id: 'a' }, { player_id: 'b' }]
    )).toBe(true);
  });

  it('handles ghost recordings (player no longer in lobby)', () => {
    expect(allOriginalPhrasesSubmitted(
      [{ id: 'a' }, { id: 'b' }],
      [{ player_id: 'a' }, { player_id: 'b' }, { player_id: 'ghost' }]
    )).toBe(true);
  });
});

describe('getPendingOriginalPlayers — players who haven\'t submitted', () => {
  it('returns players who haven\'t submitted', () => {
    const players = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const recordings = [{ player_id: 'a' }];
    expect(getPendingOriginalPlayers(players, recordings)).toEqual([
      { id: 'b' },
      { id: 'c' },
    ]);
  });

  it('returns empty when all submitted', () => {
    const players = [{ id: 'a' }, { id: 'b' }];
    const recordings = [{ player_id: 'a' }, { player_id: 'b' }];
    expect(getPendingOriginalPlayers(players, recordings)).toEqual([]);
  });

  it('returns all when none submitted', () => {
    const players = [{ id: 'a' }, { id: 'b' }];
    expect(getPendingOriginalPlayers(players, [])).toEqual(players);
  });

  it('preserves player order', () => {
    const players = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    const recordings = [{ player_id: 'b' }];
    expect(getPendingOriginalPlayers(players, recordings)).toEqual([
      { id: 'a' },
      { id: 'c' },
      { id: 'd' },
    ]);
  });
});

describe('getPlayersToImitate — exclude author', () => {
  it('excludes author from imitator list', () => {
    const players = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(getPlayersToImitate(players, 'a')).toEqual([
      { id: 'b' },
      { id: 'c' },
    ]);
  });

  it('preserves order', () => {
    const players = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    expect(getPlayersToImitate(players, 'c')).toEqual([
      { id: 'a' },
      { id: 'b' },
      { id: 'd' },
    ]);
  });

  it('returns all when author not in list', () => {
    const players = [{ id: 'a' }, { id: 'b' }];
    expect(getPlayersToImitate(players, 'ghost')).toEqual(players);
  });

  it('handles empty list', () => {
    expect(getPlayersToImitate([], 'a')).toEqual([]);
  });
});

describe('shouldImitate — should the current player imitate?', () => {
  it('returns true for non-author who hasn\'t imitated', () => {
    expect(shouldImitate({
      playerId: 'p2',
      originalAuthorId: 'p1',
      originalRecordingId: 'rec1',
      imitations: [],
    })).toBe(true);
  });

  it('returns false for the author', () => {
    expect(shouldImitate({
      playerId: 'p1',
      originalAuthorId: 'p1',
      originalRecordingId: 'rec1',
      imitations: [],
    })).toBe(false);
  });

  it('returns false if already imitated', () => {
    expect(shouldImitate({
      playerId: 'p2',
      originalAuthorId: 'p1',
      originalRecordingId: 'rec1',
      imitations: [
        { original_recording_id: 'rec1', imitator_player_id: 'p2' },
      ],
    })).toBe(false);
  });

  it('returns true if imitated different original', () => {
    expect(shouldImitate({
      playerId: 'p2',
      originalAuthorId: 'p1',
      originalRecordingId: 'rec2',
      imitations: [
        { original_recording_id: 'rec1', imitator_player_id: 'p2' },
      ],
    })).toBe(true);
  });
});

describe('allImitationsForPhraseDone — phase completion check', () => {
  it('returns true when everyone imitated', () => {
    expect(allImitationsForPhraseDone({
      players: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }],
      originalAuthorId: 'p1',
      originalRecordingId: 'rec1',
      imitations: [
        { original_recording_id: 'rec1', imitator_player_id: 'p2' },
        { original_recording_id: 'rec1', imitator_player_id: 'p3' },
      ],
    })).toBe(true);
  });

  it('returns false if one imitator missing', () => {
    expect(allImitationsForPhraseDone({
      players: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }],
      originalAuthorId: 'p1',
      originalRecordingId: 'rec1',
      imitations: [
        { original_recording_id: 'rec1', imitator_player_id: 'p2' },
      ],
    })).toBe(false);
  });

  it('returns true with only author (1-player edge case)', () => {
    expect(allImitationsForPhraseDone({
      players: [{ id: 'p1' }],
      originalAuthorId: 'p1',
      originalRecordingId: 'rec1',
      imitations: [],
    })).toBe(true);
  });

  it('ignores imitations from other phrases', () => {
    expect(allImitationsForPhraseDone({
      players: [{ id: 'p1' }, { id: 'p2' }],
      originalAuthorId: 'p1',
      originalRecordingId: 'rec1',
      imitations: [
        { original_recording_id: 'rec_other', imitator_player_id: 'p2' },
      ],
    })).toBe(false);
  });
});

describe('computeNextPhraseIndex — phrase iteration', () => {
  it('returns next index when more phrases remain', () => {
    expect(computeNextPhraseIndex(0, 5)).toBe(1);
    expect(computeNextPhraseIndex(2, 5)).toBe(3);
  });

  it('returns -1 when no more phrases', () => {
    expect(computeNextPhraseIndex(4, 5)).toBe(-1);
    expect(computeNextPhraseIndex(0, 1)).toBe(-1);
  });

  it('returns -1 with 0 recordings (edge case)', () => {
    expect(computeNextPhraseIndex(0, 0)).toBe(-1);
  });
});

describe('computePhraseProgress — UI progress display', () => {
  it('counts completed and pending correctly', () => {
    const result = computePhraseProgress({
      players: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }],
      originalAuthorId: 'p1',
      originalRecordingId: 'rec1',
      imitations: [
        { original_recording_id: 'rec1', imitator_player_id: 'p2' },
        { original_recording_id: 'rec1', imitator_player_id: 'p3' },
      ],
    });
    expect(result.requiredCount).toBe(3);
    expect(result.completedCount).toBe(2);
    expect(result.pendingPlayerIds).toEqual(['p4']);
  });

  it('handles all-completed', () => {
    const result = computePhraseProgress({
      players: [{ id: 'p1' }, { id: 'p2' }],
      originalAuthorId: 'p1',
      originalRecordingId: 'rec1',
      imitations: [
        { original_recording_id: 'rec1', imitator_player_id: 'p2' },
      ],
    });
    expect(result.completedCount).toBe(1);
    expect(result.pendingPlayerIds).toEqual([]);
  });

  it('handles no-author scenario gracefully', () => {
    const result = computePhraseProgress({
      players: [{ id: 'p1' }],
      originalAuthorId: null,
      originalRecordingId: null,
      imitations: [],
    });
    expect(result.requiredCount).toBe(0);
    expect(result.completedCount).toBe(0);
    expect(result.pendingPlayerIds).toEqual([]);
  });
});

describe('isValidPhaseTransition — state machine', () => {
  it('instructions → recording_all is valid', () => {
    expect(isValidPhaseTransition('instructions', 'recording_all')).toBe(true);
  });

  it('recording_all → imitation is valid (skip reversing)', () => {
    expect(isValidPhaseTransition('recording_all', 'imitation')).toBe(true);
  });

  it('recording_all → reversing is valid', () => {
    expect(isValidPhaseTransition('recording_all', 'reversing')).toBe(true);
  });

  it('imitation → waiting_reveal is valid', () => {
    expect(isValidPhaseTransition('imitation', 'waiting_reveal')).toBe(true);
  });

  it('waiting_reveal → reveal is valid', () => {
    expect(isValidPhaseTransition('waiting_reveal', 'reveal')).toBe(true);
  });

  it('reveal → finished is valid', () => {
    expect(isValidPhaseTransition('reveal', 'finished')).toBe(true);
  });

  it('rejects backward transitions', () => {
    expect(isValidPhaseTransition('imitation', 'recording_all')).toBe(false);
    expect(isValidPhaseTransition('reveal', 'imitation')).toBe(false);
  });

  it('rejects skip-ahead transitions', () => {
    expect(isValidPhaseTransition('instructions', 'reveal')).toBe(false);
    expect(isValidPhaseTransition('recording_all', 'reveal')).toBe(false);
  });

  it('finished is terminal', () => {
    expect(isValidPhaseTransition('finished', 'instructions')).toBe(false);
    expect(isValidPhaseTransition('finished', 'recording_all')).toBe(false);
  });

  it('full game flow is valid', () => {
    const flow: AudioPhonePhase[] = [
      'instructions',
      'recording_all',
      'imitation',
      'waiting_reveal',
      'reveal',
      'finished',
    ];
    for (let i = 0; i < flow.length - 1; i++) {
      expect(isValidPhaseTransition(flow[i], flow[i + 1])).toBe(true);
    }
  });
});

describe('sortRecordingsByOrder — deterministic playback order', () => {
  it('sorts by player_order_index ascending', () => {
    const recordings = [
      { player_order_index: 2 },
      { player_order_index: 0 },
      { player_order_index: 1 },
    ];
    expect(sortRecordingsByOrder(recordings)).toEqual([
      { player_order_index: 0 },
      { player_order_index: 1 },
      { player_order_index: 2 },
    ]);
  });

  it('does not mutate original array', () => {
    const recordings = [
      { player_order_index: 2 },
      { player_order_index: 0 },
    ];
    const before = [...recordings];
    sortRecordingsByOrder(recordings);
    expect(recordings).toEqual(before);
  });

  it('handles empty array', () => {
    expect(sortRecordingsByOrder([])).toEqual([]);
  });

  it('handles single element', () => {
    const recordings = [{ player_order_index: 0 }];
    expect(sortRecordingsByOrder(recordings)).toEqual(recordings);
  });
});

describe('playerHasSubmitted — submission lookup', () => {
  it('returns true if found', () => {
    expect(playerHasSubmitted('p1', [{ player_id: 'p1' }])).toBe(true);
  });

  it('returns false if not found', () => {
    expect(playerHasSubmitted('p2', [{ player_id: 'p1' }])).toBe(false);
  });

  it('returns false on empty list', () => {
    expect(playerHasSubmitted('p1', [])).toBe(false);
  });
});

describe('integration: full game flow', () => {
  it('5-player game progression', () => {
    const players = [
      { id: 'p1' },
      { id: 'p2' },
      { id: 'p3' },
      { id: 'p4' },
      { id: 'p5' },
    ];

    // Phase 1: recording_all - all submit
    let recordings: { player_id: string; id: string; player_order_index: number }[] = [];
    expect(allOriginalPhrasesSubmitted(players, recordings)).toBe(false);

    recordings = [
      { player_id: 'p1', id: 'rec1', player_order_index: 0 },
      { player_id: 'p2', id: 'rec2', player_order_index: 1 },
      { player_id: 'p3', id: 'rec3', player_order_index: 2 },
      { player_id: 'p4', id: 'rec4', player_order_index: 3 },
      { player_id: 'p5', id: 'rec5', player_order_index: 4 },
    ];
    expect(allOriginalPhrasesSubmitted(players, recordings)).toBe(true);

    // Phase 2: imitation - phrase 0 (rec1, author p1)
    // Other 4 players need to imitate
    expect(getPlayersToImitate(players, 'p1')).toHaveLength(4);

    let imitations: { original_recording_id: string; imitator_player_id: string }[] = [];
    expect(allImitationsForPhraseDone({
      players,
      originalAuthorId: 'p1',
      originalRecordingId: 'rec1',
      imitations,
    })).toBe(false);

    imitations = [
      { original_recording_id: 'rec1', imitator_player_id: 'p2' },
      { original_recording_id: 'rec1', imitator_player_id: 'p3' },
      { original_recording_id: 'rec1', imitator_player_id: 'p4' },
      { original_recording_id: 'rec1', imitator_player_id: 'p5' },
    ];
    expect(allImitationsForPhraseDone({
      players,
      originalAuthorId: 'p1',
      originalRecordingId: 'rec1',
      imitations,
    })).toBe(true);

    // Move to next phrase
    expect(computeNextPhraseIndex(0, 5)).toBe(1);
    // Last phrase - move to waiting_reveal
    expect(computeNextPhraseIndex(4, 5)).toBe(-1);
  });

  it('regression: author cannot submit imitation of own phrase', () => {
    expect(canSubmitImitation({
      phase: 'imitation',
      playerId: 'p1',
      originalRecordingId: 'rec1',
      originalAuthorId: 'p1',
      imitations: [],
    })).toBe(false);
  });

  it('regression: cannot submit twice in recording_all', () => {
    expect(canSubmitOriginalPhrase({
      phase: 'recording_all',
      playerId: 'p1',
      recordings: [{ player_id: 'p1' }],
    })).toBe(false);
  });

  it('regression: cannot imitate same phrase twice', () => {
    expect(canSubmitImitation({
      phase: 'imitation',
      playerId: 'p2',
      originalRecordingId: 'rec1',
      originalAuthorId: 'p1',
      imitations: [
        { original_recording_id: 'rec1', imitator_player_id: 'p2' },
      ],
    })).toBe(false);
  });
});
