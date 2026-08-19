import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mic, StopCircle, Save, Play, RotateCcw } from "lucide-react";
import { videoStorage, type VideoClip } from "@/lib/videoStorageSupabase";
import {
  applyVoiceFilter,
  postProcessRecordedBlob,
  requiresPostProcessing,
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

interface AudioRecorderProps {
  playerId: string;
  playerName: string;
  onAudioSaved?: (clip: VideoClip) => void;
  lobbyId?: string;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  /** Show the voice-filter picker above the mic button (Ink mode). */
  showVoiceFilters?: boolean;
}

export interface AudioRecorderHandle {
  stopRecording: () => void;
}

interface RecordingSession {
  controller: AbortController;
}

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
  onRecordingStart,
  onRecordingStop,
  showVoiceFilters = false,
}, ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioName, setAudioName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [voiceFilter, setVoiceFilter] = useState<VoiceFilterId>('none');
  const [audioLevel, setAudioLevel] = useState(0);

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
  const callbacksRef = useRef({ onAudioSaved, onRecordingStart, onRecordingStop });
  callbacksRef.current = { onAudioSaved, onRecordingStart, onRecordingStop };

  const { toast } = useToast();

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

  const autoSaveClip = async (blob: Blob, name: string, session: RecordingSession) => {
    if (!isSessionActive(session)) return;
    setIsLoading(true);

    try {
      const mimeType = blob.type || 'audio/webm';
      const extension = mimeType.includes('wav') ? 'wav' : 'webm';
      const file = new File([blob], `${name}.${extension}`, { type: mimeType });
      const clipData = {
        id: `${playerId}-${Date.now()}`,
        name,
        playerId,
        playerName,
        startTime: 0,
        endTime: 0,
        duration: 0,
        isMuted: false,
        lobbyId,
      };

      if (!isSessionActive(session)) return;
      const savedClip = await videoStorage.uploadVideo(file, clipData);
      if (!isSessionActive(session)) return;
      callbacksRef.current.onAudioSaved?.(savedClip);
    } catch (error) {
      if (!isSessionActive(session)) return;
      console.error("Error auto-saving audio clip:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'audio automatiquement",
        variant: "destructive",
      });
    } finally {
      if (isSessionActive(session)) setIsLoading(false);
    }
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
        releaseAudioResources(recorder);
        if (!shouldFinalize || !isSessionActive(session)) return;

        const rawBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        setIsRecording(false);
        setAudioLevel(0);
        callbacksRef.current.onRecordingStop?.();

        const finalize = async () => {
          let blob = rawBlob;
          if (requiresPostProcessing(selectedFilter)) {
            setIsLoading(true);
            try {
              blob = await postProcessRecordedBlob(
                rawBlob,
                selectedFilter,
                session.controller.signal,
              );
            } catch (error) {
              if (isSessionActive(session)) {
                console.warn('[recorder] post-process failed, using raw blob', error);
              }
            } finally {
              if (isSessionActive(session)) setIsLoading(false);
            }
          }
          if (!isSessionActive(session)) return;

          blob = await trimLeadingSilence(blob, session.controller.signal);
          if (!isSessionActive(session)) return;

          setRecordedBlob(blob);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          const autoName = `Imitation ${new Date().toLocaleTimeString()}`;
          setAudioName(autoName);
          await autoSaveClip(blob, autoName, session);
        };
        void finalize();
      };

      recorder.start(100);
      if (!isSessionActive(session)) {
        cancelActiveSession();
        return;
      }
      setIsRecording(true);
      updateAudioLevel(session, recorder);
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
    } catch (error: unknown) {
      clearGetUserMediaTimeout();
      if (!isSessionActive(session)) return;

      session.controller.abort();
      if (activeSessionRef.current === session) activeSessionRef.current = null;
      releaseAudioResources(mediaRecorderRef.current);
      mediaRecorderRef.current = null;
      setIsRecording(false);
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

  function stopRecording() {
    clearRecordingStartTimeout();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
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
      const extension = mimeType.includes('wav') ? 'wav' : 'webm';
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

        {!isRecording && !recordedBlob && (
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

              <Button
                onClick={stopRecording}
                variant="destructive"
                size="lg"
                className="w-full mt-4"
              >
                <StopCircle className="h-5 w-5 mr-2" />
                Arrêter l'enregistrement
              </Button>
            </div>
          </div>
        )}

        {recordedBlob && previewUrl && (
          <div className="space-y-4">
            <p className="text-center text-sm text-foreground-secondary">
              ✅ Enregistrement terminé ! Écoutez et sauvegardez.
            </p>

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
                {isLoading ? "..." : "Sauvegarder"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
});

AudioRecorder.displayName = 'AudioRecorder';
