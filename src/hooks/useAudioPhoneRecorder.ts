import { useCallback, useEffect, useRef, useState } from 'react';
import { processStreamWithNoiseReduction } from '@/hooks/useNoiseReduction';

type RecorderStatus = 'idle' | 'starting' | 'recording' | 'stopping';

interface RecordingSession {
  controller: AbortController;
  rawStream: MediaStream | null;
  processedStream: MediaStream | null;
  noiseReductionCleanup: (() => void) | null;
  audioContext: AudioContext | null;
  source: MediaStreamAudioSourceNode | null;
  analyser: AnalyserNode | null;
  recorder: MediaRecorder | null;
  chunks: Blob[];
  timerRaf: number | null;
  meterRaf: number | null;
  startedAt: number;
  released: boolean;
}

interface UseAudioPhoneRecorderOptions {
  maxSeconds: number;
  onError?: (error: unknown) => void;
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
      // A browser may already have ended the track while tearing down the graph.
    }
  }
};

const chooseMimeType = () => {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg',
  ];
  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? '';
};

/**
 * Owns one Audio Phone microphone take from permission request to preview.
 *
 * Every asynchronous callback closes over its own session. An old `onstop`, a
 * late `getUserMedia` resolution or a cancelled RNNoise setup therefore cannot
 * mutate or release the resources of the next take.
 */
export const useAudioPhoneRecorder = ({
  maxSeconds,
  onError,
}: UseAudioPhoneRecorderOptions) => {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mountedRef = useRef(false);
  const activeSessionRef = useRef<RecordingSession | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const isSessionActive = useCallback((session: RecordingSession) => (
    mountedRef.current
    && activeSessionRef.current === session
    && !session.controller.signal.aborted
    && !session.released
  ), []);

  const cancelSessionRafs = useCallback((session: RecordingSession) => {
    if (session.timerRaf !== null) {
      cancelAnimationFrame(session.timerRaf);
      session.timerRaf = null;
    }
    if (session.meterRaf !== null) {
      cancelAnimationFrame(session.meterRaf);
      session.meterRaf = null;
    }
  }, []);

  const releaseSessionResources = useCallback((session: RecordingSession) => {
    if (session.released) return;
    session.released = true;
    cancelSessionRafs(session);

    const noiseCleanup = session.noiseReductionCleanup;
    session.noiseReductionCleanup = null;
    try {
      noiseCleanup?.();
    } catch {
      // The RNNoise graph may already have been disconnected by the browser.
    }

    stopStreamTracks(
      session.rawStream,
      session.processedStream,
      session.recorder?.stream,
    );
    session.rawStream = null;
    session.processedStream = null;

    try {
      session.source?.disconnect();
    } catch {
      // A partially-created graph may not be connected yet.
    }
    try {
      session.analyser?.disconnect();
    } catch {
      // Same as above.
    }
    session.source = null;
    session.analyser = null;

    const context = session.audioContext;
    session.audioContext = null;
    if (context && context.state !== 'closed') {
      void context.close().catch(() => undefined);
    }
  }, [cancelSessionRafs]);

  const cancelActiveSession = useCallback(() => {
    const session = activeSessionRef.current;
    if (!session) return;

    // Invalidate first: a synchronous `stop()` event must already be stale.
    activeSessionRef.current = null;
    session.controller.abort();
    cancelSessionRafs(session);

    const recorder = session.recorder;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // The recorder may already be stopping.
        }
      }
    }
    releaseSessionResources(session);
  }, [cancelSessionRafs, releaseSessionResources]);

  const failSession = useCallback((session: RecordingSession, error: unknown) => {
    if (activeSessionRef.current !== session) {
      releaseSessionResources(session);
      return;
    }

    activeSessionRef.current = null;
    session.controller.abort();
    const recorder = session.recorder;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // The recorder may already be stopping.
        }
      }
    }
    releaseSessionResources(session);

    if (!mountedRef.current) return;
    setStatus('idle');
    setRecordingTime(0);
    setAudioLevel(0);
    onErrorRef.current?.(error);
  }, [releaseSessionResources]);

  const requestStop = useCallback((session: RecordingSession) => {
    if (!isSessionActive(session)) return;
    const recorder = session.recorder;
    if (!recorder || recorder.state === 'inactive') return;

    cancelSessionRafs(session);
    setStatus('stopping');
    setAudioLevel(0);
    try {
      recorder.stop();
    } catch (error) {
      failSession(session, error);
    }
  }, [cancelSessionRafs, failSession, isSessionActive]);

  const stopRecording = useCallback(() => {
    const session = activeSessionRef.current;
    if (session) requestStop(session);
  }, [requestStop]);

  const startRecording = useCallback(async () => {
    // Covers permission requests, active takes and the short `onstop` window.
    if (activeSessionRef.current) return;

    const session: RecordingSession = {
      controller: new AbortController(),
      rawStream: null,
      processedStream: null,
      noiseReductionCleanup: null,
      audioContext: null,
      source: null,
      analyser: null,
      recorder: null,
      chunks: [],
      timerRaf: null,
      meterRaf: null,
      startedAt: 0,
      released: false,
    };
    activeSessionRef.current = session;
    if (mountedRef.current) setStatus('starting');

    try {
      const mediaRequest = navigator.mediaDevices.getUserMedia({ audio: true });
      // `getUserMedia` cannot be aborted everywhere. Stop a stream that arrives
      // after a phrase change or unmount before it can light the microphone.
      void mediaRequest.then(
        (lateStream) => {
          if (!isSessionActive(session)) stopStreamTracks(lateStream);
        },
        () => undefined,
      );

      const rawStream = await mediaRequest;
      if (!isSessionActive(session)) {
        stopStreamTracks(rawStream);
        return;
      }
      session.rawStream = rawStream;

      const processed = await processStreamWithNoiseReduction(rawStream, {
        signal: session.controller.signal,
      });
      if (!isSessionActive(session)) {
        try {
          processed.cleanup();
        } catch {
          // The graph may have been only partially initialized.
        }
        stopStreamTracks(rawStream, processed.stream);
        return;
      }
      session.processedStream = processed.stream;
      session.noiseReductionCleanup = processed.cleanup;

      const audioContext = new AudioContext();
      session.audioContext = audioContext;
      const source = audioContext.createMediaStreamSource(processed.stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      session.source = source;
      session.analyser = analyser;

      const selectedMimeType = chooseMimeType();
      const recorder = new MediaRecorder(processed.stream, {
        mimeType: selectedMimeType || undefined,
      });
      session.recorder = recorder;

      recorder.ondataavailable = (event) => {
        if (isSessionActive(session) && event.data.size > 0) {
          session.chunks.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        failSession(session, event);
      };

      recorder.onstop = () => {
        const shouldCommit = isSessionActive(session);
        const blob = new Blob(session.chunks, {
          type: recorder.mimeType || selectedMimeType || 'audio/webm',
        });

        recorder.ondataavailable = null;
        recorder.onerror = null;
        recorder.onstop = null;
        if (activeSessionRef.current === session) activeSessionRef.current = null;
        session.controller.abort();
        releaseSessionResources(session);

        if (!shouldCommit || !mountedRef.current) return;
        setRecordedBlob(blob.size > 0 ? blob : null);
        setStatus('idle');
        setAudioLevel(0);
      };

      recorder.start(100);
      if (!isSessionActive(session)) {
        cancelActiveSession();
        return;
      }

      // A valid new take replaces the previous preview only after the recorder
      // really started, so a denied permission does not discard good audio.
      setRecordedBlob(null);
      setRecordingTime(0);
      setAudioLevel(0);
      setStatus('recording');
      session.startedAt = performance.now();

      const tick = () => {
        if (!isSessionActive(session) || recorder.state !== 'recording') {
          session.timerRaf = null;
          return;
        }
        const elapsed = (performance.now() - session.startedAt) / 1000;
        setRecordingTime(Math.min(elapsed, maxSeconds));
        if (elapsed >= maxSeconds) {
          requestStop(session);
          return;
        }
        session.timerRaf = requestAnimationFrame(tick);
      };
      session.timerRaf = requestAnimationFrame(tick);

      const updateLevel = () => {
        if (!isSessionActive(session) || recorder.state !== 'recording' || !session.analyser) {
          session.meterRaf = null;
          return;
        }
        const data = new Uint8Array(session.analyser.frequencyBinCount);
        session.analyser.getByteFrequencyData(data);
        const average = data.reduce((sum, value) => sum + value, 0) / data.length;
        setAudioLevel(average / 255);
        session.meterRaf = requestAnimationFrame(updateLevel);
      };
      session.meterRaf = requestAnimationFrame(updateLevel);
    } catch (error) {
      if (activeSessionRef.current === session) {
        failSession(session, error);
      } else {
        releaseSessionResources(session);
      }
    }
  }, [cancelActiveSession, failSession, isSessionActive, maxSeconds, releaseSessionResources, requestStop]);

  const clearRecording = useCallback(() => {
    if (!mountedRef.current) return;
    setRecordedBlob(null);
    setRecordingTime(0);
    setAudioLevel(0);
  }, []);

  const resetRecording = useCallback(() => {
    cancelActiveSession();
    if (!mountedRef.current) return;
    setRecordedBlob(null);
    setRecordingTime(0);
    setAudioLevel(0);
    setStatus('idle');
  }, [cancelActiveSession]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelActiveSession();
    };
  }, [cancelActiveSession]);

  useEffect(() => {
    if (!recordedBlob) {
      setPreviewUrl(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(recordedBlob);
    setPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [recordedBlob]);

  return {
    isRecording: status === 'recording',
    isStarting: status === 'starting',
    isStopping: status === 'stopping',
    recordedBlob,
    previewUrl,
    recordingTime,
    audioLevel,
    startRecording,
    stopRecording,
    clearRecording,
    resetRecording,
  };
};
