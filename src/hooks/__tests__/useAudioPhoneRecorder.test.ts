// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioPhoneRecorder } from '@/hooks/useAudioPhoneRecorder';

const noiseMocks = vi.hoisted(() => ({
  processStream: vi.fn(),
}));

vi.mock('@/hooks/useNoiseReduction', () => ({
  processStreamWithNoiseReduction: noiseMocks.processStream,
}));

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];
  static isTypeSupported = vi.fn(() => true);

  state: RecordingState = 'inactive';
  readonly stream: MediaStream;
  readonly mimeType = 'audio/webm';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;

  start = vi.fn(() => {
    this.state = 'recording';
  });

  stop = vi.fn(() => {
    if (this.state === 'inactive') return;
    this.state = 'inactive';
    this.ondataavailable?.({
      data: new Blob(['audio-phone'], { type: this.mimeType }),
    } as BlobEvent);
    this.onstop?.(new Event('stop'));
  });

  constructor(stream: MediaStream) {
    this.stream = stream;
    FakeMediaRecorder.instances.push(this);
  }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];

  state: AudioContextState = 'running';
  readonly source = { connect: vi.fn(), disconnect: vi.fn() };
  readonly analyser = {
    fftSize: 0,
    frequencyBinCount: 8,
    getByteFrequencyData: vi.fn(),
    disconnect: vi.fn(),
  };
  createMediaStreamSource = vi.fn(() => this.source);
  createAnalyser = vi.fn(() => this.analyser);
  close = vi.fn(() => {
    this.state = 'closed';
    return Promise.resolve();
  });

  constructor() {
    FakeAudioContext.instances.push(this);
  }
}

const makeStream = () => {
  const stop = vi.fn();
  const track = { stop } as unknown as MediaStreamTrack;
  const stream = { getTracks: () => [track] } as MediaStream;
  return { stream, stop };
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('useAudioPhoneRecorder lifecycle', () => {
  let getUserMedia: ReturnType<typeof vi.fn>;
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    FakeMediaRecorder.instances = [];
    FakeAudioContext.instances = [];
    getUserMedia = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });

    vi.stubGlobal('MediaRecorder', FakeMediaRecorder as unknown as typeof MediaRecorder);
    vi.stubGlobal('AudioContext', FakeAudioContext as unknown as typeof AudioContext);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 23));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    createObjectURL = vi.fn(() => 'blob:audio-phone-preview');
    revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('arrête un flux micro arrivé après le démontage sans lancer RNNoise', async () => {
    const raw = makeStream();
    let resolveMedia: (stream: MediaStream) => void = () => undefined;
    getUserMedia.mockReturnValue(new Promise<MediaStream>((resolve) => {
      resolveMedia = resolve;
    }));

    const view = renderHook(() => useAudioPhoneRecorder({ maxSeconds: 8 }));
    let startPromise = Promise.resolve();
    act(() => {
      startPromise = view.result.current.startRecording();
    });

    expect(view.result.current.isStarting).toBe(true);
    view.unmount();

    await act(async () => {
      resolveMedia(raw.stream);
      await startPromise;
      await flushMicrotasks();
    });

    expect(raw.stop).toHaveBeenCalled();
    expect(noiseMocks.processStream).not.toHaveBeenCalled();
    expect(FakeMediaRecorder.instances).toHaveLength(0);
  });

  it('nettoie un setup RNNoise qui se termine après un reset de phrase', async () => {
    const raw = makeStream();
    const processed = makeStream();
    const noiseCleanup = vi.fn();
    let resolveNoise: (value: { stream: MediaStream; cleanup: () => void }) => void = () => undefined;
    getUserMedia.mockResolvedValue(raw.stream);
    noiseMocks.processStream.mockReturnValue(new Promise((resolve) => {
      resolveNoise = resolve;
    }));

    const { result } = renderHook(() => useAudioPhoneRecorder({ maxSeconds: 8 }));
    let startPromise = Promise.resolve();
    act(() => {
      startPromise = result.current.startRecording();
    });
    await waitFor(() => expect(noiseMocks.processStream).toHaveBeenCalledOnce());

    const signal = noiseMocks.processStream.mock.calls[0][1].signal as AbortSignal;
    act(() => result.current.resetRecording());
    expect(signal.aborted).toBe(true);
    expect(result.current.isStarting).toBe(false);

    await act(async () => {
      resolveNoise({ stream: processed.stream, cleanup: noiseCleanup });
      await startPromise;
      await flushMicrotasks();
    });

    expect(noiseCleanup).toHaveBeenCalledOnce();
    expect(raw.stop).toHaveBeenCalled();
    expect(processed.stop).toHaveBeenCalled();
    expect(FakeMediaRecorder.instances).toHaveLength(0);
  });

  it('révoque la preview et libère tout le graphe après une prise valide', async () => {
    const raw = makeStream();
    const processed = makeStream();
    const noiseCleanup = vi.fn();
    getUserMedia.mockResolvedValue(raw.stream);
    noiseMocks.processStream.mockResolvedValue({
      stream: processed.stream,
      cleanup: noiseCleanup,
    });

    const { result } = renderHook(() => useAudioPhoneRecorder({ maxSeconds: 8 }));
    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
    expect(FakeMediaRecorder.instances).toHaveLength(1);

    act(() => result.current.stopRecording());
    await waitFor(() => expect(result.current.recordedBlob?.size).toBeGreaterThan(0));
    await waitFor(() => expect(result.current.previewUrl).toBe('blob:audio-phone-preview'));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(noiseCleanup).toHaveBeenCalledOnce();
    expect(raw.stop).toHaveBeenCalled();
    expect(processed.stop).toHaveBeenCalled();
    expect(FakeAudioContext.instances[0].source.disconnect).toHaveBeenCalledOnce();
    expect(FakeAudioContext.instances[0].analyser.disconnect).toHaveBeenCalledOnce();
    expect(FakeAudioContext.instances[0].close).toHaveBeenCalledOnce();

    act(() => result.current.resetRecording());
    await waitFor(() => expect(result.current.previewUrl).toBeNull());
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:audio-phone-preview');
  });
});
