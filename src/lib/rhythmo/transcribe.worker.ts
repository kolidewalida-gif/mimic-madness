/// <reference lib="webworker" />
/**
 * Whisper transcription worker. All outbound messages carry the originating
 * runId, so a late WASM/model event can never mutate a newer generation.
 */

/**
 * Loading attempts, most reliable first.
 *
 * The `Xenova/whisper-*` exports use plain int8 (`q8`) quantization and are the
 * most widely deployed transformers.js config, so their session builds cleanly
 * on the onnxruntime-web bundled here. They still produce word-level timestamps
 * through cross-attention (`return_timestamps: 'word'`).
 *
 * The newer `onnx-community/..._timestamped` exports quantize the decoder with
 * MatMulNBits blocks; the bundled runtime cannot turn those into a session and
 * fails at `TransposeDQWeightsForMatMulNBits` with a missing `_scale`. They are
 * kept only as an `fp32` fallback, where there is no dequantization step and so
 * no NBits transpose to trip over.
 */
const LOAD_ATTEMPTS = [
  // `base` d'abord : `tiny` produit un français nettement plus fautif (mots
  // tronqués, boucles de répétition) pour un gain de temps qui ne justifie pas
  // une bande inutilisable. `tiny` reste le repli sur les appareils qui
  // n'arrivent pas à construire la session `base`.
  { model: 'Xenova/whisper-base', dtype: 'q8' },
  { model: 'Xenova/whisper-tiny', dtype: 'q8' },
  { model: 'onnx-community/whisper-base_timestamped', dtype: 'fp32' },
  { model: 'onnx-community/whisper-tiny_timestamped', dtype: 'fp32' },
] as const;

/**
 * Codes de langue acceptés par transformers.js.
 *
 * La documentation passe le nom complet (`french`). On traduit donc les codes
 * courts pour éviter toute détection automatique hasardeuse, qui produisait des
 * transcriptions franchement fausses.
 */
const LANGUAGE_NAMES: Record<string, string> = {
  fr: 'french',
  en: 'english',
  es: 'spanish',
  de: 'german',
  it: 'italian',
  pt: 'portuguese',
  nl: 'dutch',
  ar: 'arabic',
};

const toWhisperLanguage = (language: string): string =>
  LANGUAGE_NAMES[language.toLowerCase()] ?? language.toLowerCase();

export interface WarmupRequest {
  type: 'warmup';
  runId: string;
}

export interface TranscribeRequest {
  type: 'transcribe';
  runId: string;
  samples: Float32Array;
  language?: string;
}

export type WorkerInbound = WarmupRequest | TranscribeRequest;

export type WorkerOutbound =
  | { type: 'model-progress'; runId: string; progress: number; file?: string }
  | { type: 'model-ready'; runId: string; model: string }
  | {
      type: 'done';
      runId: string;
      model: string;
      words: Array<{ text: string; start: number; end: number }>;
    }
  | { type: 'error'; runId: string; message: string };

interface TransformerProgress {
  status?: string;
  progress?: number;
  loaded?: number;
  total?: number;
  file?: string;
  name?: string;
}

interface TimestampChunk {
  text?: string;
  timestamp?: [number | null, number | null];
}

interface TranscriptionResult {
  chunks?: TimestampChunk[];
}

type Transcriber = (
  samples: Float32Array,
  options: Record<string, unknown>,
) => Promise<unknown>;

type LoadedTranscriber = { transcriber: Transcriber; model: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;
const activeRunIds = new Set<string>();
let transcriberPromise: Promise<LoadedTranscriber> | null = null;

const progressRatio = (progress: TransformerProgress): number => {
  if (typeof progress.progress === 'number' && Number.isFinite(progress.progress)) {
    return Math.max(0, Math.min(1, progress.progress > 1 ? progress.progress / 100 : progress.progress));
  }
  if (
    typeof progress.loaded === 'number' &&
    typeof progress.total === 'number' &&
    progress.total > 0
  ) {
    return Math.max(0, Math.min(1, progress.loaded / progress.total));
  }
  return 0;
};

/** Model loading is shared; broadcast its real progress to all waiting runs. */
const reportModelProgress = (progress: TransformerProgress): void => {
  if (progress.status !== 'progress' && progress.status !== 'download') return;
  for (const runId of activeRunIds) {
    const message: WorkerOutbound = {
      type: 'model-progress',
      runId,
      progress: progressRatio(progress),
      file: progress.file ?? progress.name,
    };
    scope.postMessage(message);
  }
};

async function initialiseTranscriber(): Promise<LoadedTranscriber> {
  const transformers = await import('@huggingface/transformers');
  transformers.env.allowLocalModels = false;

  let lastError: unknown;
  for (const attempt of LOAD_ATTEMPTS) {
    try {
      const loaded = await transformers.pipeline(
        'automatic-speech-recognition',
        attempt.model,
        {
          dtype: attempt.dtype,
          device: 'wasm',
          progress_callback: reportModelProgress,
          // The crash is not the model, it is a graph-optimization pass:
          // `TransposeDQWeightsForMatMulNBits` runs while onnxruntime-web builds
          // the session and aborts on a missing `_scale`. Disabling graph
          // optimization skips that pass entirely, so the session builds for any
          // model/precision. Inference is marginally slower — acceptable for a
          // tiny/base model, and correctness comes first.
          session_options: { graphOptimizationLevel: 'disabled' },
        } as Parameters<typeof transformers.pipeline>[2],
      );
      return { transcriber: loaded as unknown as Transcriber, model: attempt.model };
    } catch (error) {
      lastError = error;
      console.warn(`[rythmo] session ${attempt.model} @ ${attempt.dtype} refusee`, error);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Aucun modele Whisper compatible ne peut etre charge.');
}

/** Any import/init/fallback failure clears the singleton so Retry is genuine. */
const getTranscriber = (): Promise<LoadedTranscriber> => {
  if (!transcriberPromise) {
    transcriberPromise = initialiseTranscriber().catch((error: unknown) => {
      transcriberPromise = null;
      throw error;
    });
  }
  return transcriberPromise;
};

interface TimedWord {
  text: string;
  start: number;
  end: number;
}

/**
 * Assembler les fragments renvoyés par Whisper en mots affichables.
 *
 * Deux corrections indispensables au français :
 *
 *  - Un fragment sans durée exploitable était purement supprimé. Whisper découpe
 *    « j'ai » en « j » (durée nulle) puis « 'ai » : on perdait donc le « j » et
 *    la bande affichait « 'ai ». Son texte est désormais reporté sur le mot
 *    suivant.
 *  - Les élisions (« j' », « l' », « qu' ») arrivent en fragments séparés et
 *    sont recollées au mot qui suit.
 */
const normaliseWords = (raw: unknown): TimedWord[] => {
  const result = raw as TranscriptionResult;
  if (!Array.isArray(result?.chunks)) return [];

  const words: TimedWord[] = [];
  /** Texte d'un fragment sans timing, à recoller au mot suivant. */
  let pendingPrefix = '';

  for (const chunk of result.chunks) {
    const text = typeof chunk.text === 'string' ? chunk.text.trim() : '';
    if (!text) continue;

    const start = chunk.timestamp?.[0];
    const end = chunk.timestamp?.[1];
    const hasTiming =
      typeof start === 'number' &&
      typeof end === 'number' &&
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      end > start;

    if (!hasTiming) {
      // Fragment inexploitable seul : on garde son texte pour le mot suivant.
      pendingPrefix += text;
      continue;
    }

    const previous = words[words.length - 1];
    // Une élision se rattache au mot précédent plutôt que de former un mot.
    if (!pendingPrefix && previous && /^['’]/.test(text)) {
      previous.text += text;
      previous.end = end as number;
      continue;
    }

    words.push({
      text: pendingPrefix + text,
      start: start as number,
      end: end as number,
    });
    pendingPrefix = '';
  }

  // Un reste sans timing se raccroche au dernier mot pour ne rien perdre.
  if (pendingPrefix && words.length > 0) {
    words[words.length - 1].text += pendingPrefix;
  }

  return words;
};

scope.addEventListener('message', (event: MessageEvent<WorkerInbound>) => {
  const request = event.data;
  if (!request?.runId || (request.type !== 'warmup' && request.type !== 'transcribe')) return;

  activeRunIds.add(request.runId);
  void (async () => {
    try {
      const { transcriber, model } = await getTranscriber();
      scope.postMessage({ type: 'model-ready', runId: request.runId, model } satisfies WorkerOutbound);

      if (request.type === 'warmup') return;

      const result = await transcriber(request.samples, {
        // Langue explicite : la détection automatique se trompait et dégradait
        // fortement la transcription.
        language: toWhisperLanguage(request.language ?? 'fr'),
        task: 'transcribe',
        return_timestamps: 'word',
        chunk_length_s: 30,
        stride_length_s: 5,
        // Décodage déterministe : sans cela le modèle inventait des variantes
        // différentes à chaque essai.
        temperature: 0,
        do_sample: false,
        /**
         * Garde-fous contre les boucles de répétition, principal défaut de
         * Whisper sur de longs extraits : il produisait des suites du genre
         * « une autre question · c'est une autre question · une autre question ».
         * Interdire la répétition d'un même tri-gramme et pénaliser légèrement
         * les redites coupe ces boucles sans abîmer la parole normale.
         */
        no_repeat_ngram_size: 3,
        repetition_penalty: 1.15,
      });
      scope.postMessage({
        type: 'done',
        runId: request.runId,
        model,
        words: normaliseWords(result),
      } satisfies WorkerOutbound);
    } catch (error) {
      scope.postMessage({
        type: 'error',
        runId: request.runId,
        message: error instanceof Error ? error.message : 'Erreur inconnue du moteur.',
      } satisfies WorkerOutbound);
    } finally {
      activeRunIds.delete(request.runId);
    }
  })();
});
