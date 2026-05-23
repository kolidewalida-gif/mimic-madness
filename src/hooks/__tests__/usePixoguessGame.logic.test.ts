import { describe, it, expect } from 'vitest';

/**
 * Pure logic tests for BlurRush (Pixoguess) — no React, no Supabase.
 * These cover the algorithms that determine correctness, scoring, and timing.
 */

const ROUND_DURATION_MS = 20000;
const PIXELATION_STEPS = 20;

// Replicas of the pure helpers from usePixoguessGame.tsx
const calculatePointsFromTime = (timeMs: number): number => {
  const ratio = Math.max(0, Math.min(1, timeMs / ROUND_DURATION_MS));
  return Math.round(100 - ratio * 90);
};

const normalizeAnswer = (answer: string): string =>
  answer
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

const isGuessCorrect = (
  guess: string,
  correctAnswer: string,
  acceptable: string[] = []
): boolean => {
  const ng = normalizeAnswer(guess);
  const na = normalizeAnswer(correctAnswer);
  const accNorm = acceptable.map(normalizeAnswer);
  return (
    (na.length > 0 && (ng === na || ng.includes(na))) ||
    accNorm.some((a) => a.length > 0 && (ng === a || ng.includes(a)))
  );
};

const computePixelLevel = (elapsedMs: number): number => {
  const progress = Math.max(0, Math.min(1, elapsedMs / ROUND_DURATION_MS));
  return Math.max(1, Math.min(PIXELATION_STEPS, Math.ceil(PIXELATION_STEPS * (1 - progress))));
};

describe('calculatePointsFromTime — scoring fairness', () => {
  it('gives 100 points at t=0', () => {
    expect(calculatePointsFromTime(0)).toBe(100);
  });

  it('gives 10 points at t=ROUND_DURATION_MS', () => {
    expect(calculatePointsFromTime(ROUND_DURATION_MS)).toBe(10);
  });

  it('gives ~55 points at t=ROUND_DURATION_MS/2', () => {
    expect(calculatePointsFromTime(ROUND_DURATION_MS / 2)).toBe(55);
  });

  it('clamps negative time to 100', () => {
    expect(calculatePointsFromTime(-1000)).toBe(100);
  });

  it('clamps over-time to 10', () => {
    expect(calculatePointsFromTime(ROUND_DURATION_MS * 2)).toBe(10);
  });

  it('is monotonically decreasing with time', () => {
    for (let t = 0; t < ROUND_DURATION_MS; t += 500) {
      expect(calculatePointsFromTime(t)).toBeGreaterThanOrEqual(
        calculatePointsFromTime(t + 500)
      );
    }
  });

  it('returns integer values', () => {
    for (let t = 0; t <= ROUND_DURATION_MS; t += 100) {
      const pts = calculatePointsFromTime(t);
      expect(Number.isInteger(pts)).toBe(true);
    }
  });
});

describe('normalizeAnswer — French/accent handling', () => {
  it('strips accents', () => {
    expect(normalizeAnswer('Pokémon')).toBe('pokemon');
    expect(normalizeAnswer('café')).toBe('cafe');
    expect(normalizeAnswer('Légende')).toBe('legende');
  });

  it('strips spaces and punctuation', () => {
    expect(normalizeAnswer('One Piece')).toBe('onepiece');
    expect(normalizeAnswer("L'Attaque des Titans")).toBe('lattaquedestitans');
    expect(normalizeAnswer('Star Wars: Episode IV')).toBe('starwarsepisodeiv');
  });

  it('lowercases', () => {
    expect(normalizeAnswer('NARUTO')).toBe('naruto');
    expect(normalizeAnswer('GTA V')).toBe('gtav');
  });

  it('handles empty/whitespace', () => {
    expect(normalizeAnswer('')).toBe('');
    expect(normalizeAnswer('   ')).toBe('');
    expect(normalizeAnswer('\n\t')).toBe('');
  });

  it('preserves alphanumerics in mixed strings', () => {
    expect(normalizeAnswer('Halo 5')).toBe('halo5');
    expect(normalizeAnswer('FIFA 23')).toBe('fifa23');
  });
});

describe('isGuessCorrect — answer matching rules', () => {
  it('accepts exact match', () => {
    expect(isGuessCorrect('naruto', 'Naruto')).toBe(true);
    expect(isGuessCorrect('one piece', 'One Piece')).toBe(true);
  });

  it('accepts accent-insensitive match', () => {
    expect(isGuessCorrect('pokemon', 'Pokémon')).toBe(true);
    expect(isGuessCorrect('Pokémon', 'pokemon')).toBe(true);
  });

  it('accepts conversational guess containing the answer', () => {
    expect(isGuessCorrect("c'est naruto", 'Naruto')).toBe(true);
    expect(isGuessCorrect('je crois que c est one piece', 'One Piece')).toBe(true);
  });

  it('rejects partial guess that is a prefix of the answer', () => {
    expect(isGuessCorrect('one', 'One Piece')).toBe(false);
    expect(isGuessCorrect('star', 'Star Wars')).toBe(false);
  });

  it('rejects unrelated guess', () => {
    expect(isGuessCorrect('bleach', 'Naruto')).toBe(false);
    expect(isGuessCorrect('pizza', 'Naruto')).toBe(false);
  });

  it('uses acceptable_answers list', () => {
    expect(isGuessCorrect('snk', "L'Attaque des Titans", ['SNK', 'Attack on Titan']))
      .toBe(true);
    expect(isGuessCorrect('attack on titan', "L'Attaque des Titans", ['Attack on Titan']))
      .toBe(true);
  });

  it('handles empty input gracefully', () => {
    expect(isGuessCorrect('', 'Naruto')).toBe(false);
    expect(isGuessCorrect('   ', 'Naruto')).toBe(false);
  });

  it('rejects empty answer (edge case)', () => {
    // Empty normalized answer should not match any guess
    expect(isGuessCorrect('naruto', '')).toBe(false);
  });
});

describe('computePixelLevel — pixelation curve sync', () => {
  it('starts at full pixelation (level 20)', () => {
    expect(computePixelLevel(0)).toBe(PIXELATION_STEPS);
  });

  it('ends at level 1 at round end', () => {
    expect(computePixelLevel(ROUND_DURATION_MS)).toBe(1);
  });

  it('clamps to level 1 after round end', () => {
    expect(computePixelLevel(ROUND_DURATION_MS * 2)).toBe(1);
  });

  it('is monotonically decreasing', () => {
    for (let t = 0; t < ROUND_DURATION_MS; t += 200) {
      expect(computePixelLevel(t)).toBeGreaterThanOrEqual(
        computePixelLevel(t + 200)
      );
    }
  });

  it('always returns integer in [1, PIXELATION_STEPS]', () => {
    for (let t = -100; t <= ROUND_DURATION_MS + 1000; t += 250) {
      const lvl = computePixelLevel(t);
      expect(Number.isInteger(lvl)).toBe(true);
      expect(lvl).toBeGreaterThanOrEqual(1);
      expect(lvl).toBeLessThanOrEqual(PIXELATION_STEPS);
    }
  });

  it('is deterministic (same input = same output)', () => {
    expect(computePixelLevel(5000)).toBe(computePixelLevel(5000));
    expect(computePixelLevel(12345)).toBe(computePixelLevel(12345));
  });
});

describe('multiplayer fairness — scoring scenarios', () => {
  it('faster guess wins more points', () => {
    const fastPoints = calculatePointsFromTime(2000);
    const slowPoints = calculatePointsFromTime(15000);
    expect(fastPoints).toBeGreaterThan(slowPoints);
  });

  it('points are time-based, not order-based', () => {
    // Two players guessing at the same time get the same points
    expect(calculatePointsFromTime(5000)).toBe(calculatePointsFromTime(5000));
  });

  it('round-end guesses still get minimum points', () => {
    expect(calculatePointsFromTime(ROUND_DURATION_MS - 100)).toBeGreaterThanOrEqual(10);
  });
});

describe('edge cases — input safety', () => {
  it('handles very long guess', () => {
    const longGuess = 'a'.repeat(1000);
    expect(isGuessCorrect(longGuess, 'Naruto')).toBe(false);
  });

  it('handles unicode emoji', () => {
    expect(isGuessCorrect('🎮 naruto 🎮', 'Naruto')).toBe(true);
  });

  it('handles numeric answers', () => {
    expect(isGuessCorrect('2001', '2001 A Space Odyssey')).toBe(false);
    expect(isGuessCorrect('2001 a space odyssey', '2001 A Space Odyssey')).toBe(true);
  });

  it('handles answer with only special chars (degenerate)', () => {
    // Such an answer would normalize to empty — should not match anything
    expect(isGuessCorrect('test', '...!!!')).toBe(false);
  });
});
