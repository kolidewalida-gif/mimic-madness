import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  functionsInvoke: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: mocks.functionsInvoke },
  },
}));

let transcribeWithAssemblyAi: typeof import('@/lib/rhythmo/assemblyai').transcribeWithAssemblyAi;
let toRhythmoWords: typeof import('@/lib/rhythmo/assemblyai').toRhythmoWords;
let AssemblyAiUnavailableError: typeof import('@/lib/rhythmo/assemblyai').AssemblyAiUnavailableError;

const AUDIO_URL = 'https://example.supabase.co/storage/v1/object/public/video-challenges/p/c.mp4';

/** Réponse de dépôt acceptée par le client. */
const submitted = { data: { ok: true, id: 'transcript-123456' }, error: null };

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();

  const module = await import('@/lib/rhythmo/assemblyai');
  transcribeWithAssemblyAi = module.transcribeWithAssemblyAi;
  toRhythmoWords = module.toRhythmoWords;
  AssemblyAiUnavailableError = module.AssemblyAiUnavailableError;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('conversion des mots AssemblyAI', () => {
  it('convertit les millisecondes en secondes', () => {
    // Le piège central de cette intégration : AssemblyAI renvoie des
    // millisecondes, toute la bande rythmo raisonne en secondes. Sans la
    // division, la bande est inexploitable sans qu'aucune erreur ne soit levée.
    expect(
      toRhythmoWords([
        { text: 'salut', startMs: 1_500, endMs: 1_900 },
        { text: 'toi', startMs: 2_000, endMs: 2_450 },
      ]),
    ).toEqual([
      { text: 'salut', start: 1.5, end: 1.9 },
      { text: 'toi', start: 2, end: 2.45 },
    ]);
  });

  it('trie par temps de début et écarte les entrées inutilisables', () => {
    expect(
      toRhythmoWords([
        { text: 'deux', startMs: 2_000, endMs: 2_500 },
        { text: '   ', startMs: 100, endMs: 200 },
        { text: 'un', startMs: 1_000, endMs: 1_500 },
        { text: 'négatif', startMs: -50, endMs: 10 },
        { text: 'inversé', startMs: 5_000, endMs: 4_000 },
        { text: 'nan', startMs: Number.NaN, endMs: 10 },
        { startMs: 10, endMs: 20 },
        null,
      ]),
    ).toEqual([
      { text: 'un', start: 1, end: 1.5 },
      { text: 'deux', start: 2, end: 2.5 },
    ]);
  });

  it('renvoie une liste vide pour une charge non conforme', () => {
    expect(toRhythmoWords(undefined)).toEqual([]);
    expect(toRhythmoWords('pas un tableau')).toEqual([]);
  });
});

describe('transcription distante', () => {
  it('dépose puis interroge jusqu’au statut terminé', async () => {
    mocks.functionsInvoke
      .mockResolvedValueOnce(submitted)
      .mockResolvedValueOnce({
        data: {
          ok: true,
          status: 'completed',
          words: [{ text: 'bonjour', startMs: 320, endMs: 800 }],
          language: 'fr',
          audioDuration: 12,
        },
        error: null,
      });

    const result = await transcribeWithAssemblyAi(AUDIO_URL);

    expect(result.words).toEqual([{ text: 'bonjour', start: 0.32, end: 0.8 }]);
    expect(result.language).toBe('fr');
    expect(result.duration).toBe(12);

    expect(mocks.functionsInvoke).toHaveBeenNthCalledWith(1, 'transcribe-clip', {
      body: { audioUrl: AUDIO_URL, languageCode: undefined },
    });
    expect(mocks.functionsInvoke).toHaveBeenNthCalledWith(2, 'transcribe-clip-status', {
      body: { id: 'transcript-123456' },
    });
  });

  it('repatiente sur les statuts intermédiaires', async () => {
    vi.useFakeTimers();
    mocks.functionsInvoke
      .mockResolvedValueOnce(submitted)
      .mockResolvedValueOnce({ data: { ok: true, status: 'queued' }, error: null })
      .mockResolvedValueOnce({ data: { ok: true, status: 'processing' }, error: null })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          status: 'completed',
          words: [{ text: 'ok', startMs: 0, endMs: 500 }],
        },
        error: null,
      });

    const promise = transcribeWithAssemblyAi(AUDIO_URL);
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(promise).resolves.toMatchObject({
      words: [{ text: 'ok', start: 0, end: 0.5 }],
    });
    // 1 dépôt + 3 interrogations.
    expect(mocks.functionsInvoke).toHaveBeenCalledTimes(4);
  });

  it('signale une clé absente comme indisponibilité, pour laisser le repli local', async () => {
    mocks.functionsInvoke.mockResolvedValueOnce({
      data: { ok: false, reason: 'not-configured' },
      error: null,
    });

    const error = await transcribeWithAssemblyAi(AUDIO_URL).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AssemblyAiUnavailableError);
    expect(error).toMatchObject({ reason: 'not-configured' });
  });

  it('traite une réponse de fonction non exploitable comme indisponibilité', async () => {
    // Un client Supabase qui ne renvoie rien ne doit pas casser le pipeline :
    // sans ce filet, un TypeError remontait au lieu de déclencher le repli.
    mocks.functionsInvoke.mockResolvedValueOnce(undefined);

    const error = await transcribeWithAssemblyAi(AUDIO_URL).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AssemblyAiUnavailableError);
  });

  it('remonte une erreur du fournisseur comme indisponibilité', async () => {
    mocks.functionsInvoke.mockResolvedValueOnce(submitted).mockResolvedValueOnce({
      data: { ok: true, status: 'error', message: 'audio illisible' },
      error: null,
    });

    const error = await transcribeWithAssemblyAi(AUDIO_URL).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AssemblyAiUnavailableError);
    expect(error).toMatchObject({ reason: 'provider-error', message: 'audio illisible' });
  });

  it('remonte un échec d’appel de la fonction comme indisponibilité', async () => {
    mocks.functionsInvoke.mockResolvedValueOnce({
      data: null,
      error: new Error('Failed to fetch'),
    });

    const error = await transcribeWithAssemblyAi(AUDIO_URL).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AssemblyAiUnavailableError);
    expect(error).toMatchObject({ reason: 'invoke' });
  });

  it('abandonne proprement quand le signal est annulé pendant l’attente', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    mocks.functionsInvoke
      .mockResolvedValueOnce(submitted)
      .mockResolvedValue({ data: { ok: true, status: 'processing' }, error: null });

    const promise = transcribeWithAssemblyAi(AUDIO_URL, { signal: controller.signal });
    const assertion = expect(promise).rejects.toMatchObject({ reason: 'cancelled' });

    await vi.advanceTimersByTimeAsync(100);
    controller.abort();
    await assertion;
  });

  it('renonce après le plafond de temps plutôt que d’interroger sans fin', async () => {
    vi.useFakeTimers();
    mocks.functionsInvoke
      .mockResolvedValueOnce(submitted)
      .mockResolvedValue({ data: { ok: true, status: 'processing' }, error: null });

    const promise = transcribeWithAssemblyAi(AUDIO_URL);
    const assertion = expect(promise).rejects.toMatchObject({ reason: 'timeout' });

    await vi.advanceTimersByTimeAsync(6 * 60_000);
    await assertion;
  });
});
