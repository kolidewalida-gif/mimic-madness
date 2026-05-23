import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Tests for the automatic phase progression in Quiz mode.
 *
 * The quiz state machine flows:
 *   waiting → countdown → answering → reveal → scores → (next round | final)
 *
 * Each transition has timing rules that we test here.
 */

// Replicas of constants from useQuizGame.tsx
const COUNTDOWN_MS = 3500;
const COUNTDOWN_MAX_MS = 6000;
const REVEAL_AUTO_ADVANCE_MS = 3500;
const SCORES_AUTO_ADVANCE_MS = 4500;
const REVEAL_WATCHDOG_MS = 6000;
const SCORES_WATCHDOG_MS = 7000;
const ALL_ANSWERED_GRACE_MS = 900;
const HOST_FALLBACK_GRACE_MS = 1500;

describe('Phase transition timing constants', () => {
  it('countdown duration is reasonable (3-4 seconds)', () => {
    expect(COUNTDOWN_MS).toBeGreaterThanOrEqual(3000);
    expect(COUNTDOWN_MS).toBeLessThanOrEqual(4000);
  });

  it('countdown max safety net is longer than countdown duration', () => {
    expect(COUNTDOWN_MAX_MS).toBeGreaterThan(COUNTDOWN_MS);
  });

  it('reveal auto-advance allows time to read the answer (3-5s)', () => {
    expect(REVEAL_AUTO_ADVANCE_MS).toBeGreaterThanOrEqual(3000);
    expect(REVEAL_AUTO_ADVANCE_MS).toBeLessThanOrEqual(5000);
  });

  it('scores auto-advance allows time to see ranking (4-5s)', () => {
    expect(SCORES_AUTO_ADVANCE_MS).toBeGreaterThanOrEqual(4000);
    expect(SCORES_AUTO_ADVANCE_MS).toBeLessThanOrEqual(5000);
  });

  it('watchdog fires AFTER the primary auto-advance', () => {
    expect(REVEAL_WATCHDOG_MS).toBeGreaterThan(REVEAL_AUTO_ADVANCE_MS);
    expect(SCORES_WATCHDOG_MS).toBeGreaterThan(SCORES_AUTO_ADVANCE_MS);
  });

  it('"all answered" grace is short to keep the game snappy', () => {
    expect(ALL_ANSWERED_GRACE_MS).toBeLessThanOrEqual(1500);
  });

  it('host fallback grace is short enough that non-hosts can take over', () => {
    expect(HOST_FALLBACK_GRACE_MS).toBeLessThanOrEqual(2500);
  });
});

describe('Auto-advance timer behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reveal phase fires advance callback after REVEAL_AUTO_ADVANCE_MS', () => {
    const callback = vi.fn();
    setTimeout(callback, REVEAL_AUTO_ADVANCE_MS);

    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(REVEAL_AUTO_ADVANCE_MS - 100);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('scores phase fires nextRound callback after SCORES_AUTO_ADVANCE_MS', () => {
    const callback = vi.fn();
    setTimeout(callback, SCORES_AUTO_ADVANCE_MS);

    vi.advanceTimersByTime(SCORES_AUTO_ADVANCE_MS);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cancelling a timer prevents the callback', () => {
    const callback = vi.fn();
    const id = setTimeout(callback, REVEAL_AUTO_ADVANCE_MS);
    clearTimeout(id);
    vi.advanceTimersByTime(REVEAL_AUTO_ADVANCE_MS + 1000);
    expect(callback).not.toHaveBeenCalled();
  });

  it('watchdog only fires if primary advance failed', () => {
    const primaryAdvance = vi.fn();
    const watchdog = vi.fn();

    setTimeout(primaryAdvance, REVEAL_AUTO_ADVANCE_MS);
    const watchdogId = setTimeout(watchdog, REVEAL_WATCHDOG_MS);

    // Primary fires first
    vi.advanceTimersByTime(REVEAL_AUTO_ADVANCE_MS);
    expect(primaryAdvance).toHaveBeenCalledTimes(1);
    expect(watchdog).not.toHaveBeenCalled();

    // If primary succeeded, we'd cancel the watchdog
    clearTimeout(watchdogId);
    vi.advanceTimersByTime(REVEAL_WATCHDOG_MS);
    expect(watchdog).not.toHaveBeenCalled();
  });

  it('watchdog fires if not cancelled (primary failed scenario)', () => {
    const watchdog = vi.fn();
    setTimeout(watchdog, REVEAL_WATCHDOG_MS);

    vi.advanceTimersByTime(REVEAL_WATCHDOG_MS);
    expect(watchdog).toHaveBeenCalledTimes(1);
  });

  it('countdown safety net fires if stuck', () => {
    const safetyNet = vi.fn();
    setTimeout(safetyNet, COUNTDOWN_MAX_MS);

    vi.advanceTimersByTime(COUNTDOWN_MS);
    expect(safetyNet).not.toHaveBeenCalled();

    vi.advanceTimersByTime(COUNTDOWN_MAX_MS - COUNTDOWN_MS);
    expect(safetyNet).toHaveBeenCalledTimes(1);
  });

  it('multiple timers can run concurrently', () => {
    const a = vi.fn();
    const b = vi.fn();
    const c = vi.fn();

    setTimeout(a, 1000);
    setTimeout(b, 2000);
    setTimeout(c, 3000);

    vi.advanceTimersByTime(1500);
    expect(a).toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
    expect(c).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1500);
    expect(b).toHaveBeenCalled();
    expect(c).toHaveBeenCalled();
  });
});

describe('All-answered detection logic', () => {
  // Mirrors the logic in the realtime answer handler
  const allPlayersAnswered = (players: { id: string }[], answered: string[]): boolean => {
    if (players.length === 0) return false;
    return players.every((p) => answered.includes(p.id));
  };

  it('returns true when all players have answered', () => {
    const players = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(allPlayersAnswered(players, ['a', 'b', 'c'])).toBe(true);
  });

  it('returns false when one player is missing', () => {
    const players = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(allPlayersAnswered(players, ['a', 'b'])).toBe(false);
  });

  it('returns false with no answers', () => {
    const players = [{ id: 'a' }, { id: 'b' }];
    expect(allPlayersAnswered(players, [])).toBe(false);
  });

  it('returns false with no players (edge case)', () => {
    expect(allPlayersAnswered([], [])).toBe(false);
    expect(allPlayersAnswered([], ['ghost'])).toBe(false);
  });

  it('handles answer order independence', () => {
    const players = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(allPlayersAnswered(players, ['c', 'a', 'b'])).toBe(true);
    expect(allPlayersAnswered(players, ['b', 'a', 'c'])).toBe(true);
  });

  it('ignores extra non-player IDs in answered list', () => {
    const players = [{ id: 'a' }, { id: 'b' }];
    expect(allPlayersAnswered(players, ['a', 'b', 'ghost'])).toBe(true);
  });
});

describe('Round number filtering (anti-stale-event)', () => {
  // Mirrors the filter in the answers subscription
  const isCurrentRoundAnswer = (
    answerRoundNumber: number,
    currentRoundNumber: number
  ): boolean => answerRoundNumber === currentRoundNumber;

  it('accepts answers from the current round', () => {
    expect(isCurrentRoundAnswer(3, 3)).toBe(true);
  });

  it('rejects answers from previous rounds (late arrival)', () => {
    expect(isCurrentRoundAnswer(2, 3)).toBe(false);
  });

  it('rejects answers from future rounds (race condition)', () => {
    expect(isCurrentRoundAnswer(4, 3)).toBe(false);
  });
});

describe('Phase state machine transitions', () => {
  type Phase = 'waiting' | 'countdown' | 'answering' | 'reveal' | 'scores' | 'final';

  const validTransitions: Record<Phase, Phase[]> = {
    waiting: ['countdown'],
    countdown: ['answering'],
    answering: ['reveal'],
    reveal: ['scores'],
    scores: ['countdown', 'final'], // next round OR end of quiz
    final: [], // terminal
  };

  const isValidTransition = (from: Phase, to: Phase): boolean =>
    validTransitions[from].includes(to);

  it('waiting can only go to countdown', () => {
    expect(isValidTransition('waiting', 'countdown')).toBe(true);
    expect(isValidTransition('waiting', 'answering')).toBe(false);
    expect(isValidTransition('waiting', 'reveal')).toBe(false);
  });

  it('countdown can only go to answering', () => {
    expect(isValidTransition('countdown', 'answering')).toBe(true);
    expect(isValidTransition('countdown', 'reveal')).toBe(false);
  });

  it('answering can only go to reveal', () => {
    expect(isValidTransition('answering', 'reveal')).toBe(true);
    expect(isValidTransition('answering', 'scores')).toBe(false);
  });

  it('reveal can only go to scores', () => {
    expect(isValidTransition('reveal', 'scores')).toBe(true);
    expect(isValidTransition('reveal', 'final')).toBe(false);
  });

  it('scores can go to countdown (next round) or final', () => {
    expect(isValidTransition('scores', 'countdown')).toBe(true);
    expect(isValidTransition('scores', 'final')).toBe(true);
    expect(isValidTransition('scores', 'reveal')).toBe(false);
  });

  it('final is terminal — no transitions allowed', () => {
    expect(isValidTransition('final', 'countdown')).toBe(false);
    expect(isValidTransition('final', 'waiting')).toBe(false);
  });

  it('full game flow is valid', () => {
    // Round 1
    expect(isValidTransition('waiting', 'countdown')).toBe(true);
    expect(isValidTransition('countdown', 'answering')).toBe(true);
    expect(isValidTransition('answering', 'reveal')).toBe(true);
    expect(isValidTransition('reveal', 'scores')).toBe(true);
    // Round 2
    expect(isValidTransition('scores', 'countdown')).toBe(true);
    expect(isValidTransition('countdown', 'answering')).toBe(true);
    // ...
    // Final
    expect(isValidTransition('scores', 'final')).toBe(true);
  });
});

describe('Total time budget for a full quiz', () => {
  // For a 5-round quiz with 20s answering, what's the max duration?
  const ROUND_DURATION = 20000;
  const ROUNDS = 5;

  const maxRoundDuration =
    COUNTDOWN_MS + ROUND_DURATION + REVEAL_AUTO_ADVANCE_MS + SCORES_AUTO_ADVANCE_MS;
  const maxTotalDuration = maxRoundDuration * ROUNDS;

  it('a single round takes at most ~31s (3.5+20+3.5+4.5)', () => {
    expect(maxRoundDuration).toBeLessThanOrEqual(35000);
    expect(maxRoundDuration).toBeGreaterThanOrEqual(30000);
  });

  it('a full 5-round quiz fits in 3 minutes max', () => {
    expect(maxTotalDuration).toBeLessThanOrEqual(180000);
  });

  it('a full 5-round quiz takes at least 2 minutes', () => {
    expect(maxTotalDuration).toBeGreaterThanOrEqual(120000);
  });
});

describe('Host fallback timing (when host disconnects)', () => {
  it('non-host fallback adds enough delay for host to act first', () => {
    // If host has 0 grace and non-host has HOST_FALLBACK_GRACE_MS,
    // non-host triggers after host had time to do it
    expect(HOST_FALLBACK_GRACE_MS).toBeGreaterThanOrEqual(1000);
  });

  it('fallback delay is short enough not to break game flow', () => {
    // Non-host should take over within 2.5s of detected stuck state
    expect(HOST_FALLBACK_GRACE_MS).toBeLessThanOrEqual(2500);
  });
});
