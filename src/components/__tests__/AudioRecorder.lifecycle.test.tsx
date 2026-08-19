// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioRecorder } from '@/components/AudioRecorder';

const mocks = vi.hoisted(() => ({
  applyVoiceFilter: vi.fn(),
  disposeFilter: vi.fn(),
  postProcessRecordedBlob: vi.fn(async (blob: Blob) => blob),
  requiresPostProcessing: vi.fn(() => false),
  uploadVideo: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/lib/voiceFilters', () => ({
  applyVoiceFilter: mocks.applyVoiceFilter,
  postProcessRecordedBlob: mocks.postProcessRecordedBlob,
  requiresPostProcessing: mocks.requiresPostProcessing,
}));

vi.mock('@/lib/videoStorageSupabase', () => ({
  videoStorage: { uploadVideo: mocks.uploadVideo },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/hooks/useSoundEffects', () => ({
  playSoundEffect: vi.fn(),
}));

vi.mock('@/components/InkVoiceFilterPicker', () => ({
  InkVoiceFilterPicker: () => null,
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
    this.state = 'inactive';
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
  readonly analyser = {
    fftSize: 0,
    frequencyBinCount: 8,
    getByteFrequencyData: vi.fn(),
  };
  createAnalyser = vi.fn(() => this.analyser);
  createMediaStreamSource = vi.fn(() => ({ connect: vi.fn() }));
  decodeAudioData = vi.fn(async () => {
    throw new Error('decode unavailable in lifecycle test');
  });
  close = vi.fn(async () => {
    this.state = 'closed';
  });

  constructor() {
    FakeAudioContext.instances.push(this);
  }
}

const flushMicrotasks = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('AudioRecorder lifecycle cleanup', () => {
  let trackStop: ReturnType<typeof vi.fn>;
  let stream: MediaStream;
  let getUserMedia: ReturnType<typeof vi.fn>;
  let cancelAnimationFrameMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    FakeMediaRecorder.instances = [];
    FakeMediaRecorder.isTypeSupported.mockClear();
    FakeAudioContext.instances = [];
    mocks.applyVoiceFilter.mockReset();
    mocks.disposeFilter.mockReset();
    mocks.postProcessRecordedBlob.mockClear();
    mocks.requiresPostProcessing.mockReset().mockReturnValue(false);
    mocks.uploadVideo.mockReset().mockResolvedValue({ id: 'saved-clip' });
    mocks.toast.mockReset();

    trackStop = vi.fn();
    const track = { stop: trackStop } as unknown as MediaStreamTrack;
    stream = {
      getTracks: () => [track],
    } as MediaStream;
    getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });

    mocks.applyVoiceFilter.mockImplementation((input: MediaStream) => ({
      stream: input,
      dispose: mocks.disposeFilter,
    }));

    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 17));
    cancelAnimationFrameMock = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock);
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('stops a getUserMedia stream that resolves after unmount', async () => {
    let resolveMedia: (value: MediaStream) => void = () => undefined;
    getUserMedia.mockReturnValue(new Promise<MediaStream>((resolve) => {
      resolveMedia = resolve;
    }));
    const onAudioSaved = vi.fn();
    const view = render(
      <AudioRecorder playerId="p1" playerName="Joueur" onAudioSaved={onAudioSaved} />,
    );

    fireEvent.click(view.container.querySelector('button') as HTMLButtonElement);
    expect(getUserMedia).toHaveBeenCalledOnce();
    view.unmount();

    resolveMedia(stream);
    await flushMicrotasks();

    expect(trackStop).toHaveBeenCalledOnce();
    expect(FakeMediaRecorder.instances).toHaveLength(0);
    expect(mocks.uploadVideo).not.toHaveBeenCalled();
    expect(onAudioSaved).not.toHaveBeenCalled();
  });

  it('stops recorder, tracks, filter, RAF and context on unmount', async () => {
    const onRecordingStart = vi.fn();
    const onRecordingStop = vi.fn();
    const onAudioSaved = vi.fn();
    const view = render(
      <AudioRecorder
        playerId="p1"
        playerName="Joueur"
        onRecordingStart={onRecordingStart}
        onRecordingStop={onRecordingStop}
        onAudioSaved={onAudioSaved}
      />,
    );

    fireEvent.click(view.container.querySelector('button') as HTMLButtonElement);
    await waitFor(() => expect(FakeMediaRecorder.instances).toHaveLength(1));
    const recorder = FakeMediaRecorder.instances[0];
    expect(recorder.state).toBe('recording');

    view.unmount();
    await new Promise((resolve) => setTimeout(resolve, 220));

    expect(recorder.stop).toHaveBeenCalledOnce();
    expect(recorder.onstop).toBeNull();
    expect(trackStop).toHaveBeenCalledOnce();
    expect(mocks.disposeFilter).toHaveBeenCalledOnce();
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(17);
    expect(FakeAudioContext.instances[0].close).toHaveBeenCalledOnce();
    expect(onRecordingStart).not.toHaveBeenCalled();
    expect(onRecordingStop).not.toHaveBeenCalled();
    expect(mocks.uploadVideo).not.toHaveBeenCalled();
    expect(onAudioSaved).not.toHaveBeenCalled();
  });

  it('keeps the normal stop and auto-save path while cancelling warm-up', async () => {
    const onRecordingStart = vi.fn();
    const onRecordingStop = vi.fn();
    const onAudioSaved = vi.fn();
    const view = render(
      <AudioRecorder
        playerId="p1"
        playerName="Joueur"
        onRecordingStart={onRecordingStart}
        onRecordingStop={onRecordingStop}
        onAudioSaved={onAudioSaved}
      />,
    );

    fireEvent.click(view.container.querySelector('button') as HTMLButtonElement);
    await waitFor(() => expect(FakeMediaRecorder.instances).toHaveLength(1));
    const recorder = FakeMediaRecorder.instances[0];
    recorder.ondataavailable?.({ data: new Blob(['voice'], { type: 'audio/webm' }) } as BlobEvent);

    fireEvent.click(view.getByRole('button', { name: /Arrêter l'enregistrement/i }));
    await waitFor(() => expect(onAudioSaved).toHaveBeenCalledWith({ id: 'saved-clip' }));
    await new Promise((resolve) => setTimeout(resolve, 220));

    expect(onRecordingStop).toHaveBeenCalledOnce();
    expect(onRecordingStart).not.toHaveBeenCalled();
    expect(mocks.uploadVideo).toHaveBeenCalledOnce();
    expect(trackStop).toHaveBeenCalledOnce();
    expect(mocks.disposeFilter).toHaveBeenCalledOnce();
  });
});
