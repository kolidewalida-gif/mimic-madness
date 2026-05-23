import { describe, it, expect } from 'vitest';
import { calculatePoints, normalizeAnswer, isAnswerCorrect } from '@/hooks/useQuizGame';

/**
 * Pure logic tests for Quiz mode — no React, no Supabase.
 * Covers scoring fairness, answer matching strictness, and edge cases.
 */

describe('calculatePoints — scoring fairness', () => {
  const DURATION = 20000;

  it('gives 10 points at t=0', () => {
    expect(calculatePoints(0, DURATION)).toBe(10);
  });

  it('gives 0 points at t=DURATION', () => {
    expect(calculatePoints(DURATION, DURATION)).toBe(0);
  });

  it('gives 5 points at t=DURATION/2', () => {
    expect(calculatePoints(DURATION / 2, DURATION)).toBe(5);
  });

  it('clamps negative time to 10 (max)', () => {
    expect(calculatePoints(-1000, DURATION)).toBe(10);
  });

  it('clamps over-time to 0', () => {
    expect(calculatePoints(DURATION * 2, DURATION)).toBe(0);
  });

  it('handles zero duration safely (no crash)', () => {
    expect(calculatePoints(1000, 0)).toBe(0);
  });

  it('handles negative duration safely', () => {
    expect(calculatePoints(1000, -100)).toBe(0);
  });

  it('is monotonically decreasing with time', () => {
    for (let t = 0; t < DURATION; t += 500) {
      expect(calculatePoints(t, DURATION)).toBeGreaterThanOrEqual(
        calculatePoints(t + 500, DURATION)
      );
    }
  });

  it('returns integer values', () => {
    for (let t = 0; t <= DURATION; t += 250) {
      expect(Number.isInteger(calculatePoints(t, DURATION))).toBe(true);
    }
  });

  it('two players answering at same time get same score', () => {
    expect(calculatePoints(5000, DURATION)).toBe(calculatePoints(5000, DURATION));
  });
});

describe('normalizeAnswer — French/accent handling', () => {
  it('strips accents', () => {
    expect(normalizeAnswer('Café')).toBe('cafe');
    expect(normalizeAnswer('Légende')).toBe('legende');
    expect(normalizeAnswer('Pokémon')).toBe('pokemon');
  });

  it('lowercases', () => {
    expect(normalizeAnswer('PARIS')).toBe('paris');
    expect(normalizeAnswer('Naruto')).toBe('naruto');
  });

  it('trims whitespace', () => {
    expect(normalizeAnswer('  paris  ')).toBe('paris');
    expect(normalizeAnswer('\nparis\t')).toBe('paris');
  });

  it('collapses multiple spaces to single space', () => {
    expect(normalizeAnswer('one    piece')).toBe('one piece');
    expect(normalizeAnswer('star   wars')).toBe('star wars');
  });

  it('preserves alphanumerics and spaces', () => {
    expect(normalizeAnswer('Halo 5')).toBe('halo 5');
    expect(normalizeAnswer('FIFA 23')).toBe('fifa 23');
  });

  it('strips punctuation', () => {
    expect(normalizeAnswer("L'attaque des Titans")).toBe('lattaque des titans');
    expect(normalizeAnswer('Star Wars: Episode IV')).toBe('star wars episode iv');
  });

  it('handles empty/whitespace', () => {
    expect(normalizeAnswer('')).toBe('');
    expect(normalizeAnswer('   ')).toBe('');
    expect(normalizeAnswer('\n\t')).toBe('');
  });

  it('handles unicode emoji (strips them)', () => {
    expect(normalizeAnswer('🎮 paris 🎮')).toBe('paris');
  });
});

describe('isAnswerCorrect — text mode strictness', () => {
  it('accepts exact match', () => {
    expect(isAnswerCorrect('paris', 'Paris')).toBe(true);
    expect(isAnswerCorrect('Naruto', 'naruto')).toBe(true);
  });

  it('accepts accent-insensitive match', () => {
    expect(isAnswerCorrect('cafe', 'Café')).toBe(true);
    expect(isAnswerCorrect('Pokémon', 'pokemon')).toBe(true);
  });

  it('accepts conversational guess containing the full answer', () => {
    expect(isAnswerCorrect("c'est paris", 'Paris')).toBe(true);
    expect(isAnswerCorrect('je dirais naruto', 'Naruto')).toBe(true);
  });

  it('rejects partial guess (just a prefix or letter)', () => {
    expect(isAnswerCorrect('p', 'Paris')).toBe(false);
    expect(isAnswerCorrect('par', 'Paris')).toBe(false);
    expect(isAnswerCorrect('one', 'One Piece')).toBe(false);
  });

  it('rejects unrelated guess', () => {
    expect(isAnswerCorrect('lyon', 'Paris')).toBe(false);
    expect(isAnswerCorrect('bleach', 'Naruto')).toBe(false);
  });

  it('rejects empty guess', () => {
    expect(isAnswerCorrect('', 'Paris')).toBe(false);
    expect(isAnswerCorrect('   ', 'Paris')).toBe(false);
  });

  it('rejects empty correct answer (degenerate)', () => {
    expect(isAnswerCorrect('paris', '')).toBe(false);
    expect(isAnswerCorrect('anything', '!!!')).toBe(false);
  });

  it('handles very long guess', () => {
    expect(isAnswerCorrect('a'.repeat(1000), 'Paris')).toBe(false);
  });
});

describe('isAnswerCorrect — QCM mode (strict exact match)', () => {
  it('accepts exact match', () => {
    expect(isAnswerCorrect('paris', 'Paris', true)).toBe(true);
  });

  it('accepts accent-insensitive match', () => {
    expect(isAnswerCorrect('cafe', 'Café', true)).toBe(true);
  });

  it('rejects conversational guess (QCM is strict)', () => {
    // In QCM, "c'est paris" is NOT the correct option "Paris"
    expect(isAnswerCorrect("c'est paris", 'Paris', true)).toBe(false);
  });

  it('rejects partial match', () => {
    expect(isAnswerCorrect('p', 'Paris', true)).toBe(false);
    expect(isAnswerCorrect('par', 'Paris', true)).toBe(false);
  });

  it('rejects super-string match (QCM is strict)', () => {
    expect(isAnswerCorrect('parisian', 'Paris', true)).toBe(false);
  });

  it('rejects empty', () => {
    expect(isAnswerCorrect('', 'Paris', true)).toBe(false);
  });
});

describe('isAnswerCorrect — anti-cheat / false positives', () => {
  it("'a' should NOT match 'Paris' (Bug #2 regression)", () => {
    // Old code had `correctAnswer.includes(guess)` which made 'a' match 'paris'
    expect(isAnswerCorrect('a', 'Paris')).toBe(false);
  });

  it("'r' should NOT match 'Paris'", () => {
    expect(isAnswerCorrect('r', 'Paris')).toBe(false);
  });

  it("empty answer should NOT make all guesses correct (Bug #3 regression)", () => {
    expect(isAnswerCorrect('anything', '')).toBe(false);
    expect(isAnswerCorrect('paris', '...!!!')).toBe(false);
  });

  it("guess containing answer is OK ('je dis paris voilà')", () => {
    expect(isAnswerCorrect('je dis paris voila', 'Paris')).toBe(true);
  });

  it("answer containing guess is NOT OK ('par' should not match 'paris')", () => {
    expect(isAnswerCorrect('par', 'Paris')).toBe(false);
  });
});

describe('normalize edge cases', () => {
  it('handles only-punctuation input', () => {
    expect(normalizeAnswer('...!!!')).toBe('');
    expect(normalizeAnswer('???')).toBe('');
  });

  it('handles numbers-only input', () => {
    expect(normalizeAnswer('2001')).toBe('2001');
    expect(normalizeAnswer('1984')).toBe('1984');
  });

  it('handles mixed alphanumeric', () => {
    expect(normalizeAnswer('Halo 5: Guardians')).toBe('halo 5 guardians');
  });
});
