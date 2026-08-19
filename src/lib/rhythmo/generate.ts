/**
 * Orchestrates one clip's transcription: read/decode audio, run Whisper in a
 * worker, group words into phrases, then persist the deterministic cue file.
 */
import { extractMonoPcm } from './audio';
import { saveRhythmoTrack } from './store';
import {
  RhythmoError,
  type RhythmoCue,
  type RhythmoProgress,
  type RhythmoTrack,
  type RhythmoWord,
} from './types';
import type { TranscribeRequest, WarmupRequest, WorkerOutbound } from './transcribe.worker';

const PHRASE_GAP_S = 0.7;
const MAX_PHRASE_WORDS = 12;
const MODEL_WATCHDOG_MS = 3 * 60_000;
const MIN_INFERENCE_WATCHDOG_MS = 2 * 60_000;
const MAX_INFERENCE_WATCHDOG_MS = 30 * 60_000;
const SPEED_STORAGE_KEY = 'mimic-master-rhythmo-ms-per-audio-second-v1';

type ProgressCallback = (progress: RhythmoProgress) => void;

let worker: Worker | null = null;
let workerReady = false;
let warmupPromise: Promise<void> | null = null;
let activeGenerationRunId: string | null = null;
const pendingWorkerRuns = new Set<(error: RhythmoError) => void>();

const newRunId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const ensureWorker = (): Worker => {
  if (!worker) {
    worker = new Worker(new URL('./transcribe.worker.ts', import.meta.url), { type: 'module' });
    workerReady = false;
  }
  return worker;
};

/** Termination is the only reliable way to cancel WASM inference. */
const terminateWorker = (error = new RhythmoError('cancelled', 'Annulé.')): void => {
  const current = worker;
  worker = null;
  workerReady = false;
  warmupPromise = null;
  current?.terminate();

  const callbacks = [...pendingWorkerRuns];
  pendingWorkerRuns.clear();
  callbacks.forEach((cancel) => cancel(error));
};

export const releaseRhythmoWorker = (): void => {
  terminateWorker();
  activeGenerationRunId = null;
};

const asEngineError = (message: string): RhythmoError =>
  new RhythmoError('engine', message || 'La transcription a échoué.');

/** Warm the model opportunistically. A generation can safely join this load. */
export const warmRhythmoWorker = (onProgress?: ProgressCallback): Promise<void> => {
  if (workerReady) return Promise.resolve();
  if (warmupPromise) return warmupPromise;

  const runId = newRunId();
  const instance = ensureWorker();
  const request: WarmupRequest = { type: 'warmup', runId };

  const promise = new Promise<void>((resolve, reject) => {
    let settled = false;
    let watchdog: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      clearTimeout(watchdog);
      instance.removeEventListener('message', onMessage);
      instance.removeEventListener('error', onWorkerError);
      pendingWorkerRuns.delete(onCancelled);
    };
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const resetWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        terminateWorker(asEngineError("Le chargement du moteur n'avance plus."));
      }, MODEL_WATCHDOG_MS);
    };
    const onCancelled = (error: RhythmoError) => finish(() => reject(error));
    const onWorkerError = () => {
      terminateWorker(asEngineError('Le moteur de transcription a cessé de répondre.'));
    };
    const onMessage = (event: MessageEvent<WorkerOutbound>) => {
      const message = event.data;
      if (message.runId !== runId) return;
      resetWatchdog();

      if (message.type === 'model-progress') {
        onProgress?.({
          phase: 'loading-model',
          ratio: message.progress,
          file: message.file,
        });
      } else if (message.type === 'model-ready') {
        workerReady = true;
        finish(resolve);
      } else if (message.type === 'error') {
        terminateWorker(asEngineError(message.message));
      }
    };

    pendingWorkerRuns.add(onCancelled);
    instance.addEventListener('message', onMessage);
    instance.addEventListener('error', onWorkerError);
    onProgress?.({ phase: 'loading-model', ratio: 0 });
    resetWatchdog();
    instance.postMessage(request);
  });

  warmupPromise = promise.finally(() => {
    if (warmupPromise === promise || !workerReady) warmupPromise = null;
  });
  // Callers commonly fire-and-forget warmup; keep rejection handled there.
  void warmupPromise.catch(() => undefined);
  return warmupPromise;
};

export interface GenerateRhythmoOptions {
  signal?: AbortSignal;
  onProgress?: ProgressCallback;
  language?: string;
}

export async function generateRhythmoTrack(
  clipId: string,
  file: Blob,
  fileName: string,
  options: GenerateRhythmoOptions = {},
): Promise<RhythmoTrack> {
  const runId = newRunId();
  if (activeGenerationRunId) {
    throw new RhythmoError('engine', 'Une génération de bande est déjà en cours.');
  }
  activeGenerationRunId = runId;

  try {
    if (options.signal?.aborted) throw new RhythmoError('cancelled', 'Annulé.');

    const { samples, duration } = await extractMonoPcm(file, fileName, {
      signal: options.signal,
      onProgress: options.onProgress,
    });

    const { words, model } = await transcribeInWorker(runId, samples, duration, options);
    if (words.length === 0) {
      throw new RhythmoError('no-speech', "Aucune parole n'a été détectée dans cet extrait.");
    }

    const track: RhythmoTrack = {
      version: 1,
      clipId,
      model,
      device: 'wasm',
      duration,
      createdAt: new Date().toISOString(),
      cues: groupIntoCues(words),
    };

    options.onProgress?.({ phase: 'saving' });
    await saveRhythmoTrack(track, { signal: options.signal });
    options.onProgress?.({ phase: 'done' });
    return track;
  } catch (error) {
    const typed = error instanceof RhythmoError
      ? error
      : new RhythmoError('engine', error instanceof Error ? error.message : 'Erreur inconnue.');
    options.onProgress?.({ phase: 'error', reason: typed.reason, message: typed.message });
    throw typed;
  } finally {
    if (activeGenerationRunId === runId) activeGenerationRunId = null;
  }
}

function transcribeInWorker(
  runId: string,
  samples: Float32Array,
  duration: number,
  options: GenerateRhythmoOptions,
): Promise<{ words: RhythmoWord[]; model: string }> {
  const instance = ensureWorker();

  return new Promise<{ words: RhythmoWord[]; model: string }>((resolve, reject) => {
    let settled = false;
    let inferenceStartedAt: number | null = null;
    let watchdog: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      clearTimeout(watchdog);
      instance.removeEventListener('message', onMessage);
      instance.removeEventListener('error', onWorkerError);
      options.signal?.removeEventListener('abort', onAbort);
      pendingWorkerRuns.delete(onCancelled);
    };
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const armWatchdog = (timeoutMs: number, message: string) => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => terminateWorker(asEngineError(message)), timeoutMs);
    };
    const onCancelled = (error: RhythmoError) => finish(() => reject(error));
    const onAbort = () => terminateWorker(new RhythmoError('cancelled', 'Annulé.'));
    const onWorkerError = () => {
      terminateWorker(asEngineError('Le moteur de transcription a cessé de répondre.'));
    };
    const onMessage = (event: MessageEvent<WorkerOutbound>) => {
      const message = event.data;
      if (message.runId !== runId) return;

      if (message.type === 'model-progress') {
        armWatchdog(MODEL_WATCHDOG_MS, "Le chargement du moteur n'avance plus.");
        options.onProgress?.({
          phase: 'loading-model',
          ratio: message.progress,
          file: message.file,
        });
        return;
      }

      if (message.type === 'model-ready') {
        workerReady = true;
        inferenceStartedAt = Date.now();
        const watchdogMs = Math.min(
          MAX_INFERENCE_WATCHDOG_MS,
          Math.max(MIN_INFERENCE_WATCHDOG_MS, duration * 30_000),
        );
        armWatchdog(watchdogMs, "La transcription n'avance plus.");
        options.onProgress?.({
          phase: 'transcribing',
          etaMs: measuredEtaMs(duration),
        });
        return;
      }

      if (message.type === 'done') {
        if (inferenceStartedAt !== null) {
          rememberMeasuredSpeed(Date.now() - inferenceStartedAt, duration);
        }
        finish(() => resolve({ words: message.words, model: message.model }));
        return;
      }

      if (message.type === 'error') {
        terminateWorker(asEngineError(message.message));
      }
    };

    pendingWorkerRuns.add(onCancelled);
    instance.addEventListener('message', onMessage);
    instance.addEventListener('error', onWorkerError);
    options.signal?.addEventListener('abort', onAbort, { once: true });

    options.onProgress?.({ phase: 'loading-model', ratio: workerReady ? 1 : 0 });
    armWatchdog(MODEL_WATCHDOG_MS, "Le chargement du moteur n'avance plus.");

    const request: TranscribeRequest = {
      type: 'transcribe',
      runId,
      samples,
      language: options.language,
    };
    instance.postMessage(request, [samples.buffer]);
  });
}

const readMeasuredSpeed = (): number | undefined => {
  try {
    const value = Number(localStorage.getItem(SPEED_STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  } catch {
    return undefined;
  }
};

const measuredEtaMs = (duration: number): number | undefined => {
  const speed = readMeasuredSpeed();
  return speed ? Math.round(duration * speed) : undefined;
};

const rememberMeasuredSpeed = (elapsedMs: number, duration: number): void => {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0 || duration <= 0) return;
  const measured = elapsedMs / duration;
  const previous = readMeasuredSpeed();
  const smoothed = previous ? previous * 0.7 + measured * 0.3 : measured;
  try {
    localStorage.setItem(SPEED_STORAGE_KEY, String(smoothed));
  } catch {
    // Private mode/storage quota: ETA simply stays unknown next time.
  }
};

/** Group consecutive words into readable phrase-sized cues. */
export function groupIntoCues(words: RhythmoWord[]): RhythmoCue[] {
  if (words.length === 0) return [];

  const cues: RhythmoCue[] = [];
  let current: RhythmoWord[] = [];

  const flush = () => {
    if (current.length === 0) return;
    cues.push({
      start: current[0].start,
      end: current[current.length - 1].end,
      text: current.map((word) => word.text).join(' ').replace(/\s+([,.!?;:])/g, '$1'),
      words: current,
    });
    current = [];
  };

  for (const word of words) {
    const previous = current[current.length - 1];
    const startsNewPhrase =
      current.length >= MAX_PHRASE_WORDS ||
      (previous !== undefined && word.start - previous.end > PHRASE_GAP_S) ||
      (previous !== undefined && /[.!?]$/.test(previous.text));

    if (startsNewPhrase) flush();
    current.push(word);
  }
  flush();
  return cues;
}
