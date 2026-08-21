import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mic, StopCircle, Save, Play, RotateCcw, PauseCircle, PlayCircle } from "lucide-react";
import {
  extensionForMimeType,
  videoStorage,
  type VideoClip,
} from "@/lib/videoStorageSupabase";
import {
  applyVoiceFilter,
  postProcessRecordedBlob,
  requiresPostProcessing,
  VOICE_FILTERS,
  type VoiceFilterDef,
  type VoiceFilterId,
} from "@/lib/voiceFilters";
import { InkVoiceFilterPicker } from "@/components/InkVoiceFilterPicker";

/**
 * Trim leading silence from an audio blob. Decodes to PCM, finds the first
 * sample above a threshold, then re-encodes from that point as WAV.
 */
const trimLeadingSilence = async (blob: Blob, signal?: AbortSignal): Promise<Blob> => {
  const THRESHOLD = 0.01;
  const MAX_TRIM_MS = 800;

  if (signal?.aborted) return blob;

  try {
    const arrayBuffer = await blob.arrayBuffer();
    if (signal?.aborted) return blob;

    const context = new AudioContext();
    const closeContext = () => {
      if (context.state !== 'closed') void context.close().catch(() => {});
    };
    signal?.addEventListener('abort', closeContext, { once: true });

    let buffer: AudioBuffer;
    try {
      buffer = await context.decodeAudioData(arrayBuffer.slice(0));
    } finally {
      signal?.removeEventListener('abort', closeContext);
      closeContext();
    }
    if (signal?.aborted) return blob;

    const sampleRate = buffer.sampleRate;
    const maxTrimSamples = Math.floor((MAX_TRIM_MS / 1000) * sampleRate);
    let firstLoudSample = 0;

    outer:
    for (let sampleIndex = 0; sampleIndex < Math.min(buffer.length, maxTrimSamples); sampleIndex += 1) {
      if ((sampleIndex & 4095) === 0 && signal?.aborted) return blob;
      for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
        if (Math.abs(buffer.getChannelData(channel)[sampleIndex]) > THRESHOLD) {
          firstLoudSample = sampleIndex;
          break outer;
        }
      }
    }

    const silenceMs = (firstLoudSample / sampleRate) * 1000;
    if (silenceMs < 50 || signal?.aborted) return blob;

    const trimmedLength = buffer.length - firstLoudSample;
    const numChannels = buffer.numberOfChannels;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = trimmedLength * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const output = new ArrayBuffer(totalSize);
    const view = new DataView(output);
    const writeString = (offset: number, value: string) => {
      for (let index = 0; index < value.length; index += 1) {
        view.setUint8(offset + index, value.charCodeAt(index));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    const channels = Array.from(
      { length: numChannels },
      (_, channel) => buffer.getChannelData(channel),
    );
    let offset = headerSize;
    for (let index = firstLoudSample; index < buffer.length; index += 1) {
      if ((index & 4095) === 0 && signal?.aborted) return blob;
      for (let channel = 0; channel < numChannels; channel += 1) {
        const sample = Math.max(-1, Math.min(1, channels[channel][index]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }

    return signal?.aborted ? blob : new Blob([output], { type: 'audio/wav' });
  } catch {
    return blob;
  }
};

/** Decode any recorded blob to PCM. Used to stitch multi-voice segments. */
const decodeBlob = async (blob: Blob): Promise<AudioBuffer> => {
  const context = new AudioContext();
  try {
    return await context.decodeAudioData(await blob.arrayBuffer());
  } finally {
    if (context.state !== 'closed') void context.close().catch(() => {});
  }
};

/** Mix a buffer down to a single mono channel at the target sample rate. */
const toMono = (buffer: AudioBuffer, targetRate: number): Float32Array => {
  const length = buffer.length;
  const mixed = new Float32Array(length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < length; index += 1) mixed[index] += data[index];
  }
  if (buffer.numberOfChannels > 1) {
    for (let index = 0; index < length; index += 1) mixed[index] /= buffer.numberOfChannels;
  }
  if (buffer.sampleRate === targetRate) return mixed;

  // Devices rarely switch rates mid-take, but a linear resample keeps the
  // stitched take in sync when they do.
  const ratio = targetRate / buffer.sampleRate;
  const outLength = Math.round(length * ratio);
  const out = new Float32Array(outLength);
  for (let index = 0; index < outLength; index += 1) {
    const source = index / ratio;
    const low = Math.floor(source);
    const high = Math.min(length - 1, low + 1);
    const fraction = source - low;
    out[index] = mixed[low] * (1 - fraction) + mixed[high] * fraction;
  }
  return out;
};

/** Encode mono PCM as a 16-bit WAV blob. */
const encodeMonoWav = (samples: Float32Array, sampleRate: number): Blob => {
  const dataSize = samples.length * 2;
  const output = new ArrayBuffer(44 + dataSize);
  const view = new DataView(output);
  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return new Blob([output], { type: 'audio/wav' });
};

/**
 * Stitch the pause-separated takes into one continuous clip. Each take can use
 * a different voice filter, which is exactly the point: pause, switch voice,
 * keep going.
 */
const concatAudioBlobs = async (blobs: Blob[]): Promise<Blob> => {
  if (blobs.length === 0) return new Blob([], { type: 'audio/wav' });
  if (blobs.length === 1) return blobs[0];
  const buffers = await Promise.all(blobs.map(decodeBlob));
  const sampleRate = buffers[0].sampleRate;
  const parts = buffers.map((buffer) => toMono(buffer, sampleRate));
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }
  return encodeMonoWav(merged, sampleRate);
};


interface AudioRecorderProps {
  playerId: string;
  playerName: string;
  onAudioSaved?: (clip: VideoClip) => void;
  lobbyId?: string;
  roundNumber?: number;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  /**
   * Segment suspendu. Distinct de `onRecordingStop`, qui signale la fin de la
   * prise : le parent doit pouvoir figer la vidéo à imiter sans la rembobiner.
   */
  onRecordingPause?: () => void;
  /** Segment repris après un changement de voix. */
  onRecordingResume?: () => void;
  /** Show the voice-filter picker above the mic button (Ink mode). */
  showVoiceFilters?: boolean;
}

export interface AudioRecorderHandle {
  stopRecording: () => void;
}

interface RecordingSession {
  controller: AbortController;
}

/**
 * Un morceau de prise, avec la voix employée à ce moment-là.
 *
 * Le filtre est mémorisé par segment, pas globalement : changer de voix pendant
 * une pause ne doit pas rétro-appliquer la nouvelle voix aux segments déjà
 * enregistrés. Les effets `helium` et `deep` sont appliqués après coup sur le
 * blob, donc sans ça les 15 premières secondes changeraient de voix elles aussi.
 */
interface RecordedSegment {
  blob: Blob;
  filter: VoiceFilterId;
}

const NATURAL_VOICE: VoiceFilterDef = {
  id: 'none',
  label: 'Naturel',
  emoji: '🎤',
  description: 'Aucun effet',
  color: '#9ca3af',
};

const describeVoice = (id: VoiceFilterId): VoiceFilterDef =>
  VOICE_FILTERS.find((entry) => entry.id === id) ?? NATURAL_VOICE;

/**
 * Rappelle ce qui est déjà dans la boîte, et avec quelle voix.
 *
 * Sans ça, un joueur qui enchaîne trois voix n'a aucun moyen de savoir ce qu'il
 * a construit avant d'écouter le résultat.
 */
const SegmentList = ({ filters }: { filters: VoiceFilterId[] }) => {
  if (filters.length === 0) return null;

  return (
    <div className="rounded-lg bg-background/40 p-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
        {filters.length} segment{filters.length > 1 ? 's' : ''} enregistré{filters.length > 1 ? 's' : ''}
      </p>
      <ol className="flex flex-wrap gap-2">
        {filters.map((filter, index) => {
          const voice = describeVoice(filter);
          return (
            <li
              key={`${filter}-${index}`}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ background: `${voice.color}22`, border: `1px solid ${voice.color}66` }}
            >
              <span className="text-foreground-secondary">{index + 1}.</span>
              <span aria-hidden="true">{voice.emoji}</span>
              <span style={{ color: voice.color }}>{voice.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

const stopStreamTracks = (...streams: Array<MediaStream | null | undefined>) => {
  const tracks = new Set<MediaStreamTrack>();
  for (const stream of streams) {
    for (const track of stream?.getTracks() ?? []) tracks.add(track);
  }
  for (const track of tracks) {
    try {
      track.stop();
    } catch {
      // The track may already have ended.
    }
  }
};

export const AudioRecorder = React.forwardRef<AudioRecorderHandle, AudioRecorderProps>(({
  playerId,
  playerName,
  onAudioSaved,
  lobbyId,
  roundNumber,
  onRecordingStart,
  onRecordingStop,
  onRecordingPause,
  onRecordingResume,
  showVoiceFilters = false,
}, ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioName, setAudioName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [voiceFilter, setVoiceFilter] = useState<VoiceFilterId>('none');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  /** Voix de chaque segment déjà enregistré, dans l'ordre, pour l'affichage. */
  const [segmentFilters, setSegmentFilters] = useState<VoiceFilterId[]>([]);
  /** Voix réellement en train d'être enregistrée, figée au début du segment. */
  const [activeFilter, setActiveFilter] = useState<VoiceFilterId>('none');

  const mountedRef = useRef(false);
  const startingRef = useRef(false);
  const activeSessionRef = useRef<RecordingSession | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const filterDisposeRef = useRef<(() => void) | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const getUserMediaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const segmentsRef = useRef<RecordedSegment[]>([]);
  /** Distingue une pause d'un arrêt définitif dans le même `onstop`. */
  const pauseIntentRef = useRef(false);
  const callbacksRef = useRef({
    onAudioSaved,
    onRecordingStart,
    onRecordingStop,
    onRecordingPause,
    onRecordingResume,
  });
  callbacksRef.current = {
    onAudioSaved,
    onRecordingStart,
    onRecordingStop,
    onRecordingPause,
    onRecordingResume,
  };

  const { toast } = useToast();

  /** Voix du segment en cours d'enregistrement. */
  const activeVoice = describeVoice(activeFilter);
  /** Voix qui s'appliquera au prochain segment, choisie pendant la pause. */
  const pendingVoice = describeVoice(voiceFilter);

  const isSessionActive = (session: RecordingSession) =>
    mountedRef.current &&
    activeSessionRef.current === session &&
    !session.controller.signal.aborted;

  const clearGetUserMediaTimeout = useCallback(() => {
    if (getUserMediaTimeoutRef.current === null) return;
    clearTimeout(getUserMediaTimeoutRef.current);
    getUserMediaTimeoutRef.current = null;
  }, []);

  const clearRecordingStartTimeout = useCallback(() => {
    if (recordingStartTimeoutRef.current === null) return;
    clearTimeout(recordingStartTimeoutRef.current);
    recordingStartTimeoutRef.current = null;
  }, []);

  /**
   * Démonte la chaîne d'effets sans toucher au micro.
   *
   * Une pause doit garder le flux brut ouvert : le rouvrir demanderait à nouveau
   * l'autorisation sur certains navigateurs et ferait perdre une seconde à la
   * reprise.
   *
   * Piège : `applyVoiceFilter` renvoie le flux d'ENTRÉE tel quel pour `none`,
   * `helium` et `deep`, qui n'ont pas de chaîne temps réel. Le flux « filtré »
   * est alors le flux du micro lui-même, et l'arrêter couperait le micro.
   */
  const disposeFilterChain = useCallback(() => {
    const dispose = filterDisposeRef.current;
    filterDisposeRef.current = null;
    try {
      dispose?.();
    } catch {
      // Le graphe WebAudio peut déjà être déconnecté.
    }

    const filtered = recordingStreamRef.current;
    recordingStreamRef.current = null;
    if (filtered && filtered !== rawStreamRef.current) {
      stopStreamTracks(filtered);
    }
  }, []);

  const releaseAudioResources = useCallback((recorder?: MediaRecorder | null) => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const disposeFilter = filterDisposeRef.current;
    filterDisposeRef.current = null;
    try {
      disposeFilter?.();
    } catch {
      // A partially-created WebAudio graph may already be disconnected.
    }

    stopStreamTracks(
      rawStreamRef.current,
      recordingStreamRef.current,
      recorder?.stream,
    );
    rawStreamRef.current = null;
    recordingStreamRef.current = null;
    analyserRef.current = null;

    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== 'closed') {
      void context.close().catch(() => {});
    }
  }, []);

  const cancelActiveSession = useCallback(() => {
    const session = activeSessionRef.current;
    activeSessionRef.current = null;
    session?.controller.abort();
    startingRef.current = false;
    clearGetUserMediaTimeout();
    clearRecordingStartTimeout();

    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // Recorder may already be stopping.
        }
      }
    }
    releaseAudioResources(recorder);
  }, [clearGetUserMediaTimeout, clearRecordingStartTimeout, releaseAudioResources]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelActiveSession();
    };
  }, [cancelActiveSession]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const updateAudioLevel = (session: RecordingSession, recorder: MediaRecorder) => {
    if (!isSessionActive(session) || recorder.state !== 'recording' || !analyserRef.current) {
      animationFrameRef.current = null;
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    setAudioLevel(Math.min(100, (average / 255) * 100));
    animationFrameRef.current = requestAnimationFrame(() => updateAudioLevel(session, recorder));
  };

  const startRecording = async () => {
    if (startingRef.current || mediaRecorderRef.current?.state === 'recording') return;

    startingRef.current = true;
    activeSessionRef.current?.controller.abort();
    const session: RecordingSession = { controller: new AbortController() };
    activeSessionRef.current = session;
    const selectedFilter = voiceFilter;

    try {
      const mediaRequest = navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      void mediaRequest.then(
        (lateStream) => {
          if (!isSessionActive(session)) stopStreamTracks(lateStream);
        },
        () => undefined,
      );

      const timeoutPromise = new Promise<MediaStream>((_, reject) => {
        getUserMediaTimeoutRef.current = setTimeout(
          () => reject(new Error('TIMEOUT_GETUSERMEDIA')),
          10_000,
        );
      });
      const abortPromise = new Promise<MediaStream>((_, reject) => {
        session.controller.signal.addEventListener(
          'abort',
          () => reject(new DOMException('Recording cancelled', 'AbortError')),
          { once: true },
        );
      });

      const mediaStream = await Promise.race([mediaRequest, timeoutPromise, abortPromise]);
      clearGetUserMediaTimeout();
      if (!isSessionActive(session)) {
        stopStreamTracks(mediaStream);
        return;
      }
      rawStreamRef.current = mediaStream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      audioContext.createMediaStreamSource(mediaStream).connect(analyser);
      analyser.fftSize = 256;

      startSegment(session, mediaStream, selectedFilter);
    } catch (error: unknown) {
      clearGetUserMediaTimeout();
      if (!isSessionActive(session)) return;

      session.controller.abort();
      if (activeSessionRef.current === session) activeSessionRef.current = null;
      releaseAudioResources(mediaRecorderRef.current);
      mediaRecorderRef.current = null;
      setIsRecording(false);
      setIsPaused(false);
      setAudioLevel(0);

      const mediaError = error as { message?: string; name?: string };
      let errorMessage = 'Impossible d\'accéder au microphone.';
      if (mediaError.message === 'TIMEOUT_GETUSERMEDIA') {
        errorMessage = 'Le micro met trop de temps à répondre. Vérifiez les permissions.';
      } else if (mediaError.name === 'NotAllowedError') {
        errorMessage = 'Vous devez autoriser l\'accès au microphone.';
      } else if (mediaError.name === 'NotFoundError') {
        errorMessage = 'Aucun microphone détecté.';
      } else if (mediaError.name === 'NotReadableError') {
        errorMessage = 'Le microphone est utilisé par une autre application. Fermez-la et réessayez.';
      } else if (mediaError.name === 'AbortError') {
        errorMessage = 'L\'accès au microphone a été interrompu. Réessayez.';
      }

      console.error('Error accessing microphone:', error);
      toast({ title: 'Erreur', description: errorMessage, variant: 'destructive' });
    } finally {
      clearGetUserMediaTimeout();
      startingRef.current = false;
    }
  };

  /**
   * Ouvre un segment d'enregistrement sur un micro déjà obtenu.
   *
   * Appelé au démarrage et à chaque reprise. Chaque segment a sa propre chaîne
   * d'effets et son propre `MediaRecorder`, parce qu'un `MediaRecorder` ne peut
   * pas changer de flux en cours de route — et changer de voix change le flux.
   * C'est pour ça que la prise est découpée puis recollée, plutôt que d'utiliser
   * `MediaRecorder.pause()`, qui garderait la voix du début.
   */
  function startSegment(
    session: RecordingSession,
    mediaStream: MediaStream,
    selectedFilter: VoiceFilterId,
    /** Vrai pour un segment ouvert après une pause, faux pour un début de prise. */
    isResume = false,
  ) {
      const filtered = applyVoiceFilter(mediaStream, selectedFilter);
      if (!isSessionActive(session)) {
        filtered.dispose();
        stopStreamTracks(mediaStream, filtered.stream);
        return;
      }
      filterDisposeRef.current = filtered.dispose;
      recordingStreamRef.current = filtered.stream;

      let options: MediaRecorderOptions = { mimeType: 'audio/webm;codecs=opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) options = { mimeType: 'audio/ogg;codecs=opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) options = {};

      const recorder = new MediaRecorder(filtered.stream, options);
      const chunks: Blob[] = [];
      let shouldFinalize = true;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (isSessionActive(session) && event.data?.size > 0) chunks.push(event.data);
      };

      recorder.onerror = (event) => {
        if (!isSessionActive(session)) return;
        console.error('MediaRecorder error:', event);
        shouldFinalize = false;
        clearRecordingStartTimeout();
        recorder.onstop = null;
        if (recorder.state !== 'inactive') {
          try {
            recorder.stop();
          } catch {
            // Recorder may already be stopping.
          }
        }
        if (mediaRecorderRef.current === recorder) mediaRecorderRef.current = null;
        releaseAudioResources(recorder);
        session.controller.abort();
        if (activeSessionRef.current === session) activeSessionRef.current = null;
        setIsRecording(false);
        setAudioLevel(0);
        callbacksRef.current.onRecordingStop?.();
        toast({
          title: 'Erreur d\'enregistrement',
          description: 'Le microphone a rencontré un problème. Réessayez.',
          variant: 'destructive',
        });
      };

      recorder.onstop = () => {
        clearRecordingStartTimeout();
        if (mediaRecorderRef.current === recorder) mediaRecorderRef.current = null;

        const wasPause = pauseIntentRef.current;
        pauseIntentRef.current = false;

        // Une pause ne relâche que la chaîne d'effets : le micro doit rester
        // ouvert pour que la reprise soit immédiate.
        if (wasPause) disposeFilterChain();
        else releaseAudioResources(recorder);

        if (!shouldFinalize || !isSessionActive(session)) return;

        const segmentBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (segmentBlob.size > 0) {
          segmentsRef.current = [
            ...segmentsRef.current,
            { blob: segmentBlob, filter: selectedFilter },
          ];
          setSegmentFilters(segmentsRef.current.map((segment) => segment.filter));
        }

        setIsRecording(false);
        setAudioLevel(0);

        if (wasPause) {
          setIsPaused(true);
          callbacksRef.current.onRecordingPause?.();
          return;
        }

        callbacksRef.current.onRecordingStop?.();
        /*
         * Plus de téléversement automatique ici.
         *
         * `autoSaveClip` était appelé dès l'arrêt : l'imitation partait sans que
         * le joueur ait pu la réécouter, et le parent remplaçait aussitôt le
         * composant par son écran d'attente. L'écran de contrôle existait déjà
         * mais restait inatteignable. L'envoi est désormais explicite.
         */
        void finalizeTake(session);
      };

      recorder.start(100);
      if (!isSessionActive(session)) {
        cancelActiveSession();
        return;
      }
      setIsRecording(true);
      setActiveFilter(selectedFilter);
      updateAudioLevel(session, recorder);

      /*
       * `onRecordingStart` ne concerne que le DÉBUT d'une prise, pas chaque
       * segment.
       *
       * Le parent y remet la vidéo à imiter au début du clip, ce qui est juste
       * pour une nouvelle prise. Le déclencher aussi à la reprise rembobinait la
       * vidéo 200 ms après chaque changement de voix, écrasant la position que
       * `onRecordingResume` venait de restaurer. Une reprise annonce
       * `onRecordingResume`, et rien d'autre.
       */
      if (!isResume) {
        recordingStartTimeoutRef.current = setTimeout(() => {
          recordingStartTimeoutRef.current = null;
          if (isSessionActive(session) && recorder.state === 'recording') {
            callbacksRef.current.onRecordingStart?.();
          }
        }, 200);

        toast({
          title: '🎤 Enregistrement audio démarré',
          description: 'Imitez maintenant !',
        });
      }
  }

  /**
   * Recolle les segments et prépare l'écoute.
   *
   * Le post-traitement est fait segment par segment, chacun avec SA voix, AVANT
   * la concaténation. Traiter la prise entière avec la voix courante
   * réappliquerait le dernier filtre choisi au début de l'enregistrement.
   */
  const finalizeTake = async (session: RecordingSession) => {
    const segments = segmentsRef.current;
    if (segments.length === 0 || !isSessionActive(session)) return;

    setIsLoading(true);
    try {
      const processed: Blob[] = [];
      for (const segment of segments) {
        if (!isSessionActive(session)) return;
        processed.push(
          requiresPostProcessing(segment.filter)
            ? await postProcessRecordedBlob(
                segment.blob,
                segment.filter,
                session.controller.signal,
              )
            : segment.blob,
        );
      }
      if (!isSessionActive(session)) return;

      let blob = await concatAudioBlobs(processed);
      if (!isSessionActive(session)) return;
      blob = await trimLeadingSilence(blob, session.controller.signal);
      if (!isSessionActive(session)) return;

      setRecordedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setAudioName(`Imitation ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      if (!isSessionActive(session)) return;
      console.error('[recorder] stitching failed', error);
      /*
       * Sans cette remise à zéro, l'écran revenait à « commencer un
       * enregistrement » alors que les segments étaient toujours en mémoire :
       * un état mi-chemin où le joueur ne comprend ni ce qu'il a, ni ce qu'il
       * doit faire. Mieux vaut repartir franchement de zéro et le dire.
       */
      segmentsRef.current = [];
      setSegmentFilters([]);
      setIsPaused(false);
      toast({
        title: 'Enregistrement perdu',
        description: "Impossible d'assembler les segments. Recommencez l'imitation.",
        variant: 'destructive',
      });
    } finally {
      if (isSessionActive(session)) setIsLoading(false);
    }
  };

  /** Clôt le segment courant en gardant le micro ouvert. */
  const pauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    clearRecordingStartTimeout();
    pauseIntentRef.current = true;
    recorder.stop();
  };

  /** Ouvre un nouveau segment, avec la voix choisie entre-temps. */
  const resumeRecording = () => {
    const session = activeSessionRef.current;
    const mediaStream = rawStreamRef.current;
    if (!session || !isSessionActive(session) || !mediaStream) return;
    if (mediaRecorderRef.current) return;

    setIsPaused(false);
    startSegment(session, mediaStream, voiceFilter, true);
    callbacksRef.current.onRecordingResume?.();

    // Confirmation explicite que le changement de voix est bien pris en compte.
    const voice = describeVoice(voiceFilter);
    toast({
      title: `${voice.emoji} Voix : ${voice.label}`,
      description: `Segment ${segmentsRef.current.length + 1} en cours d'enregistrement.`,
    });
  };

  function stopRecording() {
    clearRecordingStartTimeout();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      pauseIntentRef.current = false;
      recorder.stop();
      return;
    }
    // Arrêt demandé pendant une pause : il reste des segments à recoller.
    const session = activeSessionRef.current;
    if (isPaused && session && isSessionActive(session)) {
      setIsPaused(false);
      releaseAudioResources(null);
      void finalizeTake(session);
    }
  }

  React.useImperativeHandle(ref, () => ({ stopRecording }));

  const handleSaveClip = async () => {
    const session = activeSessionRef.current;
    if (!recordedBlob || !audioName.trim() || !session || !isSessionActive(session)) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez nommer votre audio",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const mimeType = recordedBlob.type || 'audio/webm';
      const extension = extensionForMimeType(mimeType);
      const file = new File([recordedBlob], `${audioName}.${extension}`, { type: mimeType });
      const clipData = {
        id: `${playerId}-${Date.now()}`,
        name: audioName,
        playerId,
        playerName,
        startTime: 0,
        endTime: 0,
        duration: 0,
        isMuted: false,
        lobbyId,
        roundNumber,
      };
      const savedClip = await videoStorage.uploadVideo(file, clipData);
      if (!isSessionActive(session)) return;
      callbacksRef.current.onAudioSaved?.(savedClip);
      toast({
        title: "✅ Audio sauvegardé !",
        description: `"${audioName}" a été ajouté avec succès`,
      });
    } catch (error) {
      if (!isSessionActive(session)) return;
      console.error("Error saving audio clip:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'audio",
        variant: "destructive",
      });
    } finally {
      if (isSessionActive(session)) setIsLoading(false);
    }
  };

  const handleClear = () => {
    cancelActiveSession();
    setPreviewUrl(null);
    setRecordedBlob(null);
    setAudioName("");
    setAudioLevel(0);
    setIsRecording(false);
    setIsLoading(false);
    setIsPaused(false);
    segmentsRef.current = [];
    setSegmentFilters([]);
    pauseIntentRef.current = false;
  };

  return (
    <Card className="p-6 bg-background-secondary/50 border-glass-border">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-secondary" />
          <h3 className="text-xl font-semibold text-gradient">
            Enregistrer votre imitation
          </h3>
        </div>

        {!isRecording && !isPaused && !recordedBlob && (
          <div className="space-y-4">
            {showVoiceFilters && (
              <InkVoiceFilterPicker
                value={voiceFilter}
                onChange={setVoiceFilter}
              />
            )}
            <p className="text-sm text-foreground-secondary text-center">
              Cliquez pour commencer à enregistrer votre voix
            </p>
            <div className="flex justify-center">
              <Button
                onClick={startRecording}
                variant="hero"
                size="lg"
                className="w-32 h-32 rounded-full"
              >
                <Mic className="h-12 w-12" />
              </Button>
            </div>
          </div>
        )}

        {isRecording && (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-destructive/20 flex items-center justify-center">
                  <Mic className="h-12 w-12 text-destructive animate-pulse" />
                </div>
                <span
                  className="absolute inset-0 rounded-full border-4 border-destructive animate-ping"
                  style={{ opacity: audioLevel / 100, animationDuration: '1s' }}
                />
              </div>

              <div className="flex gap-2 items-end h-16">
                {[...Array(7)].map((_, index) => (
                  <div
                    key={index}
                    className="w-3 bg-secondary rounded-full transition-all duration-100"
                    style={{
                      height: `${Math.max(12, (audioLevel / 100) * 64 * (0.4 + Math.random() * 0.6))}px`,
                    }}
                  />
                ))}
              </div>

              <p className="text-lg font-semibold text-destructive animate-pulse">
                🎤 Enregistrement en cours...
              </p>

              {/* Quelle voix part réellement dans le fichier, à cet instant. */}
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2"
                style={{
                  background: `${activeVoice.color}22`,
                  border: `1px solid ${activeVoice.color}`,
                }}
                aria-live="polite"
              >
                <span className="text-lg" aria-hidden="true">{activeVoice.emoji}</span>
                <span className="text-sm font-semibold" style={{ color: activeVoice.color }}>
                  Voix : {activeVoice.label}
                </span>
                <span className="text-xs text-foreground-secondary">
                  · segment {segmentFilters.length + 1}
                </span>
              </div>

              <SegmentList filters={segmentFilters} />

              <div className="grid w-full grid-cols-2 gap-3 mt-2">
                <Button onClick={pauseRecording} variant="outline" size="lg">
                  <PauseCircle className="h-5 w-5 mr-2" />
                  Pause
                </Button>
                <Button onClick={stopRecording} variant="destructive" size="lg">
                  <StopCircle className="h-5 w-5 mr-2" />
                  Terminer
                </Button>
              </div>
              <p className="text-xs text-center text-foreground-secondary">
                Mettez en pause pour changer de voix, puis reprenez : les morceaux
                seront recollés bout à bout.
              </p>
            </div>
          </div>
        )}

        {isPaused && !recordedBlob && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <p className="text-lg font-semibold text-secondary">⏸️ En pause</p>
              <p className="text-sm text-foreground-secondary">
                Choisissez une autre voix, puis reprenez. Ce qui est déjà enregistré
                garde la voix d'origine.
              </p>
            </div>

            <SegmentList filters={segmentFilters} />

            {showVoiceFilters && (
              <InkVoiceFilterPicker value={voiceFilter} onChange={setVoiceFilter} />
            )}

            <div
              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2"
              style={{
                background: `${pendingVoice.color}1a`,
                border: `1px solid ${pendingVoice.color}66`,
              }}
              aria-live="polite"
            >
              <span className="text-base" aria-hidden="true">{pendingVoice.emoji}</span>
              <span className="text-sm font-medium">
                Prochain segment : <strong style={{ color: pendingVoice.color }}>{pendingVoice.label}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={stopRecording} variant="outline" disabled={isLoading}>
                <StopCircle className="h-4 w-4 mr-2" />
                Terminer
              </Button>
              <Button onClick={resumeRecording} variant="hero" disabled={isLoading}>
                <PlayCircle className="h-4 w-4 mr-2" />
                Reprendre
              </Button>
            </div>
          </div>
        )}

        {recordedBlob && previewUrl && (
          <div className="space-y-4">
            <p className="text-center text-sm text-foreground-secondary">
              ✅ Enregistrement terminé ! Écoutez, puis envoyez.
            </p>

            <SegmentList filters={segmentFilters} />

            {isLoading && segmentFilters.length > 1 && (
              <p className="text-center text-xs text-foreground-secondary">
                Assemblage des {segmentFilters.length} segments…
              </p>
            )}

            <div className="p-4 bg-background/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-secondary">
                <Play className="h-4 w-4" />
                Écouter votre imitation
              </div>
              <audio src={previewUrl} className="w-full" controls autoPlay={false} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleClear}
                disabled={isLoading}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Recommencer
              </Button>
              <Button
                variant="hero"
                onClick={handleSaveClip}
                disabled={isLoading}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "..." : "Valider"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
});

AudioRecorder.displayName = 'AudioRecorder';
