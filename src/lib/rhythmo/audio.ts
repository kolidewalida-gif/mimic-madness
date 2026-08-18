/**
 * Audio extraction for the rhythmo band.
 *
 * Whisper expects mono PCM at 16 kHz. The browser can give us that from a
 * video file without any transcoding library: `decodeAudioData` pulls the
 * audio track out of the container, then an OfflineAudioContext resamples it.
 *
 * Container support is the browser's, not ours: MP4, WebM, MOV and OGG decode
 * fine, MKV and AVI generally do not. That is a hard limit of
 * `decodeAudioData`, so we surface it as a typed error instead of failing
 * obscurely.
 */
import { RhythmoError } from './types';

/** Sample rate Whisper was trained on. Non-negotiable. */
export const WHISPER_SAMPLE_RATE = 16_000;

/**
 * Containers we know `decodeAudioData` cannot handle. Checked up-front so the
 * player gets a clear message instead of waiting for a decode failure.
 */
const UNSUPPORTED_EXTENSIONS = ['mkv', 'avi', 'wmv', 'flv', 'ts', 'mpg', 'mpeg'];

const extensionOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

export const isLikelyDecodable = (fileName: string): boolean =>
  !UNSUPPORTED_EXTENSIONS.includes(extensionOf(fileName));

type AudioContextCtor = typeof AudioContext;

const getAudioContextCtor = (): AudioContextCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
};

/**
 * Decode a media file and return mono 16 kHz samples.
 *
 * Runs on the main thread on purpose: `decodeAudioData` and
 * `OfflineAudioContext` are not available in workers in every browser, and
 * decoding is short compared with the inference that follows.
 */
export async function extractMonoPcm(file: Blob, fileName = ''): Promise<{
  samples: Float32Array;
  duration: number;
}> {
  if (fileName && !isLikelyDecodable(fileName)) {
    throw new RhythmoError(
      'unsupported-container',
      `Le format .${extensionOf(fileName)} ne peut pas être décodé par le navigateur.`,
    );
  }

  const Ctor = getAudioContextCtor();
  if (!Ctor) {
    throw new RhythmoError('engine', "Web Audio n'est pas disponible.");
  }

  const bytes = await file.arrayBuffer();

  // A short-lived context just for decoding. Its own sample rate does not
  // matter; the OfflineAudioContext below does the resampling.
  const decodeCtx = new Ctor();
  let decoded: AudioBuffer;
  try {
    // Bounded: `decodeAudioData` neither resolves nor rejects on some
    // malformed files, which would hang the whole pipeline silently.
    decoded = await Promise.race([
      decodeCtx.decodeAudioData(bytes.slice(0)),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new RhythmoError('unsupported-container', 'Décodage audio trop long.')),
          90_000,
        ),
      ),
    ]);
  } catch (error) {
    if (error instanceof RhythmoError) throw error;
    throw new RhythmoError(
      'unsupported-container',
      "Le navigateur n'a pas réussi à décoder l'audio de ce fichier.",
    );
  } finally {
    // Contexts are a limited resource; releasing matters when a player
    // imports several clips in a row.
    void decodeCtx.close().catch(() => {});
  }

  if (!decoded.length || !Number.isFinite(decoded.duration) || decoded.duration <= 0) {
    throw new RhythmoError('no-speech', 'Ce fichier ne contient pas de piste audio.');
  }

  const samples = await toMono16k(decoded);
  return { samples, duration: decoded.duration };
}

/** Downmix to mono and resample to 16 kHz using an offline render pass. */
async function toMono16k(buffer: AudioBuffer): Promise<Float32Array> {
  const targetLength = Math.max(1, Math.ceil(buffer.duration * WHISPER_SAMPLE_RATE));

  // Already mono at the right rate — nothing to do.
  if (buffer.numberOfChannels === 1 && buffer.sampleRate === WHISPER_SAMPLE_RATE) {
    return buffer.getChannelData(0).slice();
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
      const rendered = await offline.startRendering();
      return rendered.getChannelData(0).slice();
    } catch {
      // Some engines refuse unusual rate combinations; fall through to the
      // manual path rather than losing the feature.
    }
  }

  return manualDownmixResample(buffer, targetLength);
}

/**
 * Fallback resampler: average the channels, then pick samples with linear
 * interpolation. Lower quality than the offline renderer, but Whisper is very
 * tolerant of this and it keeps the feature working everywhere.
 */
function manualDownmixResample(buffer: AudioBuffer, targetLength: number): Float32Array {
  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c += 1) {
    channels.push(buffer.getChannelData(c));
  }

  const out = new Float32Array(targetLength);
  const ratio = buffer.sampleRate / WHISPER_SAMPLE_RATE;

  for (let i = 0; i < targetLength; i += 1) {
    const pos = i * ratio;
    const left = Math.floor(pos);
    const right = Math.min(left + 1, buffer.length - 1);
    const frac = pos - left;

    let sum = 0;
    for (const channel of channels) {
      const a = channel[left] ?? 0;
      const b = channel[right] ?? 0;
      sum += a + (b - a) * frac;
    }
    out[i] = sum / channels.length;
  }

  return out;
}
