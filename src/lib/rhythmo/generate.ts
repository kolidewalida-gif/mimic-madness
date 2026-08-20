/**
 * Orchestre la transcription d'un clip, par deux chemins.
 *
 * - `generateRhythmoTrackFromUrl` (privilégié) : AssemblyAI transcrit depuis
 *   l'URL du clip, sans que le navigateur télécharge la vidéo.
 * - `generateRhythmoTrack` (repli) : lecture/décodage de l'audio, Whisper dans
 *   un worker, puis passe Gemini pour corriger le texte.
 *
 * Les deux terminent pareil : regroupement des mots en phrases, puis écriture
 * du fichier de cues à son chemin déterministe.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  ASSEMBLYAI_MODEL_ID,
  AssemblyAiUnavailableError,
  transcribeWithAssemblyAi,
} from './assemblyai';
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
// Generous floor: WASM inference on a slow device can legitimately take a few
// minutes for a short clip, and killing it early wastes the whole model load.
const MIN_INFERENCE_WATCHDOG_MS = 4 * 60_000;
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

/**
 * Générer la bande depuis l'URL du clip, via AssemblyAI.
 *
 * Chemin privilégié : le clip n'est jamais téléchargé par le navigateur, c'est
 * AssemblyAI qui va le chercher dans le Storage. Sur les clips lourds, cela
 * supprime à la fois le temps de téléchargement et la saturation de connexions.
 *
 * Pas de passe Gemini ici : AssemblyAI ponctue et met en forme déjà, alors que
 * cette passe existait pour rattraper les hallucinations de Whisper. Elle reste
 * active sur le chemin local, dans `generateRhythmoTrack`.
 *
 * Lève `AssemblyAiUnavailableError` si l'appelant doit basculer sur Whisper.
 */
export async function generateRhythmoTrackFromUrl(
  clipId: string,
  audioUrl: string,
  options: GenerateRhythmoOptions = {},
): Promise<RhythmoTrack> {
  const runId = newRunId();
  if (activeGenerationRunId) {
    throw new RhythmoError('engine', 'Une génération de bande est déjà en cours.');
  }
  activeGenerationRunId = runId;

  try {
    if (options.signal?.aborted) throw new RhythmoError('cancelled', 'Annulé.');

    options.onProgress?.({ phase: 'transcribing' });

    const result = await transcribeWithAssemblyAi(audioUrl, {
      signal: options.signal,
      languageCode: options.language,
    });

    if (result.words.length === 0) {
      throw new RhythmoError('no-speech', "Aucune parole n'a été détectée dans cet extrait.");
    }

    const track: RhythmoTrack = {
      version: 1,
      clipId,
      language: result.language,
      model: ASSEMBLYAI_MODEL_ID,
      // `duration` sert d'échelle à la bande : la valeur rapportée par le
      // service est préférable, avec la fin du dernier mot comme filet.
      duration: result.duration ?? result.words[result.words.length - 1].end,
      createdAt: new Date().toISOString(),
      cues: groupIntoCues(result.words),
    };

    options.onProgress?.({ phase: 'saving' });
    await saveRhythmoTrack(track, { signal: options.signal });
    options.onProgress?.({ phase: 'done' });
    return track;
  } catch (error) {
    // Une indisponibilité du service n'est pas un échec à afficher : elle
    // remonte telle quelle pour que l'appelant tente le moteur local.
    if (error instanceof AssemblyAiUnavailableError) throw error;

    const typed = error instanceof RhythmoError
      ? error
      : new RhythmoError('engine', error instanceof Error ? error.message : 'Erreur inconnue.');
    options.onProgress?.({ phase: 'error', reason: typed.reason, message: typed.message });
    throw typed;
  } finally {
    if (activeGenerationRunId === runId) activeGenerationRunId = null;
  }
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

    // Text quality pass: Whisper nails the *timing* but often mishears words.
    // Gemini corrects the spelling/accents/punctuation while we keep Whisper's
    // per-word start/end. Best of both. Never blocks: on quota/error/no-key the
    // raw Whisper words are used unchanged.
    const { words: finalWords, refined } = await refineWordTextsWithGemini(words, options);

    const track: RhythmoTrack = {
      version: 1,
      clipId,
      model: refined ? `${model}+gemini` : model,
      device: 'wasm',
      duration,
      createdAt: new Date().toISOString(),
      cues: groupIntoCues(finalWords),
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

/**
 * Replace each Whisper word's text with a Gemini-corrected version, keeping the
 * exact same start/end timings. Strictly defensive: the corrected list must
 * have the same length, or we keep Whisper's text so timing never desyncs.
 */
async function refineWordTextsWithGemini(
  words: RhythmoWord[],
  options: GenerateRhythmoOptions,
): Promise<{ words: RhythmoWord[]; refined: boolean }> {
  if (options.signal?.aborted) return { words, refined: false };
  try {
    const { data, error } = await supabase.functions.invoke('refine-rhythmo-text', {
      body: { words: words.map((word) => word.text), language: options.language },
    });

    const corrected = (data as { words?: unknown; refined?: unknown } | null)?.words;
    const refined = (data as { refined?: unknown } | null)?.refined === true;

    if (
      error ||
      !refined ||
      !Array.isArray(corrected) ||
      corrected.length !== words.length ||
      !corrected.every((word) => typeof word === 'string')
    ) {
      return { words, refined: false };
    }

    // Une chaîne vide signale un mot halluciné (bégaiement, boucle de
    // répétition) : on le retire de la bande. Les mots conservés gardent
    // exactement les timings mesurés par Whisper.
    const merged = words.flatMap((word, index) => {
      const text = (corrected[index] as string).trim();
      if (!text) return [];
      return [{ ...word, text }];
    });

    // Un filtrage qui viderait la bande n'a aucun intérêt : on garde le brut.
    if (merged.length === 0) return { words, refined: false };

    return { words: merged, refined: true };
  } catch {
    // Network/quota/parse failure: keep Whisper's words, band still works.
    return { words, refined: false };
  }
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
