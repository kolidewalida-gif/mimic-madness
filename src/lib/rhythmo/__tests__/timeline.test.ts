import { describe, expect, it } from 'vitest';
import {
  findActiveRhythmoWord,
  getRhythmoStripOffset,
  getRhythmoTimelineTime,
  sanitizeRhythmoLeadSeconds,
} from '@/lib/rhythmo/timeline';

const words = [
  { start: 0.5, end: 1.2 },
  { start: 1.8, end: 2.2 },
  { start: 3, end: 3.5 },
];

describe('rhythmo media clock', () => {
  it('keeps exact video.currentTime alignment with the default lead', () => {
    expect(getRhythmoTimelineTime(4.25)).toBe(4.25);
  });

  it('applies a configurable positive lead to video.currentTime', () => {
    expect(getRhythmoTimelineTime(4.25, 0.35)).toBeCloseTo(4.6);
  });

  it('neutralizes negative and non-finite lead values', () => {
    expect(sanitizeRhythmoLeadSeconds(-1)).toBe(0);
    expect(sanitizeRhythmoLeadSeconds(Number.NaN)).toBe(0);
    expect(getRhythmoTimelineTime(Number.POSITIVE_INFINITY, 0.4)).toBe(0.4);
  });

  it('positions the strip from the shared timeline time', () => {
    const timelineTime = getRhythmoTimelineTime(1.5, 0.5);
    expect(getRhythmoStripOffset(100, timelineTime, 100)).toBe(-100);
  });
});

describe('rhythmo active word', () => {
  it('uses inclusive word boundaries', () => {
    expect(findActiveRhythmoWord(words, 1.8)).toBe(1);
    expect(findActiveRhythmoWord(words, 2.2)).toBe(1);
  });

  it('returns no word between timed spans', () => {
    expect(findActiveRhythmoWord(words, 1.5)).toBe(-1);
  });

  it('rescans earlier words after a backwards seek', () => {
    expect(findActiveRhythmoWord(words, 0.9, 2)).toBe(0);
  });
});
