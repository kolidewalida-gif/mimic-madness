/**
 * Audio extraction for the rhythmo band.
 *
 * Whisper expects mono PCM at 16 kHz. The browser decodes the media container
 * with Web Audio, then an OfflineAudioContext (or a cooperative fallback)
 * downmixes and resamples it. Every stage is bounded and observes the same
 * AbortSignal so a malformed/huge file cannot leave the UI spinning forever.
 */
import { RhythmoError, type RhythmoProgress } from './types';

/** Sample rate Whisper was trained on. Non-negotiable. */
export const WHISPER_SAMPLE_RATE = 16_000;

const READ_MIN_TIMEOUT_MS = 30_000;
const READ_MAX_TIMEOUT_MS = 10 * 60_000;
const DECODE_TIMEOUT_MS = 90_000;
const RESAMPLE_TIMEOUT_MS = 2 * 60_000;
const MANUAL_CHUNK_SAMPLES = 262_144;

/** Containers `decodeAudioData` cannot generally handle in browsers. */
const UNSUPPORTED_EXTENSIONS = ['mkv', 'avi', 'wmv', 'flv', 'ts', 'mpg', 'mpeg'];

const extensionOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

export const isLikelyDecodable = (fileName: string): boolean =>
  !UNSUPPORTED_EXTENSIONS.includes(extensionOf(fileName));

type AudioProgress = Extract<
  RhythmoProgress,
  { phase: 'reading-media' | 'decoding-audio' | 'resampling-audio' }
>;

export interface AudioExtractionOptions {
  signal?: AbortSignal;
  onProgress?: (progress: AudioProgress) => void;
}

type AudioContextCtor = typeof AudioContext;

const getAudioContextCtor = (): AudioContextCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
};

const cancelledError = () => new RhythmoError('cancelled', 'Annulé.');

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw cancelledError();
};

/** Race an operation against both user cancellation and a real deadline. */
async function bounded<T>(
  operation: Promise<T>,
  signal: AbortSignal | undefined,
  timeoutMs: number,
  timeoutError: RhythmoError,
  onStop?: () => void,
): Promise<T> {
  throwIfAborted(signal);

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      callback();
    };
    const stop = () => {
      try {
        onStop?.();
      } catch {
        // Best-effort cancellation only; the promise still settles below.
      }
    };
    const onAbort = () => {
      stop();
      finish(() => reject(cancelledError()));
    };
    const timer = setTimeout(() => {
      stop();
      finish(() => reject(timeoutError));
    }, timeoutMs);

    signal?.addEventListener('abort', onAbort, { once: true });
    operation.then(
      (value) => finish(() => resolve(value)),
      (error: unknown) => finish(() => reject(error)),
    );
  });
}

/**
 * Read a Blob with FileReader so the UI receives real byte progress and the
 * browser can abort the read. The fallback remains bounded for test/SSR-like
 * environments where FileReader is unavailable.
 */
async function readMediaBytes(
  file: Blob,
  options: AudioExtractionOptions,
): Promise<ArrayBuffer> {
  const { signal, onProgress } = options;
  const timeoutMs = Math.min(
    READ_MAX_TIMEOUT_MS,
    Math.max(READ_MIN_TIMEOUT_MS, Math.ceil(file.size / (512 * 1024)) * 1000),
  );

  onProgress?.({
    phase: 'reading-media',
    loadedBytes: 0,
    totalBytes: file.size,
    ratio: file.size === 0 ? 1 : 0,
  });

  if (typeof FileReader === 'undefined') {
    const bytes = await bounded(
      file.arrayBuffer(),
      signal,
      timeoutMs,
      new RhythmoError('engine', 'La lecture du fichier audio a expiré.'),
    );
    onProgress?.({
      phase: 'reading-media',
      loadedBytes: file.size,
      totalBytes: file.size,
      ratio: 1,
    });
    return bytes;
  }

  return new Promise<ArrayBuffer>((resolve, reject) => {
    throwIfAborted(signal);
    const reader = new FileReader();
    let settled = false;

    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reader.onload = null;
      reader.onerror = null;
      reader.onabort = null;
      reader.onprogress = null;
    };
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const abortReader = () => {
      if (reader.readyState === FileReader.LOADING) reader.abort();
    };
    const onAbort = () => {
      abortReader();
      finish(() => reject(cancelledError()));
    };
    const timer = setTimeout(() => {
      abortReader();
      finish(() => reject(new RhythmoError('engine', 'La lecture du fichier audio a expiré.')));
    }, timeoutMs);

    reader.onprogress = (event) => {
      const total = event.lengthComputable && event.total > 0 ? event.total : file.size;
      const loaded = Math.min(total, event.loaded);
      onProgress?.({
        phase: 'reading-media',
        loadedBytes: loaded,
        totalBytes: total,
        ratio: total > 0 ? loaded / total : 1,
      });
    };
    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) {
        finish(() => reject(new RhythmoError('engine', 'Lecture du média invalide.')));
        return;
      }
      onProgress?.({
        phase: 'reading-media',
        loadedBytes: file.size,
        totalBytes: file.size,
        ratio: 1,
      });
      finish(() => resolve(reader.result as ArrayBuffer));
    };
    reader.onerror = () => {
      finish(() => reject(new RhythmoError('engine', 'Impossible de lire le fichier audio.')));
    };
    reader.onabort = () => {
      finish(() => reject(signal?.aborted ? cancelledError() : new RhythmoError('engine', 'Lecture audio interrompue.')));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
    reader.readAsArrayBuffer(file);
  });
}

/** Decode a media file and return mono 16 kHz samples. */
export async function extractMonoPcm(
  file: Blob,
  fileName = '',
  options: AudioExtractionOptions = {},
): Promise<{ samples: Float32Array; duration: number }> {
  if (fileName && !isLikelyDecodable(fileName)) {
    throw new RhythmoError(
      'unsupported-container',
      `Le format .${extensionOf(fileName)} ne peut pas être décodé par le navigateur.`,
    );
  }

  const Ctor = getAudioContextCtor();
  if (!Ctor) throw new RhythmoError('engine', "Web Audio n'est pas disponible.");

  const bytes = await readMediaBytes(file, options);
  throwIfAborted(options.signal);
  options.onProgress?.({ phase: 'decoding-audio' });

  const decodeCtx = new Ctor();
  let decoded: AudioBuffer;
  try {
    // Do not pass bytes.slice(0): that doubled memory for files up to 400 Mio.
    decoded = await bounded(
      decodeCtx.decodeAudioData(bytes),
      options.signal,
      DECODE_TIMEOUT_MS,
      new RhythmoError('unsupported-container', 'Le décodage audio a expiré.'),
      () => { void decodeCtx.close().catch(() => undefined); },
    );
  } catch (error) {
    if (error instanceof RhythmoError) throw error;
    throw new RhythmoError(
      'unsupported-container',
      "Le navigateur n'a pas réussi à décoder l'audio de ce fichier.",
    );
  } finally {
    void decodeCtx.close().catch(() => undefined);
  }

  if (!decoded.length || !Number.isFinite(decoded.duration) || decoded.duration <= 0) {
    throw new RhythmoError('no-speech', 'Ce fichier ne contient pas de piste audio exploitable.');
  }

  const samples = await toMono16k(decoded, options);
  return { samples, duration: decoded.duration };
}

/** Downmix to mono and resample to 16 kHz using an offline render pass. */
async function toMono16k(
  buffer: AudioBuffer,
  options: AudioExtractionOptions,
): Promise<Float32Array> {
  const targetLength = Math.max(1, Math.ceil(buffer.duration * WHISPER_SAMPLE_RATE));
  options.onProgress?.({ phase: 'resampling-audio', ratio: 0 });
  throwIfAborted(options.signal);

  if (buffer.numberOfChannels === 1 && buffer.sampleRate === WHISPER_SAMPLE_RATE) {
    const output = buffer.getChannelData(0).slice();
    options.onProgress?.({ phase: 'resampling-audio', ratio: 1 });
    return output;
  }

  const OfflineCtor =
    (window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext })
      .OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;

  if (OfflineCtor) {
    try {
      const offline = new OfflineCtor(1, targetLength, WHISPER_SAMPLE_RATE);
      const source = offline.createBufferSource();
      source.buffer = buffer;
      source.connect(offline.destination);
      source.start();
      const rendered = await bounded(
        offline.startRendering(),
        options.signal,
        RESAMPLE_TIMEOUT_MS,
        new RhythmoError('engine', 'Le rééchantillonnage audio a expiré.'),
      );
      const output = rendered.getChannelData(0).slice();
      options.onProgress?.({ phase: 'resampling-audio', ratio: 1 });
      return output;
    } catch (error) {
      // Cancellation/timeouts must stop the run. Only a synchronous Web Audio
      // incompatibility falls back to the cooperative manual implementation.
      if (error instanceof RhythmoError) throw error;
    }
  }

  return manualDownmixResample(buffer, targetLength, options);
}

/** Cooperative fallback that yields between chunks instead of freezing React. */
async function manualDownmixResample(
  buffer: AudioBuffer,
  targetLength: number,
  options: AudioExtractionOptions,
): Promise<Float32Array> {
  const channels: Float32Array[] = [];
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    channels.push(buffer.getChannelData(channel));
  }

  const output = new Float32Array(targetLength);
  const ratio = buffer.sampleRate / WHISPER_SAMPLE_RATE;

  for (let chunkStart = 0; chunkStart < targetLength; chunkStart += MANUAL_CHUNK_SAMPLES) {
    throwIfAborted(options.signal);
    const chunkEnd = Math.min(targetLength, chunkStart + MANUAL_CHUNK_SAMPLES);

    for (let index = chunkStart; index < chunkEnd; index += 1) {
      const position = index * ratio;
      const left = Math.floor(position);
      const right = Math.min(left + 1, buffer.length - 1);
      const fraction = position - left;
      let sum = 0;

      for (const channel of channels) {
        const a = channel[left] ?? 0;
        const b = channel[right] ?? 0;
        sum += a + (b - a) * fraction;
      }
      output[index] = sum / channels.length;
    }

    options.onProgress?.({
      phase: 'resampling-audio',
      ratio: chunkEnd / targetLength,
    });

    if (chunkEnd < targetLength) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  return output;
}
