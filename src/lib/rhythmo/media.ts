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
