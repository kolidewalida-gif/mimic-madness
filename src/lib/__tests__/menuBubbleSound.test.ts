import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { playMenuBubblePop } from '../menuBubbleSound';
import { getSharedAudioContext } from '../audioUnlock';
import { getSoundEffectsVolume } from '@/hooks/useSoundEffectsVolume';

vi.mock('../audioUnlock', () => ({ getSharedAudioContext: vi.fn() }));
vi.mock('@/hooks/useSoundEffectsVolume', () => ({ getSoundEffectsVolume: vi.fn() }));
const param = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
const node = () => ({ connect: vi.fn(), disconnect: vi.fn() });
const fakeContext = () => ({
  currentTime: 1, destination: {},
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
});
