import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { extractMonoPcm, isLikelyDecodable } from '@/lib/rhythmo/audio';
import type { RhythmoProgress } from '@/lib/rhythmo/types';

interface FakeContextOptions {
  /** Never settles, reproducing a decode that hangs on a malformed file. */
  hangDecode?: boolean;
  decodeError?: boolean;
  channels?: number;
  sampleRate?: number;
  duration?: number;
}

const makeAudioBuffer = (options: FakeContextOptions) => {
  const sampleRate = options.sampleRate ?? 48_000;
  const duration = options.duration ?? 0.01;
  const length = Math.max(1, Math.round(sampleRate * duration));
  const channels = options.channels ?? 2;
  return {
    duration,
    length,
    sampleRate,
    numberOfChannels: channels,
    getChannelData: () => new Float32Array(length),
  } as unknown as AudioBuffer;
};

const installWebAudio = (options: FakeContextOptions = {}) => {
  const closed: string[] = [];

  class FakeAudioContext {
    decodeAudioData(): Promise<AudioBuffer> {
      if (options.hangDecode) return new Promise<AudioBuffer>(() => undefined);
      if (options.decodeError) return Promise.reject(new Error('EncodingError'));
      return Promise.resolve(makeAudioBuffer(options));
    }
    close(): Promise<void> {
      closed.push('decode');
      return Promise.resolve();
    }
  }

  class FakeOfflineAudioContext {
    destination = {};
    constructor(public channels: number, public length: number, public rate: number) {}
    createBufferSource() {
      return { buffer: null, connect: () => undefined, start: () => undefined };
    }
    startRendering(): Promise<AudioBuffer> {
      return Promise.resolve(makeAudioBuffer({
        channels: 1,
        sampleRate: this.rate,
        duration: this.length / this.rate,
      }));
    }
  }

  vi.stubGlobal('AudioContext', FakeAudioContext as unknown as typeof AudioContext);
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
  (window as unknown as { OfflineAudioContext: unknown }).OfflineAudioContext =
    FakeOfflineAudioContext;

  return { closed };
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (window as unknown as { OfflineAudioContext?: unknown }).OfflineAudioContext;
});

describe('container support', () => {
  it.each(['clip.mkv', 'clip.avi', 'clip.wmv'])('rejects %s up-front', (name) => {
    expect(isLikelyDecodable(name)).toBe(false);
  });

  it.each(['clip.mp4', 'clip.webm', 'clip.mov'])('accepts %s', (name) => {
    expect(isLikelyDecodable(name)).toBe(true);
  });

  it('fails with a typed reason before touching Web Audio', async () => {
    await expect(extractMonoPcm(new Blob(['x']), 'movie.mkv')).rejects.toMatchObject({
      reason: 'unsupported-container',
    });
  });
});

describe('audio extraction stages', () => {
  it('reports read, decode and resample as distinct real stages', async () => {
    installWebAudio();
    const progress: RhythmoProgress[] = [];
    const result = await extractMonoPcm(new Blob([new Uint8Array(64)]), 'clip.mp4', {
      onProgress: (value) => progress.push(value),
    });

    expect(result.samples.length).toBeGreaterThan(0);
    const phases = progress.map((entry) => entry.phase);
    expect(phases).toContain('reading-media');
    expect(phases).toContain('decoding-audio');
    expect(phases).toContain('resampling-audio');
    expect(phases.indexOf('reading-media')).toBeLessThan(phases.indexOf('decoding-audio'));
    expect(phases.indexOf('decoding-audio')).toBeLessThan(phases.indexOf('resampling-audio'));
    // Read progress must reach the real byte total, not a fabricated 100%.
    const reads = progress.filter((entry) => entry.phase === 'reading-media');
    expect(reads.at(-1)).toMatchObject({ loadedBytes: 64, totalBytes: 64, ratio: 1 });
  });

  it('does not hang forever when decodeAudioData never settles', async () => {
    installWebAudio({ hangDecode: true });
    vi.useFakeTimers();

    const promise = extractMonoPcm(new Blob([new Uint8Array(8)]), 'clip.mp4');
    const assertion = expect(promise).rejects.toMatchObject({
      reason: 'unsupported-container',
    });
    await vi.advanceTimersByTimeAsync(120_000);
    await assertion;
  });

  it('reports a decode failure as an unsupported container', async () => {
    installWebAudio({ decodeError: true });
    await expect(extractMonoPcm(new Blob([new Uint8Array(8)]), 'clip.mp4'))
      .rejects.toMatchObject({ reason: 'unsupported-container' });
  });

  it('rejects a file whose decoded track is empty', async () => {
    installWebAudio({ duration: 0 });
    await expect(extractMonoPcm(new Blob([new Uint8Array(8)]), 'clip.mp4'))
      .rejects.toMatchObject({ reason: 'no-speech' });
  });

  it('stops with a cancelled reason when the signal aborts before reading', async () => {
    installWebAudio();
    const controller = new AbortController();
    controller.abort();

    await expect(extractMonoPcm(new Blob([new Uint8Array(8)]), 'clip.mp4', {
      signal: controller.signal,
    })).rejects.toMatchObject({ reason: 'cancelled' });
  });

  it('resamples to the Whisper rate through the cooperative fallback', async () => {
    installWebAudio({ channels: 2, sampleRate: 48_000, duration: 0.05 });
    delete (window as unknown as { OfflineAudioContext?: unknown }).OfflineAudioContext;

    const progress: RhythmoProgress[] = [];
    const result = await extractMonoPcm(new Blob([new Uint8Array(16)]), 'clip.mp4', {
      onProgress: (value) => progress.push(value),
    });

    expect(result.samples.length).toBe(Math.ceil(0.05 * 16_000));
    const resamples = progress.filter((entry) => entry.phase === 'resampling-audio');
    expect(resamples.at(-1)).toMatchObject({ ratio: 1 });
  });
});
