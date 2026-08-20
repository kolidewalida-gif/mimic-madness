import { RhythmoError, type RhythmoProgress } from './types';

type DownloadProgress = Extract<RhythmoProgress, { phase: 'downloading-media' }>;

export interface DownloadMediaOptions {
  signal?: AbortSignal;
  onProgress?: (progress: DownloadProgress) => void;
  fetchImpl?: typeof fetch;
  /** Maximum silence while opening/reading, not maximum total transfer time. */
  inactivityTimeoutMs?: number;
}

/**
 * Download a media body with a watchdog that remains active until the final
 * byte. Re-arming on every chunk supports slow large files while still
 * detecting a connection that has genuinely stalled.
 */
export async function downloadMediaBlob(
  url: string,
  options: DownloadMediaOptions = {},
): Promise<Blob> {
  const {
    signal,
    onProgress,
    fetchImpl = fetch,
    inactivityTimeoutMs = 30_000,
  } = options;

  if (signal?.aborted) throw new RhythmoError('cancelled', 'Annulé.');

  const controller = new AbortController();
  let timedOut = false;
  let watchdog: ReturnType<typeof setTimeout> | null = null;

  const armWatchdog = (ms = inactivityTimeoutMs) => {
    if (watchdog) clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, ms);
  };
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  armWatchdog(Math.max(45_000, inactivityTimeoutMs));

  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) {
      throw new RhythmoError(
        'network',
        `Téléchargement de la vidéo impossible (HTTP ${response.status}).`,
      );
    }

    const declaredLength = Number(response.headers.get('content-length'));
    const totalBytes = Number.isFinite(declaredLength) && declaredLength > 0
      ? declaredLength
      : undefined;
    let loadedBytes = 0;

    onProgress?.({
      phase: 'downloading-media',
      loadedBytes,
      totalBytes,
      ratio: totalBytes ? 0 : undefined,
    });

    if (!response.body) {
      armWatchdog(2 * 60_000);
      const blob = await response.blob();
      loadedBytes = blob.size;
      onProgress?.({
        phase: 'downloading-media',
        loadedBytes,
        totalBytes: totalBytes ?? loadedBytes,
        ratio: 1,
      });
      return blob;
    }

    const reader = response.body.getReader();
    const chunks: BlobPart[] = [];

    while (true) {
      armWatchdog();
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      loadedBytes += value.byteLength;
      chunks.push(value);
      onProgress?.({
        phase: 'downloading-media',
        loadedBytes,
        totalBytes,
        ratio: totalBytes ? Math.min(1, loadedBytes / totalBytes) : undefined,
      });
    }

    const blob = new Blob(chunks, {
      type: response.headers.get('content-type') ?? 'application/octet-stream',
    });
    onProgress?.({
      phase: 'downloading-media',
      loadedBytes,
      totalBytes: totalBytes ?? loadedBytes,
      ratio: 1,
    });
    return blob;
  } catch (error) {
    if (signal?.aborted) throw new RhythmoError('cancelled', 'Annulé.');
    if (timedOut) {
      throw new RhythmoError(
        'network',
        "Le téléchargement n'avance plus. Vérifie ta connexion puis réessaie.",
      );
    }
    if (error instanceof RhythmoError) throw error;
    throw new RhythmoError(
      'network',
      error instanceof Error
        ? `Téléchargement impossible : ${error.message}`
        : 'Téléchargement de la vidéo impossible.',
    );
  } finally {
    if (watchdog) clearTimeout(watchdog);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Lire la durée d'un média sans le télécharger.
 *
 * Avec `preload="metadata"`, le navigateur ne récupère que l'en-tête du
 * conteneur — quelques kilo-octets — au lieu des dizaines de mégaoctets du
 * fichier. C'est ce qui permet d'annoncer une estimation de temps pour la
 * transcription distante, alors que la durée n'est stockée nulle part côté
 * base : `end_time` vaut 0 pour les clips importés.
 *
 * Renvoie `null` plutôt que d'échouer : une estimation absente est acceptable,
 * un import bloqué ne l'est pas.
 */
export async function probeMediaDuration(
  source: Blob | string,
  timeoutMs = 10_000,
): Promise<number | null> {
  if (typeof document === 'undefined') return null;

  const objectUrl = typeof source === 'string' ? null : URL.createObjectURL(source);
  const src = objectUrl ?? (source as string);

  return new Promise<number | null>((resolve) => {
    const element = document.createElement('video');
    let settled = false;

    const finish = (duration: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      element.removeEventListener('loadedmetadata', onLoaded);
      element.removeEventListener('error', onError);
      // Couper la requête en cours : sans ça, un `preload` déjà lancé continue
      // de consommer de la bande passante pour un résultat dont on n'a plus
      // besoin.
      element.removeAttribute('src');
      element.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(duration);
    };

    const onLoaded = () => {
      const { duration } = element;
      finish(Number.isFinite(duration) && duration > 0 ? duration : null);
    };
    const onError = () => finish(null);

    const timer = setTimeout(() => finish(null), timeoutMs);

    element.preload = 'metadata';
    element.muted = true;
    element.addEventListener('loadedmetadata', onLoaded);
    element.addEventListener('error', onError);
    element.src = src;
  });
}
