import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  extractMonoPcm: vi.fn(),
  saveRhythmoTrack: vi.fn(),
  postMessage: vi.fn(),
  terminate: vi.fn(),
  functionsInvoke: vi.fn(),
}));

vi.mock('@/lib/rhythmo/audio', () => ({
  extractMonoPcm: mocks.extractMonoPcm,
  WHISPER_SAMPLE_RATE: 16_000,
}));

vi.mock('@/lib/rhythmo/store', () => ({
  saveRhythmoTrack: mocks.saveRhythmoTrack,
}));

// Keep the Gemini text-refinement call offline and deterministic. By default it
// declines to refine, so tests observe Whisper's raw output.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: mocks.functionsInvoke },
  },
}));

type Listener = (event: MessageEvent) => void;

class FakeWorker {
  static instances: FakeWorker[] = [];
  listeners = new Map<string, Set<Listener>>();
  terminated = false;

  constructor() {
    FakeWorker.instances.push(this);
  }

  addEventListener(type: string, listener: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener);
  }

  postMessage(message: unknown) {
    mocks.postMessage(message);
  }

  terminate() {
    this.terminated = true;
    mocks.terminate();
  }

  emit(data: unknown) {
    for (const listener of this.listeners.get('message') ?? []) {
      listener({ data } as MessageEvent);
    }
  }
}

const lastWorker = () => FakeWorker.instances.at(-1)!;
const lastRunId = () => {
  const calls = mocks.postMessage.mock.calls;
  return (calls.at(-1)?.[0] as { runId: string }).runId;
};

let generateRhythmoTrack: typeof import('@/lib/rhythmo/generate').generateRhythmoTrack;
let releaseRhythmoWorker: typeof import('@/lib/rhythmo/generate').releaseRhythmoWorker;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  FakeWorker.instances = [];
  vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);

  mocks.extractMonoPcm.mockResolvedValue({
    samples: new Float32Array(16_000),
    duration: 1,
  });
  mocks.saveRhythmoTrack.mockResolvedValue(undefined);
  mocks.functionsInvoke.mockResolvedValue({ data: { refined: false }, error: null });

  const generateModule = await import('@/lib/rhythmo/generate');
  generateRhythmoTrack = generateModule.generateRhythmoTrack;
  releaseRhythmoWorker = generateModule.releaseRhythmoWorker;
});

afterEach(() => {
  releaseRhythmoWorker();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const words = [
  { text: 'salut', start: 0.1, end: 0.4 },
  { text: 'toi', start: 0.5, end: 0.8 },
];

describe('rhythmo generation run correlation', () => {
  it('ignores worker messages that belong to a previous run', async () => {
    const promise = generateRhythmoTrack('clip-1', new Blob(['x']), 'clip.mp4');
    await vi.waitFor(() => expect(mocks.postMessage).toHaveBeenCalled());
    const worker = lastWorker();

    // A late message from an earlier generation must not resolve this one.
    worker.emit({ type: 'done', runId: 'stale-run', model: 'stale', words: [] });
    worker.emit({ type: 'model-ready', runId: lastRunId(), model: 'tiny' });
    worker.emit({ type: 'done', runId: lastRunId(), model: 'tiny', words });

    const track = await promise;
    expect(track.model).toBe('tiny');
    expect(track.cues).toHaveLength(1);
  });

  it('applies Gemini-corrected text while keeping Whisper timings', async () => {
    // Gemini returns the same number of words, corrected.
    mocks.functionsInvoke.mockResolvedValue({
      data: { words: ['Salut', 'toi'], refined: true, model: 'gemini-2.5-flash' },
      error: null,
    });

    const promise = generateRhythmoTrack('clip-1', new Blob(['x']), 'clip.mp4');
    await vi.waitFor(() => expect(mocks.postMessage).toHaveBeenCalled());
    const worker = lastWorker();
    worker.emit({ type: 'model-ready', runId: lastRunId(), model: 'tiny' });
    worker.emit({
      type: 'done',
      runId: lastRunId(),
      model: 'tiny',
      words: [
        { text: 'slt', start: 0.1, end: 0.4 },
        { text: 'toi', start: 0.5, end: 0.8 },
      ],
    });

    const track = await promise;
    expect(track.model).toBe('tiny+gemini');
    // Text comes from Gemini, timings stay exactly as Whisper measured them.
    expect(track.cues[0].words).toEqual([
      { text: 'Salut', start: 0.1, end: 0.4 },
      { text: 'toi', start: 0.5, end: 0.8 },
    ]);
  });

  it('keeps Whisper words when Gemini returns a mismatched count', async () => {
    // A wrong-length reply must never be applied (it would desync timings).
    mocks.functionsInvoke.mockResolvedValue({
      data: { words: ['Salut'], refined: true },
      error: null,
    });

    const promise = generateRhythmoTrack('clip-1', new Blob(['x']), 'clip.mp4');
    await vi.waitFor(() => expect(mocks.postMessage).toHaveBeenCalled());
    const worker = lastWorker();
    worker.emit({ type: 'model-ready', runId: lastRunId(), model: 'tiny' });
    worker.emit({ type: 'done', runId: lastRunId(), model: 'tiny', words });

    const track = await promise;
    expect(track.model).toBe('tiny');
    expect(track.cues[0].words.map((w) => w.text)).toEqual(['salut', 'toi']);
  });

  it('publishes the saving phase and persists through the store', async () => {
    const phases: string[] = [];
    const promise = generateRhythmoTrack('clip-1', new Blob(['x']), 'clip.mp4', {
      onProgress: (progress) => phases.push(progress.phase),
    });
    await vi.waitFor(() => expect(mocks.postMessage).toHaveBeenCalled());
    const worker = lastWorker();
    worker.emit({ type: 'model-ready', runId: lastRunId(), model: 'tiny' });
    worker.emit({ type: 'done', runId: lastRunId(), model: 'tiny', words });
    await promise;

    expect(phases).toContain('saving');
    expect(phases.at(-1)).toBe('done');
    expect(mocks.saveRhythmoTrack).toHaveBeenCalledTimes(1);
  });

  it('refuses a second concurrent generation instead of racing the worker', async () => {
    const first = generateRhythmoTrack('clip-1', new Blob(['x']), 'clip.mp4');
    await vi.waitFor(() => expect(mocks.postMessage).toHaveBeenCalled());

    await expect(generateRhythmoTrack('clip-2', new Blob(['y']), 'clip.mp4'))
      .rejects.toMatchObject({ reason: 'engine' });

    const worker = lastWorker();
    worker.emit({ type: 'model-ready', runId: lastRunId(), model: 'tiny' });
    worker.emit({ type: 'done', runId: lastRunId(), model: 'tiny', words });
    await expect(first).resolves.toMatchObject({ clipId: 'clip-1' });
  });

  it('terminates the worker on abort so inference actually stops', async () => {
    const controller = new AbortController();
    const promise = generateRhythmoTrack('clip-1', new Blob(['x']), 'clip.mp4', {
      signal: controller.signal,
    });
    await vi.waitFor(() => expect(mocks.postMessage).toHaveBeenCalled());

    controller.abort();
    await expect(promise).rejects.toMatchObject({ reason: 'cancelled' });
    expect(mocks.terminate).toHaveBeenCalled();
    expect(lastWorker().terminated).toBe(true);
  });

  it('terminates the worker when transcription stops reporting', async () => {
    vi.useFakeTimers();
    const promise = generateRhythmoTrack('clip-1', new Blob(['x']), 'clip.mp4');
    await vi.waitFor(() => expect(mocks.postMessage).toHaveBeenCalled());
    const worker = lastWorker();
    worker.emit({ type: 'model-ready', runId: lastRunId(), model: 'tiny' });

    const assertion = expect(promise).rejects.toMatchObject({ reason: 'engine' });
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    await assertion;
    expect(worker.terminated).toBe(true);
  });

  it('reports no-speech rather than saving an empty band', async () => {
    const promise = generateRhythmoTrack('clip-1', new Blob(['x']), 'clip.mp4');
    await vi.waitFor(() => expect(mocks.postMessage).toHaveBeenCalled());
    const worker = lastWorker();
    worker.emit({ type: 'model-ready', runId: lastRunId(), model: 'tiny' });
    worker.emit({ type: 'done', runId: lastRunId(), model: 'tiny', words: [] });

    await expect(promise).rejects.toMatchObject({ reason: 'no-speech' });
    expect(mocks.saveRhythmoTrack).not.toHaveBeenCalled();
  });

  it('does not advertise an ETA before any run has been measured', async () => {
    localStorage.clear();
    const transcribing: Array<number | undefined> = [];
    const promise = generateRhythmoTrack('clip-1', new Blob(['x']), 'clip.mp4', {
      onProgress: (progress) => {
        if (progress.phase === 'transcribing') transcribing.push(progress.etaMs);
      },
    });
    await vi.waitFor(() => expect(mocks.postMessage).toHaveBeenCalled());
    const worker = lastWorker();
    worker.emit({ type: 'model-ready', runId: lastRunId(), model: 'tiny' });
    // The first run on this device has nothing to base an estimate on.
    expect(transcribing).toEqual([undefined]);

    worker.emit({ type: 'done', runId: lastRunId(), model: 'tiny', words });
    await promise;
  });

  it('records the real measured speed so the next run can estimate', async () => {
    localStorage.clear();
    const realNow = Date.now();
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(realNow);

    const promise = generateRhythmoTrack('clip-1', new Blob(['x']), 'clip.mp4');
    await vi.waitFor(() => expect(mocks.postMessage).toHaveBeenCalled());
    const worker = lastWorker();
    worker.emit({ type: 'model-ready', runId: lastRunId(), model: 'tiny' });

    // One second of audio took three seconds of real inference.
    nowSpy.mockReturnValue(realNow + 3_000);
    worker.emit({ type: 'done', runId: lastRunId(), model: 'tiny', words });
    await promise;

    const stored = Number(localStorage.getItem('mimic-master-rhythmo-ms-per-audio-second-v1'));
    expect(stored).toBeCloseTo(3_000, 0);
    nowSpy.mockRestore();
  });
});
