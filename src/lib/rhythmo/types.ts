/**
 * Rhythmo band — data model.
 *
 * A "bande rythmo" is the dubbing studio's scrolling text strip: words move
 * right-to-left past a fixed playhead, and the actor speaks each word as it
 * crosses the line. That only works if we know *when* every word is spoken,
 * so the whole model is timestamp-first.
 *
 * All times are in seconds, relative to the start of the video *file*. That is
 * the same reference as `HTMLVideoElement.currentTime`, so the band can align
 * itself against the player without knowing anything about the clip's trim
 * range.
 */

/** A single spoken word with its exact span. */
export interface RhythmoWord {
  text: string;
  start: number;
  end: number;
}

/**
 * A phrase. Words are what the band actually renders; `text` is kept for
 * plain-subtitle fallback and for debugging.
 */
export interface RhythmoCue {
  start: number;
  end: number;
  text: string;
  words: RhythmoWord[];
}

/** What we persist next to a clip. Versioned so the format can evolve. */
export interface RhythmoTrack {
  version: 1;
  clipId: string;
  /** Detected language, when the model reports one. */
  language?: string;
  /** Model id used, so a re-run with a better model can be detected. */
  model: string;
  /** Backend that produced it — useful when comparing quality reports. */
  device?: 'webgpu' | 'wasm';
  /** Duration of the analysed audio, in seconds. */
  duration: number;
  createdAt: string;
  cues: RhythmoCue[];
}

/** Progress reported while a clip is being transcribed. */
export type RhythmoProgress =
  | { phase: 'idle' }
  /** Remote clips are downloaded before they can be decoded. */
  | {
      phase: 'downloading-media';
      loadedBytes: number;
      totalBytes?: number;
      ratio?: number;
    }
  /** Browser-local Blob/File reading. FileReader reports real bytes. */
  | {
      phase: 'reading-media';
      loadedBytes: number;
      totalBytes: number;
      ratio: number;
    }
  /** Container/codec decoding exposes no trustworthy percentage. */
  | { phase: 'decoding-audio' }
  /** Resampling reports completed output samples when available. */
  | { phase: 'resampling-audio'; ratio?: number }
  /** Model files are downloading. `ratio` is 0..1 when known. */
  | { phase: 'loading-model'; ratio: number; file?: string }
  /** `etaMs` exists only after this browser has measured a prior real run. */
  | { phase: 'transcribing'; etaMs?: number }
  /** The generated JSON is being persisted in Storage. */
  | { phase: 'saving' }
  | { phase: 'done' }
  | { phase: 'error'; reason: RhythmoErrorReason; message: string };

export type RhythmoErrorReason =
  /** The browser cannot decode audio from this container (mkv, avi…). */
  | 'unsupported-container'
  /** No speech found, or the model returned nothing usable. */
  | 'no-speech'
  /** Downloading the media failed or timed out. */
  | 'network'
  /** Persisting the generated cues failed or timed out. */
  | 'storage'
  /** Model download or inference failed. */
  | 'engine'
  | 'cancelled'
  | 'unknown';

export class RhythmoError extends Error {
  reason: RhythmoErrorReason;
  constructor(reason: RhythmoErrorReason, message: string) {
    super(message);
    this.name = 'RhythmoError';
    this.reason = reason;
  }
}

/** Human-readable, player-facing message for a failure. */
export const rhythmoErrorLabel = (reason: RhythmoErrorReason): string => {
  switch (reason) {
    case 'unsupported-container':
      return "Ce format ne permet pas d'extraire l'audio (essaie du MP4).";
    case 'no-speech':
      return 'Aucune parole détectée dans cet extrait.';
    case 'network':
      return 'Impossible de télécharger la vidéo. Vérifie ta connexion.';
    case 'storage':
      return "La bande a été créée mais n'a pas pu être enregistrée.";
    case 'engine':
      return 'La transcription a échoué. Tu peux réessayer.';
    case 'cancelled':
      return 'Transcription annulée.';
    default:
      return 'Transcription indisponible.';
  }
};

/**
 * Flatten a track to a single word list. The band renders from this: one
 * absolutely-positioned run of words is far cheaper than nested cue elements.
 */
export const flattenWords = (track: RhythmoTrack | null | undefined): RhythmoWord[] => {
  if (!track) return [];
  const out: RhythmoWord[] = [];
  for (const cue of track.cues) {
    for (const word of cue.words) {
      if (word.text.trim()) out.push(word);
    }
  }
  return out.sort((a, b) => a.start - b.start);
};
