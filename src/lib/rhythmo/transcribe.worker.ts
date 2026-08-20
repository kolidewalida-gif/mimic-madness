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
  // Xenova q8 has no MatMulNBits, so it builds with FULL graph optimization —
  // fast inference, which matters because a crippled session times out.
  { model: 'Xenova/whisper-tiny', dtype: 'q8', disableGraphOpt: false },
  { model: 'Xenova/whisper-base', dtype: 'q8', disableGraphOpt: false },
  // onnx-community fp32 only as a fallback, and only THIS path disables graph
  // optimization to dodge the TransposeDQWeightsForMatMulNBits crash.
  { model: 'onnx-community/whisper-tiny_timestamped', dtype: 'fp32', disableGraphOpt: true },
  { model: 'onnx-community/whisper-base_timestamped', dtype: 'fp32', disableGraphOpt: true },
] as const;

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
      const options: Record<string, unknown> = {
        dtype: attempt.dtype,
        device: 'wasm',
        progress_callback: reportModelProgress,
      };
      // Only the NBits-quantized fallback needs optimization disabled to build
      // its session. Forcing it on Xenova too crippled inference and made it
      // time out, so the fast path keeps full optimization.
      if (attempt.disableGraphOpt) {
        options.session_options = { graphOptimizationLevel: 'disabled' };
      }

      const loaded = await transformers.pipeline(
        'automatic-speech-recognition',
        attempt.model,
        options as Parameters<typeof transformers.pipeline>[2],
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

const normaliseWords = (raw: unknown) => {
  const result = raw as TranscriptionResult;
  if (!Array.isArray(result?.chunks)) return [];

  return result.chunks.flatMap((chunk) => {
    const text = typeof chunk.text === 'string' ? chunk.text.trim() : '';
    const start = chunk.timestamp?.[0];
    const end = chunk.timestamp?.[1];
    if (
      !text ||
      typeof start !== 'number' ||
      typeof end !== 'number' ||
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start
    ) {
      return [];
    }
    return [{ text, start, end }];
  });
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
        language: request.language ?? 'fr',
        task: 'transcribe',
        return_timestamps: 'word',
        chunk_length_s: 30,
        stride_length_s: 5,
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
