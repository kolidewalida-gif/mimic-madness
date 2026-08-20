/**
 * Client AssemblyAI pour la bande rythmo.
 *
 * Deux atouts par rapport à Whisper WASM local :
 *
 * 1. On envoie une *URL* — AssemblyAI va chercher la vidéo depuis ses serveurs.
 *    Le navigateur ne télécharge donc plus le clip pour le transcrire, ce qui
 *    supprime la cause racine de la saturation de connexions sur les clips
 *    lourds (50 Mo et plus).
 * 2. La qualité de transcription ne dépend plus de la machine du joueur.
 *
 * La clé d'API n'apparaît jamais ici : tout passe par les edge functions
 * `transcribe-clip` (dépôt) et `transcribe-clip-status` (interrogation).
 */
import { supabase } from '@/integrations/supabase/client';
import { RhythmoError, type RhythmoWord } from './types';

/** Identifiant de moteur écrit dans `RhythmoTrack.model`. */
export const ASSEMBLYAI_MODEL_ID = 'assemblyai-universal-3-5-pro';

const POLL_INTERVAL_MS = 3_000;
/**
 * Plafond volontairement large : AssemblyAI met en file d'attente, et un clip
 * long peut légitimement demander plusieurs minutes. Au-delà, on abandonne
 * proprement pour laisser sa chance au repli local.
 */
const POLL_TIMEOUT_MS = 5 * 60_000;

/**
 * Échec qui doit déclencher le repli sur Whisper local.
 *
 * Distinct de `RhythmoError` exprès : une indisponibilité du service distant
 * n'est pas une erreur à montrer au joueur, c'est un aiguillage interne.
 */
export class AssemblyAiUnavailableError extends Error {
  reason: string;
  constructor(reason: string, message: string) {
    super(message);
    this.name = 'AssemblyAiUnavailableError';
    this.reason = reason;
  }
}

export interface AssemblyAiResult {
  words: RhythmoWord[];
  language?: string;
  /** Durée de l'audio analysé, en secondes, quand le service la rapporte. */
  duration?: number;
}

export interface AssemblyAiOptions {
  signal?: AbortSignal;
  /** Code langue explicite ; sinon détection automatique côté service. */
  languageCode?: string;
  /** Signalé à chaque tour de boucle, pour garder l'UI vivante. */
  onPoll?: (elapsedMs: number) => void;
}

interface SubmitResponse {
  ok?: unknown;
  id?: unknown;
  reason?: unknown;
  message?: unknown;
}

interface StatusResponse {
  ok?: unknown;
  status?: unknown;
  words?: unknown;
  language?: unknown;
  audioDuration?: unknown;
  reason?: unknown;
  message?: unknown;
}

interface RemoteWord {
  text: string;
  startMs: number;
  endMs: number;
}

const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) throw new RhythmoError('cancelled', 'Annulé.');
};

/** Attente interruptible : un abandon ne doit pas patienter 3 s de plus. */
const waitOrAbort = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new RhythmoError('cancelled', 'Annulé.'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });

const isRemoteWord = (value: unknown): value is RemoteWord => {
  if (!value || typeof value !== 'object') return false;
  const word = value as Partial<RemoteWord>;
  return (
    typeof word.text === 'string' &&
    typeof word.startMs === 'number' &&
    typeof word.endMs === 'number' &&
    Number.isFinite(word.startMs) &&
    Number.isFinite(word.endMs)
  );
};

/**
 * Convertit les mots du service en `RhythmoWord`.
 *
 * AssemblyAI exprime `start`/`end` en MILLISECONDES ; toute la bande rythmo
 * travaille en SECONDES. Oublier cette division rend la bande inexploitable
 * sans lever d'erreur, d'où la conversion isolée et testée ici.
 */
export const toRhythmoWords = (raw: unknown): RhythmoWord[] => {
  if (!Array.isArray(raw)) return [];

  const words: RhythmoWord[] = [];
  for (const candidate of raw) {
    if (!isRemoteWord(candidate)) continue;

    const text = candidate.text.trim();
    if (!text) continue;

    const start = candidate.startMs / 1000;
    const end = candidate.endMs / 1000;
    if (start < 0 || end < start) continue;

    words.push({ text, start, end });
  }

  return words.sort((a, b) => a.start - b.start);
};

/**
 * Appelle une edge function sans jamais laisser fuiter d'exception inattendue.
 *
 * Un client Supabase qui ne renvoie rien d'exploitable ferait autrement remonter
 * un `TypeError` de déstructuration, ce qui court-circuiterait le repli local.
 */
async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const response = await supabase.functions.invoke<T>(name, { body });
    if (!response || typeof response !== 'object') {
      return { data: null, error: new Error(`Réponse inexploitable de ${name}.`) };
    }
    return { data: response.data ?? null, error: response.error ?? null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(`Appel de ${name} impossible.`),
    };
  }
}

/** Dépose le travail et renvoie l'identifiant de transcription. */
async function submit(audioUrl: string, options: AssemblyAiOptions): Promise<string> {
  throwIfAborted(options.signal);

  const { data, error } = await invokeFunction<SubmitResponse>('transcribe-clip', {
    audioUrl,
    languageCode: options.languageCode,
  });

  if (error) {
    throw new AssemblyAiUnavailableError('invoke', error.message || 'Appel du service impossible.');
  }

  if (data?.ok !== true || typeof data?.id !== 'string' || !data.id) {
    const reason = typeof data?.reason === 'string' ? data.reason : 'unknown';
    const message = typeof data?.message === 'string' ? data.message : 'Service de transcription indisponible.';
    throw new AssemblyAiUnavailableError(reason, message);
  }

  return data.id;
}

/** Interroge jusqu'à un statut terminal, ou jusqu'au plafond de temps. */
async function pollUntilDone(id: string, options: AssemblyAiOptions): Promise<AssemblyAiResult> {
  const startedAt = Date.now();

  for (;;) {
    throwIfAborted(options.signal);

    const elapsed = Date.now() - startedAt;
    if (elapsed > POLL_TIMEOUT_MS) {
      throw new AssemblyAiUnavailableError('timeout', "La transcription distante n'a pas abouti à temps.");
    }
    options.onPoll?.(elapsed);

    const { data, error } = await invokeFunction<StatusResponse>('transcribe-clip-status', { id });

    if (error) {
      throw new AssemblyAiUnavailableError('invoke', error.message || 'Suivi de la transcription impossible.');
    }
    if (data?.ok !== true) {
      const reason = typeof data?.reason === 'string' ? data.reason : 'unknown';
      throw new AssemblyAiUnavailableError(reason, 'Suivi de la transcription impossible.');
    }

    const status = typeof data.status === 'string' ? data.status : 'unknown';

    if (status === 'error') {
      const message = typeof data.message === 'string' ? data.message : 'Transcription échouée.';
      throw new AssemblyAiUnavailableError('provider-error', message);
    }

    if (status === 'completed') {
      return {
        words: toRhythmoWords(data.words),
        language: typeof data.language === 'string' ? data.language : undefined,
        duration:
          typeof data.audioDuration === 'number' && Number.isFinite(data.audioDuration)
            ? data.audioDuration
            : undefined,
      };
    }

    // `queued` / `processing` / statut inconnu : on repatiente.
    await waitOrAbort(POLL_INTERVAL_MS, options.signal);
  }
}

/**
 * Transcrit un clip déjà présent dans le Storage, depuis son URL.
 *
 * Lève `AssemblyAiUnavailableError` quand l'appelant doit basculer sur le
 * moteur local, et `RhythmoError('cancelled')` sur abandon.
 */
export async function transcribeWithAssemblyAi(
  audioUrl: string,
  options: AssemblyAiOptions = {},
): Promise<AssemblyAiResult> {
  const id = await submit(audioUrl, options);
  return pollUntilDone(id, options);
}
