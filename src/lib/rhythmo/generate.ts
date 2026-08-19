/**
 * Orchestrates one clip's transcription: decode audio, run the worker, group
 * the words into phrases, persist the result.
 *
 * The worker is created lazily and kept alive between clips so the model is
 * only loaded once per session.
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

/** A gap longer than this starts a new phrase. */
const PHRASE_GAP_S = 0.7;
/** Hard cap so one long sentence does not become a single huge cue. */
const MAX_PHRASE_WORDS = 12;

/* Watchdog windows. These bound *silence*, not total duration: any message
   from the worker rearms the timer, so a slow run is never cut short. */
const STARTUP_TIMEOUT_MS = 45_000;
const SILENCE_TIMEOUT_MS = 30_000;
const INFERENCE_TIMEOUT_MS = 5 * 60_000;

let worker: Worker | null = null;

/**
 * Rough seconds of compute per second of audio, per backend, for the tiny
 * model. Only used to show an ETA — refined at runtime with the real speed
 * measured on the last clip.
 *
 * Deliberately pessimistic for WASM. Multi-threaded WASM needs the page to be
 * cross-origin isolated (COOP/COEP headers), which the deployment does not set,
 * so it runs single-threaded and is several times slower than the figure the
 * benchmarks quote. Under-promising here is much better than a countdown that
 * empties in eight seconds and then sits at zero.
 */
const BASE_SPEED_FACTOR: Record<'webgpu' | 'wasm', number> = { webgpu: 0.15, wasm: 1.6 };
const measuredFactor: Partial<Record<'webgpu' | 'wasm', number>> = {};

/** Estimated milliseconds to transcribe `durationS` seconds of audio. */
export const estimateTranscriptionMs = (durationS: number, device: 'webgpu' | 'wasm' = 'wasm'): number =>
  Math.round(Math.max(2, durationS) * (measuredFactor[device] ?? BASE_SPEED_FACTOR[device]) * 1000) + 1_500;

const getWorker = (): Worker => {
  if (!worker) {
    worker = new Worker(new URL('./transcribe.worker.ts', import.meta.url), {
      type: 'module',
      name: 'rhythmo-transcribe',
    });
  }
  return worker;
};

/**
 * Start loading the speech model in the background.
 *
 * Called as soon as the submission screen opens so the ~40 MB download and
 * the engine init happen while the player is still importing videos, instead
 * of adding a minute in front of the first band.
 */
export const warmRhythmoWorker = (): void => {
  try {
    const request: WarmupRequest = { type: 'warmup' };
    getWorker().postMessage(request);
  } catch (error) {
    console.warn('[rythmo] préchargement impossible', error);
  }
};

/** Drops the worker and the loaded model. Frees a few hundred MB of RAM. */
export const releaseRhythmoWorker = (): void => {
  worker?.terminate();
  worker = null;
};

/** Group a flat word list into readable phrases. */
export function groupWordsIntoCues(words: RhythmoWord[]): RhythmoCue[] {
  const cues: RhythmoCue[] = [];
  let current: RhythmoWord[] = [];

  const flush = () => {
    if (current.length === 0) return;
    cues.push({
      start: current[0].start,
      end: current[current.length - 1].end,
      text: current.map((w) => w.text).join(' ').replace(/\s+([,.!?;:])/g, '$1'),
      words: current,
    });
    current = [];
  };

  for (const word of words) {
    const previous = current[current.length - 1];
    const gap = previous ? word.start - previous.end : 0;

    if (previous && (gap > PHRASE_GAP_S || current.length >= MAX_PHRASE_WORDS)) {
      flush();
    }
    current.push(word);
  }
  flush();

  return cues;
}

export interface GenerateOptions {
  clipId: string;
  /** The media to transcribe. */
  file: Blob;
  /** Used only to reject containers the browser cannot decode. */
  fileName?: string;
  /** Force a language code, or leave undefined to auto-detect. */
  language?: string;
  onProgress?: (progress: RhythmoProgress) => void;
  signal?: AbortSignal;
}

/**
 * Transcribe a clip and store its band. Resolves with the saved track.
 *
 * Throws a `RhythmoError` with a `reason` the UI can turn into a specific
 * message — an unsupported container is a very different situation from a
 * silent clip, and the player deserves to know which.
 */
export async function generateRhythmoTrack({
  clipId,
  file,
  fileName,
  language,
  onProgress,
  signal,
}: GenerateOptions): Promise<RhythmoTrack> {
  const report = (progress: RhythmoProgress) => onProgress?.(progress);

  if (signal?.aborted) throw new RhythmoError('cancelled', 'Annulé.');

  report({ phase: 'extracting' });
  const { samples, duration } = await extractMonoPcm(file, fileName);

  if (signal?.aborted) throw new RhythmoError('cancelled', 'Annulé.');

  report({ phase: 'loading-model', ratio: 0 });

  const instance = getWorker();
  let startedAt = 0;
  let backend: 'webgpu' | 'wasm' = 'wasm';

  const words = await new Promise<{
    words: RhythmoWord[];
    language?: string;
    device: 'webgpu' | 'wasm';
    model: string;
  }>((resolve, reject) => {
    /**
     * Fails the run if the worker goes completely silent.
     *
     * Without it, anything that never settles inside the worker (a stalled
     * model download, a driver that never answers) leaves the UI spinning
     * forever with no way to tell whether it is working.
     *
     * Rearmed on every message, so a slow-but-alive run is never killed.
     */
    let watchdog: ReturnType<typeof setTimeout>;
    const armWatchdog = (ms: number) => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        cleanup();
        reject(
          new RhythmoError(
            'engine',
            "Le moteur ne répond pas. Vérifie ta connexion : le modèle vocal doit être téléchargé une première fois.",
          ),
        );
      }, ms);
    };

    const cleanup = () => {
      clearTimeout(watchdog);
      instance.removeEventListener('message', onMessage);
      instance.removeEventListener('error', onError);
      instance.removeEventListener('messageerror', onError);
      signal?.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      // The model stays loaded in the worker; only this run is abandoned.
      reject(new RhythmoError('cancelled', 'Annulé.'));
    };

    const onError = (event: Event) => {
      cleanup();
      const detail = (event as ErrorEvent)?.message;
      console.error('[rythmo] worker en erreur', detail ?? event);
      reject(
        new RhythmoError(
          'engine',
          detail ? `Moteur indisponible : ${detail}` : 'Le moteur de transcription a échoué.',
        ),
      );
    };

    const onMessage = (event: MessageEvent<WorkerOutbound>) => {
      const message = event.data;

      switch (message.type) {
        case 'log':
          // Progress with no percentage. Keeps the watchdog happy and leaves a
          // trail in the console when a player reports a stuck run.
          console.info('[rythmo]', message.message);
          armWatchdog(SILENCE_TIMEOUT_MS);
          break;
        case 'model-progress':
          report({ phase: 'loading-model', ratio: message.ratio, file: message.file });
          armWatchdog(SILENCE_TIMEOUT_MS);
          break;
        case 'ready':
          backend = message.device;
          report({ phase: 'loading-model', ratio: 1 });
          // Inference reports nothing until it finishes, so the window has to
          // cover a whole clip on the slow WASM path.
          armWatchdog(INFERENCE_TIMEOUT_MS);
          break;
        case 'transcribing':
          startedAt = performance.now();
          report({ phase: 'transcribing', etaMs: estimateTranscriptionMs(duration, backend) });
          armWatchdog(INFERENCE_TIMEOUT_MS);
          break;
        case 'result':
          cleanup();
          if (startedAt) {
            // Feed the real speed back so the next clip's ETA is accurate.
            const factor = (performance.now() - startedAt) / 1000 / Math.max(1, duration);
            measuredFactor[message.device] = factor;
          }
          resolve({
            words: message.words,
            language: message.language,
            device: message.device,
            model: message.model,
          });
          break;
        case 'error':
          cleanup();
          reject(new RhythmoError(message.reason, message.message));
          break;
      }
    };

    instance.addEventListener('message', onMessage);
    instance.addEventListener('error', onError);
    instance.addEventListener('messageerror', onError);
    signal?.addEventListener('abort', onAbort, { once: true });

    // Generous first window: it covers loading the engine and, on a first run,
    // starting an 80 MB download.
    armWatchdog(STARTUP_TIMEOUT_MS);

    const request: TranscribeRequest = { type: 'transcribe', samples, language };
    // Transfer the buffer instead of copying it: a 3-minute clip is ~11 MB.
    instance.postMessage(request, [samples.buffer]);
  });

  const cues = groupWordsIntoCues(words.words);
  if (cues.length === 0) {
    throw new RhythmoError('no-speech', 'Aucune parole détectée.');
  }

  const track: RhythmoTrack = {
    version: 1,
    clipId,
    language: words.language,
    model: words.model,
    device: words.device,
    duration,
    createdAt: new Date().toISOString(),
    cues,
  };

  await saveRhythmoTrack(track);
  report({ phase: 'done' });

  return track;
}
