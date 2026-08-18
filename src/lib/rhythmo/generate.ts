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
import type { TranscribeRequest, WorkerOutbound } from './transcribe.worker';

/** A gap longer than this starts a new phrase. */
const PHRASE_GAP_S = 0.7;
/** Hard cap so one long sentence does not become a single huge cue. */
const MAX_PHRASE_WORDS = 12;

let worker: Worker | null = null;

const getWorker = (): Worker => {
  if (!worker) {
    worker = new Worker(new URL('./transcribe.worker.ts', import.meta.url), {
      type: 'module',
      name: 'rhythmo-transcribe',
    });
  }
  return worker;
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

  const words = await new Promise<{
    words: RhythmoWord[];
    language?: string;
    device: 'webgpu' | 'wasm';
    model: string;
  }>((resolve, reject) => {
    const cleanup = () => {
      instance.removeEventListener('message', onMessage);
      instance.removeEventListener('error', onError);
      signal?.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      // The model stays loaded in the worker; only this run is abandoned.
      reject(new RhythmoError('cancelled', 'Annulé.'));
    };

    const onError = () => {
      cleanup();
      reject(new RhythmoError('engine', 'Le moteur de transcription a échoué.'));
    };

    const onMessage = (event: MessageEvent<WorkerOutbound>) => {
      const message = event.data;
      switch (message.type) {
        case 'model-progress':
          report({ phase: 'loading-model', ratio: message.ratio, file: message.file });
          break;
        case 'ready':
          report({ phase: 'loading-model', ratio: 1 });
          break;
        case 'transcribing':
          report({ phase: 'transcribing' });
          break;
        case 'result':
          cleanup();
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
    signal?.addEventListener('abort', onAbort, { once: true });

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
