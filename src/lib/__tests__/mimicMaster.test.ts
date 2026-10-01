import { describe, expect, it } from 'vitest';
import { masterAvailability, scoreMimicMasters, formatMasterPoints, type MimicMasterChoice } from '../mimicMaster';

const choice = (voter: string, target: string): MimicMasterChoice => ({ voterPlayerId: voter,
  targetPlayerIds: [target], targetTeamNumber: null, voterTeamNumber: null });
const target = { playerIds: ['b'], clipIds: ['clip'], userVote: null };

describe('Mimic Master eligibility', () => {
  it('works independently of a regular vote', () => {
    expect(masterAvailability({ ...target, userVote: 'like' }, 'a', true, null)).toBe('available');
    expect(masterAvailability({ ...target, userVote: 'dislike' }, 'a', true, null)).toBe('available');
  });
  it('rejects own imitation, own duo, missing recordings and uncertified sessions', () => {
    expect(masterAvailability(target, 'b', true, null)).toBe('own');
    expect(masterAvailability({ ...target, playerIds: ['b', 'a'], clipIds: ['clip', null] }, 'a', true, null)).toBe('own');
    expect(masterAvailability({ ...target, clipIds: [null] }, 'a', true, null)).toBe('no-audio');
    expect(masterAvailability(target, 'a', false, null)).toBe('not-ready');
  });
  it('keeps a saved award consumed on every subsequent imitation', () => {
    expect(masterAvailability(target, 'a', true, choice('a', 'b'))).toBe('selected');
    expect(masterAvailability(target, 'a', true, choice('a', 'c'))).toBe('used');
  });
  it('identifies a whole duo regardless of member order', () => {
    expect(masterAvailability({ ...target, playerIds: ['d', 'c'], clipIds: [null, 'clip'] }, 'a', true,
      { ...choice('a', 'c'), targetPlayerIds: ['c', 'd'], targetTeamNumber: 2, voterTeamNumber: 1 })).toBe('selected');
  });
});

describe('Mimic Master score scale', () => {
  const units = [{ key: 'a', baseScore: 2 }, { key: 'b', baseScore: 3 }, { key: 'c', baseScore: -3 }];
  it('adds one to the recipient and half of the raw vote score to its picker', () => {
    const scores = scoreMimicMasters(units, [choice('a', 'b')], false);
    expect(scores.get('a')).toMatchObject({ predictionBonus: 1.5, score: 3.5 });
    expect(scores.get('b')).toMatchObject({ masterCount: 1, score: 4 });
  });
  it('allows negative predictor bonuses and zero base scores', () => {
    expect(scoreMimicMasters(units, [choice('a', 'c')], false).get('a')?.score).toBe(.5);
    const scores = scoreMimicMasters([{ key: 'a', baseScore: 0 }, { key: 'b', baseScore: 0 }], [choice('a', 'b')], false);
    expect(scores.get('a')?.score).toBe(0);
    expect(scores.get('b')?.score).toBe(1);
  });
  it('does not calculate bonuses recursively or mutate the raw score input', () => {
    const scores = scoreMimicMasters(units, [choice('a', 'b'), choice('b', 'a')], false);
    expect(scores.get('a')?.score).toBe(4.5);
    expect(scores.get('b')?.score).toBe(5);
    expect(units[0].baseScore).toBe(2);
  });
  it('ignores self-awards, unknown targets and duplicated round choices', () => {
    const scores = scoreMimicMasters(units, [choice('a', 'a'), choice('b', 'unknown'), choice('c', 'b'), choice('c', 'a')], false);
    expect(scores.get('a')?.score).toBe(2);
    expect(scores.get('b')?.score).toBe(4);
    expect(scores.get('c')?.score).toBe(-1.5);
  });
  it('counts a crown once per duo, not once per member', () => {
    const awards = ['a', 'b'].map(voter => ({ ...choice(voter, 'c'), targetPlayerIds: ['c', 'd'], targetTeamNumber: 2, voterTeamNumber: 1 }));
    const scores = scoreMimicMasters([{ key: '1', baseScore: 2 }, { key: '2', baseScore: 4 }], awards, true);
    expect(scores.get('1')).toMatchObject({ predictionBonus: 4, score: 6 });
    expect(scores.get('2')).toMatchObject({ masterCount: 2, score: 6 });
  });
  it('formats half points and losses clearly in French', () => {
    expect(formatMasterPoints(1.5)).toBe('+1,5');
    expect(formatMasterPoints(-.5)).toBe('-0,5');
    expect(formatMasterPoints(0)).toBe('0');
  });
});
