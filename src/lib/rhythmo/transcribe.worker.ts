/// <reference lib="webworker" />
/**
 * Whisper transcription worker.
 *
 * Runs entirely on the player's machine: no API, no key, no server, no quota.
 * The model is fetched once from the Hugging Face CDN and then served from the
 * browser cache.
 *
 * It lives in a worker for two reasons: inference would otherwise freeze the
 * UI for tens of seconds, and keeping the `@huggingface/transformers` import
 * confined here means Vite emits it as a separate chunk that the menu bundle
 * never loads.
 *
 * Word-level timestamps require a model exported with the alignment heads —
 * the `_timestamped` variants. A standard Whisper export only yields
 * phrase-level spans, which is not precise enough for a rhythmo band.
 */

/** Multilingual, ~80 MB quantised, word-level capable. Good French support. */
const MODEL_ID = 'onnx-community/whisper-base_timestamped';

export interface TranscribeRequest {
  type: 'transcribe';
  /** Mono PCM at 16 kHz. Transferred, not copied. */
  samples: Float32Array;
  /** Forced language code (e.g. 'fr'), or undefined to auto-detect. */
  language?: string;
}

export type WorkerOutbound =
  | { type: 'model-progress'; ratio: number; file?: string }
  /** Any sign of life. Also resets the caller's watchdog. */
  | { type: 'log'; message: string }
  | { type: 'ready'; device: 'webgpu' | 'wasm' }
  | { type: 'transcribing' }
  | {
      type: 'result';
      words: { text: string; start: number; end: number }[];
      language?: string;
      device: 'webgpu' | 'wasm';
      model: string;
    }
  | { type: 'error'; reason: 'engine' | 'no-speech' | 'unknown'; message: string };

const post = (message: WorkerOutbound) => self.postMessage(message);

/* ============================================================
   Pipeline, created once and reused across clips
============================================================ */
type Transcriber = (
  input: Float32Array,
  options: Record<string, unknown>,
) => Promise<unknown>;

let transcriberPromise: Promise<{ run: Transcriber; device: 'webgpu' | 'wasm' }> | null = null;

/**
 * Probe for a usable WebGPU adapter.
 *
 * `requestAdapter()` never rejects on some drivers, it just never settles, so
 * it is raced against a timer. Losing the race only costs the WASM path, which
 * is slower but always works.
 */
const hasWebGPU = async (): Promise<boolean> => {
  const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    const adapter = await Promise.race([
      gpu.requestAdapter(),
      new Promise((resolve) => setTimeout(() => resolve(null), 2_000)),
    ]);
    return adapter != null;
  } catch {
    return false;
  }
};

async function getTranscriber() {
  if (transcriberPromise) return transcriberPromise;

  transcriberPromise = (async () => {
    post({ type: 'log', message: 'chargement du moteur…' });

    const { pipeline, env } = await import('@huggingface/transformers');

    // Models come from the hub; there is no local model directory to probe.
    env.allowLocalModels = false;

    post({ type: 'log', message: 'moteur chargé, préparation du modèle…' });

    // Every status is forwarded, not just `progress`. When the model comes
    // from cache there are no progress events at all, and a bar frozen at 0 %
    // is indistinguishable from a hang.
    const reportProgress = (event: unknown) => {
      const e = event as { status?: string; progress?: number; file?: string; name?: string };
      if (e.status === 'progress' && typeof e.progress === 'number') {
        post({ type: 'model-progress', ratio: Math.max(0, Math.min(1, e.progress / 100)), file: e.file });
      } else if (e.status) {
        post({ type: 'log', message: `${e.status}${e.file ? ` ${e.file}` : ''}` });
      }
    };

    const devices: ('webgpu' | 'wasm')[] = (await hasWebGPU()) ? ['webgpu', 'wasm'] : ['wasm'];
    let lastError: unknown = null;

    for (const device of devices) {
      try {
        post({ type: 'log', message: `initialisation ${device}…` });
        const run = (await pipeline('automatic-speech-recognition', MODEL_ID, {
          device,
          dtype: 'q8',
          progress_callback: reportProgress,
        })) as unknown as Transcriber;
        post({ type: 'ready', device });
        return { run, device };
      } catch (error) {
        // WebGPU can fail on unsupported adapters or missing ops; WASM always
        // works, so a failure here is not fatal.
        lastError = error;
        post({
          type: 'log',
          message: `${device} indisponible: ${error instanceof Error ? error.message : 'erreur'}`,
        });
      }
    }

    transcriberPromise = null;
    throw lastError instanceof Error
      ? lastError
      : new Error('Impossible de charger le modèle de transcription.');
  })();

  return transcriberPromise;
}

/* ============================================================
   Output normalisation

   transformers.js returns `{ text, chunks: [{ text, timestamp: [s, e] }] }`.
   With word-level timestamps each chunk is a word, but the closing timestamp
   is sometimes null on the final chunk, and Whisper occasionally emits empty
   or repeated fragments. Normalise all of that here so the UI can trust it.
============================================================ */
interface RawChunk {
  text?: string;
  timestamp?: [number | null, number | null];
}

function normaliseWords(output: unknown): { text: string; start: number; end: number }[] {
  const chunks = (output as { chunks?: RawChunk[] })?.chunks;
  if (!Array.isArray(chunks)) return [];

  const words: { text: string; start: number; end: number }[] = [];

  for (const chunk of chunks) {
    const text = (chunk.text ?? '').trim();
    if (!text) continue;

    const rawStart = chunk.timestamp?.[0];
    const rawEnd = chunk.timestamp?.[1];
    if (typeof rawStart !== 'number' || !Number.isFinite(rawStart)) continue;

    const start = Math.max(0, rawStart);
    // A null end happens on the last chunk; give it a plausible span rather
    // than dropping the word.
    const end =
      typeof rawEnd === 'number' && Number.isFinite(rawEnd) && rawEnd > start
        ? rawEnd
        : start + Math.min(0.6, Math.max(0.12, text.length * 0.06));

    words.push({ text, start, end });
  }

  words.sort((a, b) => a.start - b.start);

  // Whisper can loop on silence and repeat the same word at the same time.
  return words.filter((word, i) => {
    if (i === 0) return true;
    const prev = words[i - 1];
    return !(prev.text === word.text && Math.abs(prev.start - word.start) < 0.02);
  });
}

/* ============================================================
   Message handling
============================================================ */
self.onmessage = async (event: MessageEvent<TranscribeRequest>) => {
  const request = event.data;
  if (request?.type !== 'transcribe') return;

  try {
    const { run, device } = await getTranscriber();

    post({ type: 'transcribing' });

    const output = await run(request.samples, {
      // 30 s is Whisper's native window; the stride lets long clips overlap so
      // words are not cut at chunk boundaries.
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: 'word',
      task: 'transcribe',
      ...(request.language ? { language: request.language } : {}),
    });

    const words = normaliseWords(output);

    if (words.length === 0) {
      post({ type: 'error', reason: 'no-speech', message: 'Aucune parole détectée.' });
      return;
    }

    post({
      type: 'result',
      words,
      language: (output as { language?: string })?.language,
      device,
      model: MODEL_ID,
    });
  } catch (error) {
    post({
      type: 'error',
      reason: 'engine',
      message: error instanceof Error ? error.message : 'Transcription impossible.',
    });
  }
};
