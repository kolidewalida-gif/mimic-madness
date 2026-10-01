import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { playMenuBubblePop } from '../menuBubbleSound';
import { getSharedAudioContext } from '../audioUnlock';
import { getSoundEffectsVolume } from '@/hooks/useSoundEffectsVolume';

vi.mock('../audioUnlock', () => ({ getSharedAudioContext: vi.fn() }));
vi.mock('@/hooks/useSoundEffectsVolume', () => ({ getSoundEffectsVolume: vi.fn() }));
const param = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
const node = () => ({ connect: vi.fn(), disconnect: vi.fn() });
const fakeContext = () => ({
  currentTime: 1, destination: {}, state: 'running', resume: vi.fn(() => Promise.resolve()),
  createGain: vi.fn(() => ({ ...node(), gain: param() })),
  createBiquadFilter: vi.fn(() => ({ ...node(), type: '', frequency: param(), Q: param() })),
  createStereoPanner: vi.fn(() => ({ ...node(), pan: param() })),
  createOscillator: vi.fn(() => ({ ...node(), type: '', frequency: param(), start: vi.fn(), stop: vi.fn(), onended: null as null | (() => void) })),
});
let ctx: ReturnType<typeof fakeContext>;
beforeEach(() => {
  vi.clearAllMocks(); ctx = fakeContext();
  vi.mocked(getSharedAudioContext).mockReturnValue(ctx as unknown as AudioContext);
  vi.mocked(getSoundEffectsVolume).mockReturnValue(.5);
});
afterEach(() => vi.restoreAllMocks());

describe('Rubbery menu pop', () => {
  it('respects mute without even creating an audio context', () => {
    vi.mocked(getSoundEffectsVolume).mockReturnValue(0);
    playMenuBubblePop(100, .5, 0);
    expect(getSharedAudioContext).not.toHaveBeenCalled();
  });
  it('respects the SFX volume and plays two short, rounded sine voices', () => {
    playMenuBubblePop(100, .5, 1);
    expect(ctx.createGain.mock.results[0].value.gain.value).toBeCloseTo(.275);
    expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
    ctx.createOscillator.mock.results.forEach(({ value }) => {
      expect(value.type).toBe('sine');
      expect(value.start).toHaveBeenCalled();
      expect(value.stop.mock.calls[0][0]).toBeLessThan(1.2);
    });
  });
  it('uses a lower pitch for a larger bubble', () => {
    playMenuBubblePop(44, .5, 1);
    const smallPitch = ctx.createOscillator.mock.results[0].value.frequency.setValueAtTime.mock.calls[0][0];
    playMenuBubblePop(170, .5, 1);
    const largePitch = ctx.createOscillator.mock.results[2].value.frequency.setValueAtTime.mock.calls[0][0];
    expect(largePitch).toBeLessThan(smallPitch);
  });
  it('disconnects every temporary node after playback', () => {
    playMenuBubblePop(100, .1, 1);
    ctx.createOscillator.mock.results.forEach(({ value }) => value.onended?.());
    [...ctx.createGain.mock.results, ...ctx.createBiquadFilter.mock.results, ...ctx.createStereoPanner.mock.results, ...ctx.createOscillator.mock.results].forEach(({ value }) => expect(value.disconnect).toHaveBeenCalledTimes(1));
  });
  it('works without stereo panning or audio support', () => {
    Object.assign(ctx, { createStereoPanner: undefined });
    expect(() => playMenuBubblePop(100, .5, 1)).not.toThrow();
    expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
    vi.mocked(getSharedAudioContext).mockReturnValue(null);
    expect(() => playMenuBubblePop(100, .5, 1)).not.toThrow();
  });
  it('does not queue sounds from a hidden page', () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    playMenuBubblePop(100, .5, 1);
    expect(getSharedAudioContext).not.toHaveBeenCalled();
  });
  it.each(['suspended', 'interrupted'])('resumes a %s context inside the gesture before scheduling audio', async state => {
    ctx.state = state;
    ctx.resume.mockImplementation(async () => { ctx.state = 'running'; });
    playMenuBubblePop(100, .5, 1);
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    expect(ctx.createOscillator).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
  });
  it('does not replay an old pop after a slow browser unlock', async () => {
    ctx.state = 'suspended';
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    ctx.resume.mockImplementation(async () => { ctx.state = 'running'; now.mockReturnValue(300); });
    playMenuBubblePop(100, .5, 1);
    await Promise.resolve();
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });
  it.each(['hidden', 'muted'])('drops delayed playback when the page becomes %s', async mode => {
    ctx.state = 'suspended';
    ctx.resume.mockImplementation(async () => {
      ctx.state = 'running';
      if (mode === 'hidden') vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
      else vi.mocked(getSoundEffectsVolume).mockReturnValue(0);
    });
    playMenuBubblePop(100, .5, 1);
    await Promise.resolve();
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });
  it('keeps only the latest pop while a context is unlocking', async () => {
    ctx.state = 'suspended';
    playMenuBubblePop(100, .1, 1);
    playMenuBubblePop(100, .9, 1);
    ctx.state = 'running';
    await Promise.resolve();
    expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
    expect(ctx.createStereoPanner.mock.results[0].value.pan.value).toBeGreaterThan(0);
  });
  it('handles refused autoplay and a closed context without throwing', async () => {
    ctx.state = 'suspended';
    ctx.resume.mockRejectedValue(new Error('NotAllowedError'));
    expect(() => playMenuBubblePop(100, .5, 1)).not.toThrow();
    await Promise.resolve(); await Promise.resolve();
    expect(ctx.createOscillator).not.toHaveBeenCalled();
    ctx.state = 'closed';
    ctx.resume.mockClear();
    playMenuBubblePop(100, .5, 1);
    expect(ctx.resume).not.toHaveBeenCalled();
  });
});
