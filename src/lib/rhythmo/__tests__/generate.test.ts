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
let generateRhythmoTrackFromUrl: typeof import('@/lib/rhythmo/generate').generateRhythmoTrackFromUrl;
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
  generateRhythmoTrackFromUrl = generateModule.generateRhythmoTrackFromUrl;
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

  it('retire les mots hallucinés blanchis par Gemini en gardant les timings', async () => {
    // Une chaîne vide = bégaiement ou boucle de répétition à supprimer.
    mocks.functionsInvoke.mockResolvedValue({
      data: { words: ['Salut', ''], refined: true },
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
        { text: 'slt', start: 0.5, end: 0.8 },
      ],
    });

    const track = await promise;
    expect(track.cues[0].words).toEqual([{ text: 'Salut', start: 0.1, end: 0.4 }]);
  });

  it('garde la transcription brute si Gemini veut tout supprimer', async () => {
    mocks.functionsInvoke.mockResolvedValue({
      data: { words: ['', ''], refined: true },
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

describe('génération distante par AssemblyAI', () => {
  const CLIP_URL = 'https://example.supabase.co/storage/v1/object/public/video-challenges/p/c.mp4';

  /** Dépôt accepté, puis transcription déjà terminée. */
  const remoteSuccess = (audioDuration?: number) => {
    mocks.functionsInvoke
      .mockResolvedValueOnce({ data: { ok: true, id: 'transcript-abcdef12' }, error: null })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          status: 'completed',
          words: [
            { text: 'Salut', startMs: 100, endMs: 400 },
            { text: 'toi', startMs: 500, endMs: 800 },
          ],
          language: 'fr',
          audioDuration,
        },
        error: null,
      });
  };

  it('annonce une estimation de temps dès le premier passage', async () => {
    // Sans estimation, le panneau ne montrait plus qu'un chronomètre : c'est la
    // régression signalée après le passage au service distant.
    localStorage.clear();
    remoteSuccess(60);

    const etas: Array<number | undefined> = [];
    const track = await generateRhythmoTrackFromUrl('clip-1', CLIP_URL, {
      durationHint: 60,
      onProgress: (progress) => {
        if (progress.phase === 'transcribing') etas.push(progress.etaMs);
      },
    });

    // Amorce de 350 ms par seconde d'audio : 60 s d'audio -> 21 s annoncées.
    expect(etas).toEqual([21_000]);
    // Millisecondes converties en secondes, sans passe Gemini sur ce chemin.
    expect(track.cues[0].words).toEqual([
      { text: 'Salut', start: 0.1, end: 0.4 },
      { text: 'toi', start: 0.5, end: 0.8 },
    ]);
    expect(track.duration).toBe(60);
    expect(track.language).toBe('fr');
    expect(track.model).toBe('assemblyai-universal-3-5-pro');
  });

  it('reste sans estimation quand la durée est inconnue', async () => {
    localStorage.clear();
    remoteSuccess();

    const etas: Array<number | undefined> = [];
    await generateRhythmoTrackFromUrl('clip-1', CLIP_URL, {
      onProgress: (progress) => {
        if (progress.phase === 'transcribing') etas.push(progress.etaMs);
      },
    });

    // Mieux vaut un chronomètre qu'une estimation inventée.
    expect(etas).toEqual([undefined]);
  });

  it('mesure la vitesse réelle du service pour la prochaine estimation', async () => {
    localStorage.clear();
    const realNow = Date.now();
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(realNow);

    mocks.functionsInvoke
      .mockResolvedValueOnce({ data: { ok: true, id: 'transcript-abcdef12' }, error: null })
      .mockImplementationOnce(() => {
        // 60 s d'audio traitées en 12 s réelles, soit 200 ms par seconde.
        nowSpy.mockReturnValue(realNow + 12_000);
        return Promise.resolve({
          data: {
            ok: true,
            status: 'completed',
            words: [{ text: 'Salut', startMs: 100, endMs: 400 }],
            audioDuration: 60,
          },
          error: null,
        });
      });

    await generateRhythmoTrackFromUrl('clip-1', CLIP_URL, { durationHint: 60 });

    const stored = Number(
      localStorage.getItem('mimic-master-rhythmo-remote-ms-per-audio-second-v1'),
    );
    expect(stored).toBeCloseTo(200, 0);
    nowSpy.mockRestore();
  });

  it('ne mélange pas la vitesse distante avec celle mesurée sur Whisper', async () => {
    localStorage.clear();
    // Une machine lente sur Whisper ne doit pas plomber l'estimation distante.
    localStorage.setItem('mimic-master-rhythmo-ms-per-audio-second-v1', '30000');
    remoteSuccess(60);

    const etas: Array<number | undefined> = [];
    await generateRhythmoTrackFromUrl('clip-1', CLIP_URL, {
      durationHint: 60,
      onProgress: (progress) => {
        if (progress.phase === 'transcribing') etas.push(progress.etaMs);
      },
    });

    expect(etas).toEqual([21_000]);
  });

  it('laisse remonter une indisponibilité sans signaler une erreur au joueur', async () => {
    mocks.functionsInvoke.mockResolvedValueOnce({
      data: { ok: false, reason: 'not-configured' },
      error: null,
    });

    const phases: string[] = [];
    await expect(
      generateRhythmoTrackFromUrl('clip-1', CLIP_URL, {
        onProgress: (progress) => phases.push(progress.phase),
      }),
    ).rejects.toMatchObject({ name: 'AssemblyAiUnavailableError' });

    // Le repli local doit pouvoir s'enchaîner : pas de phase d'erreur affichée,
    // et surtout aucune bande enregistrée.
    expect(phases).not.toContain('error');
    expect(mocks.saveRhythmoTrack).not.toHaveBeenCalled();
  });

  it('signale une absence de parole comme une vraie erreur, sans repli', async () => {
    mocks.functionsInvoke
      .mockResolvedValueOnce({ data: { ok: true, id: 'transcript-abcdef12' }, error: null })
      .mockResolvedValueOnce({
        data: { ok: true, status: 'completed', words: [] },
        error: null,
      });

    const phases: string[] = [];
    await expect(
      generateRhythmoTrackFromUrl('clip-1', CLIP_URL, {
        onProgress: (progress) => phases.push(progress.phase),
      }),
    ).rejects.toMatchObject({ reason: 'no-speech' });

    expect(phases).toContain('error');
    expect(mocks.saveRhythmoTrack).not.toHaveBeenCalled();
  });

  it('libère le verrou pour que le repli local puisse démarrer', async () => {
    mocks.functionsInvoke.mockResolvedValueOnce({
      data: { ok: false, reason: 'not-configured' },
      error: null,
    });

    await expect(generateRhythmoTrackFromUrl('clip-1', CLIP_URL)).rejects.toBeTruthy();

    // Sans libération du verrou de génération, le repli Whisper échouerait avec
    // « une génération est déjà en cours ».
    const promise = generateRhythmoTrack('clip-1', new Blob(['x']), 'clip.mp4');
    await vi.waitFor(() => expect(mocks.postMessage).toHaveBeenCalled());
    const worker = lastWorker();
    worker.emit({ type: 'model-ready', runId: lastRunId(), model: 'tiny' });
    worker.emit({ type: 'done', runId: lastRunId(), model: 'tiny', words });
    await expect(promise).resolves.toMatchObject({ clipId: 'clip-1' });
  });
});
